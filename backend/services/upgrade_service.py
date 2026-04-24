from __future__ import annotations

import asyncio
import os
from datetime import datetime
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.models import Collections, CurrentOwner, Listing, ListingStatuses, Present, Transaction, User
from services.blockchain.crypto_service import decrypt_private_key
from services.blockchain.token_service import (
    charge_tokens_to_platform,
    from_token_units,
    get_token_balance_raw,
    to_token_units,
)
from services.generation_image_service import generate_present_art
from services.notification_service import create_notification, manager, notification_to_dict
from utils.websocket_manager import ws_manager


UPGRADE_TYPE_ID = 2
CONFIRMED_STATUS_ID = 2
DEFAULT_UPGRADE_PERCENT = Decimal("25")


def get_upgrade_price(collection: Collections) -> Decimal:
    try:
        percent = Decimal(os.getenv("UPGRADE_PERCENT", str(DEFAULT_UPGRADE_PERCENT)))
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Invalid UPGRADE_PERCENT value") from exc

    if percent <= 0:
        raise HTTPException(status_code=500, detail="UPGRADE_PERCENT must be greater than 0")

    price = Decimal(str(collection.base_price)) * percent / Decimal(100)
    return price.quantize(Decimal("0.000001"))


def get_present_ready_for_upgrade(db: Session, user_id: int, present_id: int) -> tuple[Present, Collections]:
    present = db.scalar(select(Present).where(Present.present_id == present_id))
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    owner = db.scalar(
        select(CurrentOwner).where(
            CurrentOwner.present_id == present_id,
            CurrentOwner.owner_id == user_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    if present.is_burned:
        raise HTTPException(status_code=400, detail="Burned presents cannot be upgraded")

    if present.model_id or present.background_id or present.symbol_id:
        raise HTTPException(status_code=400, detail="Present is already upgraded")

    active_listing = db.scalar(
        select(Listing).where(
            Listing.present_id == present_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
        )
    )
    if active_listing:
        raise HTTPException(status_code=400, detail="Cannot upgrade a present that is on sale")

    collection = db.scalar(select(Collections).where(Collections.collection_id == present.collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    return present, collection


def pay_for_upgrade(user: User, price: Decimal) -> tuple[str, dict]:
    if not user.wallet_address:
        raise HTTPException(status_code=400, detail="User wallet not found")

    if not user.wallet_private_key_encrypted:
        raise HTTPException(status_code=400, detail="Wallet private key not found")

    amount_units = to_token_units(str(price))
    balance_raw = get_token_balance_raw(user.wallet_address)
    if balance_raw < amount_units:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {price}, have {from_token_units(balance_raw)}",
        )

    try:
        tx_hash, tx_receipt = charge_tokens_to_platform(
            user_address=user.wallet_address,
            user_private_key=decrypt_private_key(user.wallet_private_key_encrypted),
            amount_units=amount_units,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(exc)}") from exc

    if tx_receipt["status"] != 1:
        raise HTTPException(status_code=500, detail="Upgrade payment transaction failed")

    return tx_hash, tx_receipt


def send_upgrade_notification(db: Session, user_id: int, present_id: int) -> None:
    try:
        notification = create_notification(
            db=db,
            user_id=user_id,
            type_name="upgrade_completed",
            entity_type="present",
            entity_id=present_id,
        )
        asyncio.get_event_loop().create_task(
            manager.send_to_user(user_id, notification_to_dict(notification))
        )
    except Exception:
        pass


def send_balance_update(user_id: int, wallet_address: str) -> str:
    new_balance = from_token_units(get_token_balance_raw(wallet_address))

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.send_balance(user_id, new_balance))
        else:
            asyncio.run(ws_manager.send_balance(user_id, new_balance))
    except Exception:
        pass

    return new_balance


def upgrade_present(db: Session, user_id: int, present_id: int) -> dict:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    present, collection = get_present_ready_for_upgrade(db, user_id, present_id)
    price = get_upgrade_price(collection)

    art = generate_present_art(collection.collection_id, db)
    tx_hash, tx_receipt = pay_for_upgrade(user, price)

    try:
        present.model_id = art["model_id"]
        present.background_id = art["background_id"]
        present.symbol_id = art["symbol_id"]
        present.image_url = art["present_image_url"]
        present.generated_at = datetime.utcnow()

        db.add(Transaction(
            buyer_id=user_id,
            seller_id=user_id,
            present_id=present.present_id,
            type_id=UPGRADE_TYPE_ID,
            status_id=CONFIRMED_STATUS_ID,
            transaction_price=price,
            platform_fee=price,
            seller_received=Decimal("0.000000"),
            blockchain_tx_hash=tx_hash,
            block_number=int(tx_receipt["blockNumber"]),
            transaction_date=datetime.utcnow(),
        ))

        send_upgrade_notification(db, user_id, present.present_id)
        db.commit()
        db.refresh(present)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Blockchain TX OK but DB save failed: {str(exc)}") from exc

    return {
        "present_id": present.present_id,
        "image_url": present.image_url,
        "model_id": present.model_id,
        "model_name": art["model_name"],
        "background_id": present.background_id,
        "background_name": art["background_name"],
        "symbol_id": present.symbol_id,
        "symbol_name": art["symbol_name"],
        "tx_hash": tx_hash,
        "price": str(price),
        "new_balance": send_balance_update(user_id, user.wallet_address),
    }
