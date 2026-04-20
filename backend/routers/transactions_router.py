from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from core.auth import get_current_user
from core.database import get_db
from core.models import TransactionHistory, User
from core.request_models import TransactionResponse

transactions_router = APIRouter(prefix="/transactions", tags=["transactions"])


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

    if user_ids:
        profile_pic_by_user_id = {
            user.user_id: user.profile_pic_url
            for user in (
                db.query(User.user_id, User.profile_pic_url)
                .filter(User.user_id.in_(user_ids))
                .all()
            )
        }

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
            seller_id=t.seller_id,
            seller_username=t.seller_username,
            seller_profile_pic_url=profile_pic_by_user_id.get(t.seller_id),
            blockchain_tx_hash=t.blockchain_tx_hash,
        )
        for t in transactions
    ]
