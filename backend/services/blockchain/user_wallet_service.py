from datetime import datetime
from sqlalchemy.orm import Session

from core.models import User
from services.blockchain.wallet_service import create_new_wallet
from services.blockchain.wallet_service import get_native_balance_eth
from services.blockchain.token_service import get_token_balance


def ensure_user_wallet(db: Session, user: User) -> User:
    if user.wallet_address:
        return user

    wallet = create_new_wallet()

    user.wallet_address = wallet["address"]
    user.wallet_private_key_encrypted = wallet["private_key_encrypted"]
    user.wallet_encryption_version = 1
    user.wallet_created_at = datetime.utcnow()

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def get_user_wallet_balances(db: Session, tg_id: int) -> dict:
    user = db.query(User).filter(User.user_tg_id == tg_id).first()

    if not user:
        raise ValueError(f"User with tg_id={tg_id} not found")

    if not user.wallet_address:
        raise ValueError(f"User with tg_id={tg_id} has no wallet")

    return {
        "user_id": user.user_id,
        "user_tg_id": user.user_tg_id,
        "wallet_address": user.wallet_address,
        "native_balance": get_native_balance_eth(user.wallet_address),
        "token_balance": get_token_balance(user.wallet_address),
    }