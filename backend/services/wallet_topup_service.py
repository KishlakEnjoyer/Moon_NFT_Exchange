from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.models import User, WalletTopup


def create_wallet_topup_request(
    db: Session,
    wallet_adr: str,
    amount: Decimal,
) -> WalletTopup:
    user = db.scalar(
        select(User).where(User.wallet_address == wallet_adr)
    )

    if not user:
        raise ValueError("User not found")

    topup = WalletTopup(
        wallet_address=wallet_adr,
        amount=amount,
        requested_via="telegram_bot",
        status=1,
        created_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
    )

    db.add(topup)
    db.commit()
    db.refresh(topup)

    return topup
