from __future__ import annotations

import asyncio
import os
from datetime import datetime
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from web3 import Web3

from core.models import (
    CartItem,
    CurrentOwner,
    Listing,
    ListingStatuses,
    Present,
    Transaction,
    TransactionStatuses,
    TransactionTypes,
    User,
)
from services.blockchain.crypto_service import decrypt_private_key
from services.blockchain.token_service import (
    charge_tokens_to_platform,
    from_token_units,
    get_token_balance_raw,
    send_tokens_from_platform,
    to_token_units,
)
from services.notification_service import (
    NOTIFICATION_TYPE_LISTING_SOLD,
    NOTIFICATION_TYPE_PURCHASE,
    create_notification,
    manager,
    notification_to_dict,
)
from services.achievement_service import evaluate_user_achievements
from utils.websocket_manager import ws_manager


MONEY_QUANT = Decimal("0.000001")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT)


def get_marketplace_fee_percent() -> Decimal:
    try:
        percent = Decimal(os.getenv("MARKETPLACE_FEE_PERCENT", "5"))
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Invalid MARKETPLACE_FEE_PERCENT value") from exc

    if percent < 0 or percent > 100:
        raise HTTPException(status_code=500, detail="MARKETPLACE_FEE_PERCENT must be between 0 and 100")

    return percent


def get_or_create_listing_status_id(db: Session, status_name: str) -> int:
    status = db.scalar(select(ListingStatuses).where(ListingStatuses.status_name == status_name))
    if not status:
        status = ListingStatuses(status_name=status_name)
        db.add(status)
        db.flush()

    return int(status.status_id)


def get_or_create_transaction_type_id(db: Session, type_name: str) -> int:
    tx_type = db.scalar(select(TransactionTypes).where(TransactionTypes.type_name == type_name))
    if not tx_type:
        tx_type = TransactionTypes(type_name=type_name)
        db.add(tx_type)
        db.flush()

    return int(tx_type.type_id)


def get_or_create_transaction_status_id(db: Session, status_name: str) -> int:
    status = db.scalar(select(TransactionStatuses).where(TransactionStatuses.status_name == status_name))
    if not status:
        status = TransactionStatuses(status_name=status_name)
        db.add(status)
        db.flush()

    return int(status.status_id)


