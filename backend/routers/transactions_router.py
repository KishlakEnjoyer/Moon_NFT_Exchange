from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from core.database import get_db
from core.models import TransactionHistory

transactions_router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionResponse(BaseModel):
    transaction_id: int
    transaction_price: str
    platform_fee: str
    seller_received: str
    transaction_date: str
    transaction_type: str
    transaction_status: str
    present_id: int
    token_id: str
    collection_name: str
    blockchain_network: str
    buyer_id: int
    buyer_username: str | None
    seller_id: int
    seller_username: str | None
    blockchain_tx_hash: str | None

    class Config:
        from_attributes = True


@transactions_router.get("/{user_id}", response_model=List[TransactionResponse])
def get_user_transactions(
    user_id: int,
    filter_type: str = Query(default="all", pattern="^(all|purchases|sales)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(TransactionHistory)

    if filter_type == "purchases":
        query = query.filter(TransactionHistory.buyer_id == user_id)
    elif filter_type == "sales":
        query = query.filter(TransactionHistory.seller_id == user_id)
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
            token_id=t.token_id,
            collection_name=t.collection_name,
            blockchain_network=t.blockchain_network,
            buyer_id=t.buyer_id,
            buyer_username=t.buyer_username,
            seller_id=t.seller_id,
            seller_username=t.seller_username,
            blockchain_tx_hash=t.blockchain_tx_hash,
        )
        for t in transactions
    ]
