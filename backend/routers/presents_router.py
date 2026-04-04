from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import os

from core.database import get_db
from core.models import Present, CurrentOwner, Collections, Listing, User, Models, Transaction
from services.blockchain.token_service import from_token_units, get_token_balance_raw, to_token_units, get_token_contract
from services.blockchain.crypto_service import decrypt_private_key
from services.blockchain.client import get_web3
from web3 import Web3
from eth_account import Account

presents_router = APIRouter(prefix="/presents", tags=["presents"])


class PresentDetailResponse(BaseModel):
    present_id: int
    present_num: int
    token_id: str
    image_url: str | None
    collection_name: str
    collection_image_url: str | None
    base_price: str
    total_supply: int
    model_name: str | None
    model_image_url: str | None
    background_name: str | None
    background_image_url: str | None
    symbol_name: str | None
    symbol_image_url: str | None
    owner_username: str | None
    owner_id: int | None
    is_on_sale: bool
    is_visible: int
    is_upgraded: bool
    has_models: bool
    original_sender_username: str | None


@presents_router.get("/{present_id}/detail", response_model=PresentDetailResponse)
def get_present_detail(present_id: int, db: Session = Depends(get_db)):
    present = db.scalar(
        select(Present)
        .where(Present.present_id == present_id)
        .options(
            joinedload(Present.model),
            joinedload(Present.background),
            joinedload(Present.symbol),
        )
    )
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    collection = db.scalar(
        select(Collections).where(Collections.collection_id == present.collection_id)
    )

    total_supply = db.scalar(
        select(func.count()).select_from(Present).where(
            Present.collection_id == present.collection_id
        )
    ) or 0

    owner_record = db.scalar(
        select(CurrentOwner).where(CurrentOwner.present_id == present_id)
    )
    owner_user = None
    if owner_record:
        owner_user = db.scalar(select(User).where(User.user_id == owner_record.owner_id))

    original_sender = None
    if present.original_sender_id:
        original_sender = db.scalar(select(User).where(User.user_id == present.original_sender_id))

    active_listing = db.scalar(
        select(Listing).where(
            Listing.present_id == present_id,
            Listing.status_id == 1,
        )
    )

    model_name = None
    model_image_url = None
    if present.model:
        model_name = present.model.model_name
        model_image_url = present.model.model_image_url

    background_name = None
    background_image_url = None
    if present.background:
        background_name = present.background.background_name
        background_image_url = present.background.background_image_url

    symbol_name = None
    symbol_image_url = None
    if present.symbol:
        symbol_name = present.symbol.symbol_name
        symbol_image_url = present.symbol.symbol_image_url

    has_models = db.scalar(
        select(func.count()).select_from(Models).where(
            Models.collection_id == present.collection_id
        )
    ) or 0

    return PresentDetailResponse(
        present_id=present.present_id,
        present_num=present.present_num,
        token_id=present.token_id,
        image_url=present.image_url,
        collection_name=collection.collection_name if collection else "Unknown",
        collection_image_url=collection.collection_image_url if collection else None,
        base_price=str(collection.base_price) if collection else "0",
        total_supply=collection.collection_limit if collection else 0,
        model_name=model_name,
        model_image_url=model_image_url,
        background_name=background_name,
        background_image_url=background_image_url,
        symbol_name=symbol_name,
        symbol_image_url=symbol_image_url,
        owner_username=owner_user.username if owner_user else None,
        owner_id=owner_record.owner_id if owner_record else None,
    is_on_sale=active_listing is not None,
        is_visible=present.is_visible,
        is_upgraded=present.model_id is not None,
        has_models=has_models > 0,
        original_sender_username=original_sender.username if original_sender else None,
    )


class ToggleVisibilityResponse(BaseModel):
    present_id: int
    is_visible: int


class BurnResponse(BaseModel):
    present_id: int
    refund_amount: str
    tx_hash: str


@presents_router.post("/{present_id}/burn", response_model=BurnResponse)
def burn_present(present_id: int, user_id: int, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=400, detail="Present already burned")

    active_listing = db.scalar(
        select(Listing).where(
            Listing.present_id == present_id,
            Listing.status_id == 1,
        )
    )
    if active_listing:
        raise HTTPException(status_code=400, detail="Cannot burn a present that is on sale")

    collection = db.scalar(
        select(Collections).where(Collections.collection_id == present.collection_id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    burn_refund_percent = int(os.getenv("BURN_REFUND_PERCENT", "75"))
    base_price = Decimal(str(collection.base_price))
    refund_amount = base_price * Decimal(burn_refund_percent) / Decimal(100)

    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user or not user.wallet_address:
        raise HTTPException(status_code=400, detail="User wallet not found")

    if not user.wallet_private_key_encrypted:
        raise HTTPException(status_code=400, detail="Wallet private key not found")

    private_key = decrypt_private_key(user.wallet_private_key_encrypted)
    platform_private_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not platform_private_key:
        raise HTTPException(status_code=500, detail="Platform key not configured")

    w3 = get_web3()
    contract = get_token_contract()
    platform_account = Account.from_key(platform_private_key)
    platform_checksum = platform_account.address

    nonce = w3.eth.get_transaction_count(platform_checksum)
    gas_price = w3.eth.gas_price

    tx = contract.functions.transfer(user.wallet_address, to_token_units(str(refund_amount))).build_transaction({
        "from": platform_checksum,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
    })
    tx["gas"] = 100000

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=platform_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)

    if receipt["status"] != 1:
        raise HTTPException(status_code=500, detail="Refund transaction failed")

    present.is_burned = 1
    db.commit()

    return BurnResponse(
        present_id=present.present_id,
        refund_amount=str(refund_amount),
        tx_hash=tx_hash.hex(),
    )


@presents_router.post("/{present_id}/toggle-visibility", response_model=ToggleVisibilityResponse)
def toggle_present_visibility(present_id: int, user_id: int, db: Session = Depends(get_db)):
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

    present.is_visible = 0 if present.is_visible == 1 else 1
    db.commit()
    db.refresh(present)

    return ToggleVisibilityResponse(
        present_id=present.present_id,
        is_visible=present.is_visible,
    )

