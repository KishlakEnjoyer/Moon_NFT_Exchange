from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import os

from core.auth import get_current_user
from core.database import get_db
from core.models import Present, CurrentOwner, Collections, Listing, ListingStatuses, User, Models, Transaction
from services.blockchain.token_service import from_token_units, get_token_balance_raw, to_token_units, get_token_contract, approve_tokens, get_allowance
from services.blockchain.crypto_service import decrypt_private_key
from services.blockchain.client import get_web3
from web3 import Web3
from eth_account import Account
from services.upgrade_service import upgrade_present
from services.admin_platform_service import get_visible_profile_badges

presents_router = APIRouter(prefix="/presents", tags=["presents"])

MAX_PINNED_PRESENTS = 7

class TogglePinResponse(BaseModel):
    present_id: int
    is_pinned: int

@presents_router.post("/{present_id}/toggle-pin", response_model=TogglePinResponse)
def toggle_present_pin(
    present_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    present = db.scalar(select(Present).where(Present.present_id == present_id))
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    owner = db.scalar(
        select(CurrentOwner).where(
            CurrentOwner.present_id == present_id,
            CurrentOwner.owner_id == current_user.user_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    if present.is_burned:
        raise HTTPException(status_code=400, detail="Cannot pin burned present")

    if present.is_pinned == 1:
        present.is_pinned = 0
        present.pinned_at = None
    else:
        pinned_count = db.scalar(
            select(func.count())
            .select_from(Present)
            .join(CurrentOwner, CurrentOwner.present_id == Present.present_id)
            .where(
                CurrentOwner.owner_id == current_user.user_id,
                Present.is_pinned == 1,
                Present.is_burned == 0,
            )
        ) or 0

        if pinned_count >= MAX_PINNED_PRESENTS:
            raise HTTPException(status_code=400, detail="You can pin up to 7 gifts")

        present.is_pinned = 1
        present.pinned_at = datetime.utcnow()

    db.commit()
    db.refresh(present)

    return TogglePinResponse(
        present_id=present.present_id,
        is_pinned=present.is_pinned,
    )

def _resolve_current_user_id(requested_user_id: int | None, current_user: User) -> int:
    if requested_user_id is not None and requested_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot act as another user")

    return current_user.user_id


class PresentDetailResponse(BaseModel):
    present_id: int
    present_num: int
    image_url: str | None
    description: str | None
    collection_id: int
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
    owner_profile_pic_url: str | None
    owner_profile_badge_achievement_id: int | None = None
    owner_profile_badge_image_url: str | None = None
    owner_profile_badge_title: str | None = None
    is_on_sale: bool
    active_listing_id: int | None
    active_listing_price: str | None
    is_visible: int
    is_upgraded: bool
    has_models: bool
    original_sender_username: str | None
    original_sender_profile_pic_url: str | None
    original_sender_profile_badge_achievement_id: int | None = None
    original_sender_profile_badge_image_url: str | None = None
    original_sender_profile_badge_title: str | None = None


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
    profile_badges = get_visible_profile_badges(
        db,
        {
            user_id
            for user_id in [
                owner_record.owner_id if owner_record else None,
                present.original_sender_id,
            ]
            if user_id
        },
    )
    owner_badge = profile_badges.get(owner_record.owner_id) if owner_record else None
    original_sender_badge = profile_badges.get(present.original_sender_id) if present.original_sender_id else None

    active_listing = db.scalar(
        select(Listing)
        .join(User, Listing.seller_id == User.user_id)
        .where(
            Listing.present_id == present_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
            User.is_active == 1,
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
        image_url=present.image_url,
        description=present.description,
        collection_id=present.collection_id,
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
        owner_profile_pic_url=owner_user.profile_pic_url if owner_user and owner_user.is_active else None,
        owner_profile_badge_achievement_id=owner_badge["achievement_id"] if owner_badge else None,
        owner_profile_badge_image_url=owner_badge["image_url"] if owner_badge else None,
        owner_profile_badge_title=owner_badge["title"] if owner_badge else None,
        is_on_sale=active_listing is not None,
        active_listing_id=active_listing.listing_id if active_listing else None,
        active_listing_price=str(active_listing.price) if active_listing else None,
        is_visible=present.is_visible,
        is_upgraded=present.model_id is not None,
        has_models=has_models > 0,
        original_sender_username=original_sender.username if original_sender else None,
        original_sender_profile_pic_url=original_sender.profile_pic_url if original_sender and original_sender.is_active else None,
        original_sender_profile_badge_achievement_id=original_sender_badge["achievement_id"] if original_sender_badge else None,
        original_sender_profile_badge_image_url=original_sender_badge["image_url"] if original_sender_badge else None,
        original_sender_profile_badge_title=original_sender_badge["title"] if original_sender_badge else None,
    )


class ToggleVisibilityResponse(BaseModel):
    present_id: int
    is_visible: int


class BurnResponse(BaseModel):
    present_id: int
    refund_amount: str
    tx_hash: str


class UpgradeResponse(BaseModel):
    present_id: int
    image_url: str | None
    model_id: int | None
    model_name: str | None
    background_id: int | None
    background_name: str | None
    symbol_id: int | None
    symbol_name: str | None
    tx_hash: str
    price: str
    new_balance: str


class ApprovePlatformResponse(BaseModel):
    status: str
    tx_hash: str | None = None
    allowance: str
    platform_address: str


class AllowanceResponse(BaseModel):
    allowance: str
    platform_address: str


@presents_router.post("/approve-platform", response_model=ApprovePlatformResponse)
def approve_platform_spending(
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = _resolve_current_user_id(user_id, current_user)
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.wallet_address:
        raise HTTPException(status_code=400, detail="User wallet not found")
    
    if not user.wallet_private_key_encrypted:
        raise HTTPException(status_code=400, detail="Wallet private key not found")
    
    platform_private_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not platform_private_key:
        raise HTTPException(status_code=500, detail="Platform key not configured")
    
    platform_account = Account.from_key(platform_private_key)
    platform_address = platform_account.address
    
    private_key = decrypt_private_key(user.wallet_private_key_encrypted)
    w3 = get_web3()
    
    current_allowance = get_allowance(user.wallet_address, platform_address)
    max_uint256 = 2**256 - 1
    if current_allowance >= max_uint256:
        return ApprovePlatformResponse(
            status="already_approved",
            tx_hash=None,
            allowance=str(current_allowance),
            platform_address=platform_address
        )
    
    tx_hash = approve_tokens(
        spender_address=platform_address,
        amount=max_uint256,
        user_address=user.wallet_address,
        user_private_key=private_key
    )
    
    new_allowance = get_allowance(user.wallet_address, platform_address)
    
    return ApprovePlatformResponse(
        status="approved",
        tx_hash=tx_hash,
        allowance=str(new_allowance),
        platform_address=platform_address
    )


@presents_router.get("/allowance", response_model=AllowanceResponse)
def check_user_allowance(
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = _resolve_current_user_id(user_id, current_user)
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.wallet_address:
        raise HTTPException(status_code=400, detail="User wallet not found")
    
    platform_private_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not platform_private_key:
        raise HTTPException(status_code=500, detail="Platform key not configured")
    
    platform_account = Account.from_key(platform_private_key)
    platform_address = platform_account.address
    
    allowance = get_allowance(user.wallet_address, platform_address)
    
    return AllowanceResponse(
        allowance=str(allowance),
        platform_address=platform_address
    )


@presents_router.post("/{present_id}/burn", response_model=BurnResponse)
def burn_present(
    present_id: int,
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = _resolve_current_user_id(user_id, current_user)
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
            Listing.status.has(ListingStatuses.status_name == "active"),
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


@presents_router.post("/{present_id}/upgrade", response_model=UpgradeResponse)
def upgrade_present_endpoint(
    present_id: int,
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = _resolve_current_user_id(user_id, current_user)
    return upgrade_present(db=db, user_id=user_id, present_id=present_id)


@presents_router.post("/{present_id}/toggle-visibility", response_model=ToggleVisibilityResponse)
def toggle_present_visibility(
    present_id: int,
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = _resolve_current_user_id(user_id, current_user)
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
