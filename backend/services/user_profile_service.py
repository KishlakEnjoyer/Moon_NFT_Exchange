from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from core.models import CurrentOwner, Listing, Transaction, User, Present, Collections, Models, Backgrounds, Symbols
from services.blockchain.token_service import get_token_balance
from services.blockchain.wallet_service import get_native_balance_eth


def get_user_profile_stats_by_tg_id(db: Session, tg_id: int) -> dict:
    user = db.scalar(
        select(User).where(User.user_tg_id == tg_id)
    )

    if not user:
        raise ValueError(f"User with tg_id={tg_id} not found")

    gifts_count = db.scalar(
        select(func.count())
        .select_from(CurrentOwner)
        .where(CurrentOwner.owner_id == user.user_id)
    ) or 0

    active_listings_count = db.scalar(
        select(func.count())
        .select_from(Listing)
        .where(
            Listing.seller_id == user.user_id,
            Listing.status_id == 1,
        )
    ) or 0

    sales_count = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.seller_id == user.user_id,
            Transaction.status_id == 2,
            Transaction.type_id == 2,
        )
    ) or 0

    native_balance = "0"
    token_balance = "0"

    if user.wallet_address:
        native_balance = get_native_balance_eth(user.wallet_address)
        token_balance = get_token_balance(user.wallet_address)

    return {
        "user_id": user.user_id,
        "user_tg_id": user.user_tg_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "wallet_address": user.wallet_address,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "gifts_count": int(gifts_count),
        "active_listings_count": int(active_listings_count),
        "sales_count": int(sales_count),
        "native_balance": native_balance,
        "token_balance": token_balance,
    }


def get_user_profile_info_by_username(db: Session, username: str) -> dict:
    user = db.scalar(
        select(User).where(User.username == username)
    )

    if not user:
        raise ValueError(f"User with username={username} not found")

    token_balance = "0"
    if user.wallet_address:
        token_balance = get_token_balance(user.wallet_address)

    presents = db.scalars(
        select(Present)
        .join(CurrentOwner, CurrentOwner.present_id == Present.present_id)
        .where(CurrentOwner.owner_id == user.user_id, Present.is_burned == 0)
        .options(
            joinedload(Present.collection),
            joinedload(Present.model),
            joinedload(Present.background),
            joinedload(Present.symbol),
        )
    ).all()

    return {
        "user_id": user.user_id,
        "user_tg_id": user.user_tg_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "token_balance": token_balance,
        "presents": [
            {
                "present_id": p.present_id,
                "present_num": p.present_num,
                "token_id": p.token_id,
                "image_url": p.image_url,
                "metadata_uri": p.metadata_uri,
                "generated_at": p.generated_at,
                "collection": {
                    "collection_id": p.collection.collection_id,
                    "collection_name": p.collection.collection_name,
                    "collection_image_url": p.collection.collection_image_url,
                } if p.collection else None,
                "model": {
                    "model_id": p.model.model_id,
                    "model_name": p.model.model_name,
                    "model_image_url": p.model.model_image_url,
                } if p.model else None,
                "background": {
                    "background_id": p.background.background_id,
                    "background_name": p.background.background_name,
                    "background_image_url": p.background.background_image_url,
                } if p.background else None,
                "symbol": {
                    "symbol_id": p.symbol.symbol_id,
                    "symbol_name": p.symbol.symbol_name,
                    "symbol_image_url": p.symbol.symbol_image_url,
                } if p.symbol else None,
            }
            for p in presents
        ],
    }