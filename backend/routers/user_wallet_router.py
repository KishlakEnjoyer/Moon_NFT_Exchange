from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from services.blockchain.user_wallet_service import get_user_wallet_balances

user_wallet_router = APIRouter(
    prefix="/user-wallet",
    tags=["user-wallet"],
)


@user_wallet_router.get("/tg/{tg_id}/balance")
def get_user_balance(tg_id: int, db: Session = Depends(get_db)):
    try:
        return get_user_wallet_balances(db, tg_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
