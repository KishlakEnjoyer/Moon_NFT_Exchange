from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from services.user_profile_service import get_user_profile_stats_by_tg_id

user_info_router = APIRouter(
    prefix="/user-info",
    tags=["user-info"],
)


@user_info_router.get("/tg/{tg_id}")
def get_user_info(tg_id: int, db: Session = Depends(get_db)):
    try:
        return get_user_profile_stats_by_tg_id(db, tg_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))