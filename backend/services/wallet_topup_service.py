from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.models import User, WalletTopup


def create_wallet_topup_request(
    db: Session,
    tg_id: int,
    amount: Decimal,
) -> WalletTopup:
    user = db.scalar(
        select(User).where(User.user_tg_id == tg_id)
    )

    if not user:
        raise ValueError("User not found")

    topup = WalletTopup(
        user_id=user.user_id,
        amount=amount,
        requested_via="telegram_bot",
        requested_by_tg_user_id=tg_id,
        status=1,
        created_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
    )

    db.add(topup)
    db.commit()
    db.refresh(topup)

    return topup
