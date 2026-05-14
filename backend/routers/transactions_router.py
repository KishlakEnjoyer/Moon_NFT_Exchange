from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from core.auth import get_current_user, get_optional_current_user_any
from core.database import get_db
from core.models import TransactionHistory, User
from core.request_models import TransactionResponse
from services.admin_platform_service import get_visible_profile_badges

transactions_router = APIRouter(prefix="/transactions", tags=["transactions"])


class TopSpenderResponse(BaseModel):
    user_id: int
    rank: int
    username: str | None
    profile_pic_url: str | None
    profile_badge_achievement_id: int | None = None
    profile_badge_image_url: str | None = None
    profile_badge_title: str | None = None
    spent_ton: str
    transactions_count: int


def _get_ranked_spenders(db: Session):
    spender_id = case(
        (TransactionHistory.buyer_id.isnot(None), TransactionHistory.buyer_id),
        (TransactionHistory.transaction_type == "purchase", TransactionHistory.seller_id),
        else_=None,
    ).label("spender_id")

    totals = (
        db.query(
            spender_id,
            func.coalesce(func.sum(TransactionHistory.transaction_price), 0).label("spent_ton"),
            func.count(TransactionHistory.transaction_id).label("transactions_count"),
        )
        .filter(TransactionHistory.transaction_status == "confirmed")
        .filter(spender_id.isnot(None))
        .group_by(spender_id)
        .subquery()
    )

    spent_ton = func.coalesce(totals.c.spent_ton, 0)
    transactions_count = func.coalesce(totals.c.transactions_count, 0)

    return (
        db.query(
            User.user_id.label("user_id"),
            User.username.label("username"),
            User.profile_pic_url.label("profile_pic_url"),
            spent_ton.label("spent_ton"),
            transactions_count.label("transactions_count"),
            func.row_number().over(
                order_by=[
                    spent_ton.desc(),
                    transactions_count.desc(),
                    User.user_id.asc(),
                ]
            ).label("rank_position"),
        )
        .outerjoin(totals, totals.c.spender_id == User.user_id)
        .filter(User.is_active == 1)
        .subquery()
    )


def _ranked_spenders_query(db: Session, ranked_spenders):
    return db.query(
        ranked_spenders.c.user_id,
        ranked_spenders.c.rank_position,
        ranked_spenders.c.username,
        ranked_spenders.c.profile_pic_url,
        ranked_spenders.c.spent_ton,
        ranked_spenders.c.transactions_count,
    )


@transactions_router.get("/top-spenders", response_model=List[TopSpenderResponse])
def get_top_spenders(
    limit: int = Query(default=10, ge=1, le=10),
    current_user: User | None = Depends(get_optional_current_user_any),
    db: Session = Depends(get_db),
):
    ranked_spenders = _get_ranked_spenders(db)

    rows = (
        _ranked_spenders_query(db, ranked_spenders)
        .filter(ranked_spenders.c.transactions_count > 0)
        .order_by(ranked_spenders.c.rank_position.asc())
        .limit(limit)
        .all()
    )

    if current_user and current_user.user_id not in {row.user_id for row in rows}:
        current_user_row = (
            _ranked_spenders_query(db, ranked_spenders)
            .filter(ranked_spenders.c.user_id == current_user.user_id)
            .first()
        )
        if current_user_row:
            rows.append(current_user_row)

    profile_badges = get_visible_profile_badges(db, {row.user_id for row in rows})

    return [
        TopSpenderResponse(
            user_id=row.user_id,
            rank=int(row.rank_position),
            username=row.username,
            profile_pic_url=row.profile_pic_url,
            profile_badge_achievement_id=profile_badges.get(row.user_id, {}).get("achievement_id"),
            profile_badge_image_url=profile_badges.get(row.user_id, {}).get("image_url"),
            profile_badge_title=profile_badges.get(row.user_id, {}).get("title"),
            spent_ton=str(row.spent_ton or 0),
            transactions_count=int(row.transactions_count or 0),
        )
        for row in rows
    ]


@transactions_router.get("/{user_id}", response_model=List[TransactionResponse])
def get_user_transactions(
    user_id: int,
    filter_type: str = Query(default="all", pattern="^(all|purchases|sales)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's transactions")

    query = db.query(TransactionHistory)
    is_collection_purchase = TransactionHistory.transaction_type == "purchase"

    if filter_type == "purchases":
        query = query.filter(
            ((is_collection_purchase) & (TransactionHistory.seller_id == user_id)) |
            ((TransactionHistory.transaction_type != "purchase") & (TransactionHistory.buyer_id == user_id))
        )
    elif filter_type == "sales":
        query = query.filter(
            (TransactionHistory.transaction_type != "purchase") &
            (TransactionHistory.seller_id == user_id)
        )
    else:
        query = query.filter(
            (TransactionHistory.buyer_id == user_id) |
            (TransactionHistory.seller_id == user_id)
        )

    transactions = (
        query
        .order_by(TransactionHistory.transaction_date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    user_ids = {t.buyer_id for t in transactions} | {t.seller_id for t in transactions}
    profile_pic_by_user_id = {}
    profile_badge_by_user_id = {}

    if user_ids:
        profile_pic_by_user_id = {
            user.user_id: user.profile_pic_url
            for user in (
                db.query(User.user_id, User.profile_pic_url)
                .filter(User.user_id.in_(user_ids))
                .all()
            )
        }
        profile_badge_by_user_id = get_visible_profile_badges(db, user_ids)

    return [
        TransactionResponse(
            transaction_id=t.transaction_id,
            transaction_price=str(t.transaction_price),
            platform_fee=str(t.platform_fee),
            seller_received=str(t.seller_received),
            transaction_date=t.transaction_date.isoformat(),
            transaction_type=t.transaction_type,
            transaction_status=t.transaction_status,
            present_id=t.present_id,
            collection_name=t.collection_name,
            buyer_id=t.buyer_id,
            buyer_username=t.buyer_username,
            buyer_profile_pic_url=profile_pic_by_user_id.get(t.buyer_id),
            buyer_profile_badge_achievement_id=profile_badge_by_user_id.get(t.buyer_id, {}).get("achievement_id"),
            buyer_profile_badge_image_url=profile_badge_by_user_id.get(t.buyer_id, {}).get("image_url"),
            buyer_profile_badge_title=profile_badge_by_user_id.get(t.buyer_id, {}).get("title"),
            seller_id=t.seller_id,
            seller_username=t.seller_username,
            seller_profile_pic_url=profile_pic_by_user_id.get(t.seller_id),
            seller_profile_badge_achievement_id=profile_badge_by_user_id.get(t.seller_id, {}).get("achievement_id"),
            seller_profile_badge_image_url=profile_badge_by_user_id.get(t.seller_id, {}).get("image_url"),
            seller_profile_badge_title=profile_badge_by_user_id.get(t.seller_id, {}).get("title"),
            blockchain_tx_hash=t.blockchain_tx_hash,
        )
        for t in transactions
    ]
