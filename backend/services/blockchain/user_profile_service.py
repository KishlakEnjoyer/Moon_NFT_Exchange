from sqlalchemy import text
from sqlalchemy.orm import Session

from core.models import User
from services.blockchain.wallet_service import get_native_balance_eth
from services.blockchain.token_service import get_token_balance


def get_user_profile_stats_by_tg_id(db: Session, tg_id: int) -> dict:
    user = db.query(User).filter(User.user_tg_id == tg_id).first()

    if not user:
        raise ValueError(f"User with tg_id={tg_id} not found")

    gifts_count = db.execute(
        text("""
            SELECT COUNT(*) AS cnt
            FROM current_owners co
            WHERE co.owner_id = :user_id
        """),
        {"user_id": user.user_id},
    ).scalar() or 0

    active_listings_count = db.execute(
        text("""
            SELECT COUNT(*) AS cnt
            FROM listings l
            WHERE l.seller_id = :user_id
              AND l.status_id = 1
        """),
        {"user_id": user.user_id},
    ).scalar() or 0

    sales_count = db.execute(
        text("""
            SELECT COUNT(*) AS cnt
            FROM transactions t
            WHERE t.seller_id = :user_id
              AND t.status_id = 2
              AND t.type_id = 2
        """),
        {"user_id": user.user_id},
    ).scalar() or 0

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
        "gifts_count": int(gifts_count),
        "active_listings_count": int(active_listings_count),
        "sales_count": int(sales_count),
        "native_balance": native_balance,
        "token_balance": token_balance,
    }