def get_listing_for_purchase(db: Session, listing_id: int, buyer_id: int) -> tuple[Listing, Present, CurrentOwner, User]:
    listing = db.scalar(
        select(Listing)
        .where(
            Listing.listing_id == listing_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
        )
        .with_for_update()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Active listing not found")

    if listing.seller_id == buyer_id:
        raise HTTPException(status_code=400, detail="Cannot buy your own listing")

    present = db.scalar(
        select(Present)
        .where(Present.present_id == listing.present_id)
        .with_for_update()
    )
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    if present.is_burned:
        raise HTTPException(status_code=400, detail="Burned presents cannot be bought")

    owner = db.scalar(
        select(CurrentOwner)
        .where(CurrentOwner.present_id == listing.present_id)
        .with_for_update()
    )
    if not owner or owner.owner_id != listing.seller_id:
        raise HTTPException(status_code=409, detail="Seller no longer owns this present")

    seller = db.scalar(select(User).where(User.user_id == listing.seller_id))
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    if not seller.is_active:
        raise HTTPException(status_code=409, detail="Seller account is blocked")

    return listing, present, owner, seller


def calculate_listing_amounts(price: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    price = money(Decimal(str(price)))
    fee = money(price * get_marketplace_fee_percent() / Decimal(100))
    seller_received = money(price - fee)
    return price, fee, seller_received


def validate_wallets(buyer: User, seller: User) -> None:
    if not buyer.wallet_address:
        raise HTTPException(status_code=400, detail="Buyer wallet not found")

    if not buyer.wallet_private_key_encrypted:
        raise HTTPException(status_code=400, detail="Buyer wallet private key not found")

    if not seller.wallet_address:
        raise HTTPException(status_code=400, detail="Seller wallet not found")

    try:
        Web3.to_checksum_address(buyer.wallet_address)
        Web3.to_checksum_address(seller.wallet_address)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid wallet address") from exc


def collect_buyer_payment(buyer: User, price: Decimal) -> tuple[str, dict]:
    amount_units = to_token_units(str(price))
    balance_raw = get_token_balance_raw(buyer.wallet_address)
    if balance_raw < amount_units:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {price}, have {from_token_units(balance_raw)}",
        )

    try:
        tx_hash, tx_receipt = charge_tokens_to_platform(
            user_address=buyer.wallet_address,
            user_private_key=decrypt_private_key(buyer.wallet_private_key_encrypted),
            amount_units=amount_units,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Blockchain payment error: {str(exc)}") from exc

    if tx_receipt["status"] != 1:
        raise HTTPException(status_code=500, detail="Listing payment transaction failed")

    return tx_hash, tx_receipt


def send_seller_payout(seller: User, seller_received: Decimal) -> tuple[str | None, dict | None]:
    if seller_received <= 0:
        return None, None

    try:
        tx_hash, tx_receipt = send_tokens_from_platform(
            to_address=seller.wallet_address,
            amount_units=to_token_units(str(seller_received)),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Seller payout error: {str(exc)}") from exc

    if tx_receipt["status"] != 1:
        raise HTTPException(status_code=500, detail="Seller payout transaction failed")

    return tx_hash, tx_receipt


def send_notification_safely(db: Session, user_id: int, type_name: str, present_id: int) -> None:
    try:
        notification = create_notification(
            db=db,
            user_id=user_id,
            type_name=type_name,
            entity_type="present",
            entity_id=present_id,
        )
        asyncio.get_event_loop().create_task(
            manager.send_to_user(user_id, notification_to_dict(notification))
        )
    except Exception:
        pass


def send_balance_update_safely(user_id: int, wallet_address: str | None) -> str | None:
    if not wallet_address:
        return None

    try:
        new_balance = from_token_units(get_token_balance_raw(wallet_address))
    except Exception:
        return None

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ws_manager.send_balance(user_id, new_balance))
        else:
            asyncio.run(ws_manager.send_balance(user_id, new_balance))
    except Exception:
        pass

    return new_balance


def buy_listing(db: Session, buyer: User, listing_id: int) -> dict:
    listing, present, owner, seller = get_listing_for_purchase(db, listing_id, buyer.user_id)
    validate_wallets(buyer, seller)

    price, platform_fee, seller_received = calculate_listing_amounts(listing.price)
    sold_status_id = get_or_create_listing_status_id(db, "sold")
    sale_type_id = get_or_create_transaction_type_id(db, "sale")
    confirmed_status_id = get_or_create_transaction_status_id(db, "confirmed")
    buyer_tx_hash, buyer_receipt = collect_buyer_payment(buyer, price)

    try:
        seller_tx_hash, _ = send_seller_payout(seller, seller_received)
    except HTTPException as exc:
        try:
            send_tokens_from_platform(
                to_address=buyer.wallet_address,
                amount_units=to_token_units(str(price)),
            )
        except Exception:
            pass
        raise exc

    try:
        owner.owner_id = buyer.user_id
        owner.owned_since = datetime.utcnow()
        listing.status_id = sold_status_id
        listing.blockchain_tx_hash = buyer_tx_hash

        db.query(CartItem).filter(CartItem.listing_id == listing.listing_id).delete()
        db.add(Transaction(
            buyer_id=buyer.user_id,
            seller_id=seller.user_id,
            present_id=present.present_id,
            type_id=sale_type_id,
            status_id=confirmed_status_id,
            transaction_price=price,
            platform_fee=platform_fee,
            seller_received=seller_received,
            blockchain_tx_hash=buyer_tx_hash,
            block_number=int(buyer_receipt["blockNumber"]),
            transaction_date=datetime.utcnow(),
        ))

        send_notification_safely(db, buyer.user_id, NOTIFICATION_TYPE_PURCHASE, present.present_id)
        send_notification_safely(db, seller.user_id, NOTIFICATION_TYPE_LISTING_SOLD, present.present_id)
        db.commit()
        try:
            evaluate_user_achievements(db, buyer.user_id, notify=True)
            evaluate_user_achievements(db, seller.user_id, notify=True)
            db.commit()
        except Exception:
            db.rollback()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Blockchain TX OK but DB save failed: {str(exc)}") from exc

    return {
        "listing_id": listing.listing_id,
        "present_id": present.present_id,
        "buyer_id": buyer.user_id,
        "seller_id": seller.user_id,
        "price": str(price),
        "platform_fee": str(platform_fee),
        "seller_received": str(seller_received),
        "buyer_tx_hash": buyer_tx_hash,
        "seller_tx_hash": seller_tx_hash,
        "new_balance": send_balance_update_safely(buyer.user_id, buyer.wallet_address),
        "seller_new_balance": send_balance_update_safely(seller.user_id, seller.wallet_address),
    }


def prevalidate_cart_purchase(db: Session, buyer: User, listing_ids: list[int]) -> tuple[list[int], Decimal]:
    unique_listing_ids = list(dict.fromkeys(listing_ids))
    if not unique_listing_ids:
        raise HTTPException(status_code=400, detail="Cart is empty")

    required_units = 0
    total = Decimal("0")

    for listing_id in unique_listing_ids:
        listing, _present, _owner, seller = get_listing_for_purchase(db, listing_id, buyer.user_id)
        validate_wallets(buyer, seller)
        price, _platform_fee, _seller_received = calculate_listing_amounts(listing.price)
        total += price
        required_units += to_token_units(str(price))

    balance_raw = get_token_balance_raw(buyer.wallet_address)
    if balance_raw < required_units:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {money(total)}, have {from_token_units(balance_raw)}",
        )

    return unique_listing_ids, money(total)


def buy_cart_listings(db: Session, buyer: User, listing_ids: list[int]) -> dict:
    unique_listing_ids, total = prevalidate_cart_purchase(db, buyer, listing_ids)
    purchases = [
        buy_listing(db=db, buyer=buyer, listing_id=listing_id)
        for listing_id in unique_listing_ids
    ]

    return {
        "purchases": purchases,
        "total": str(total),
        "new_balance": purchases[-1].get("new_balance") if purchases else None,
    }
