from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.models import CurrentOwner, Listing, Transaction, User
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