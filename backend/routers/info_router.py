from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.request_models import UpdateProfileRequest, UpdateProfileResponse
from services.user_profile_service import (
    get_user_profile_info_by_username,
    get_user_profile_stats_by_tg_id,
    update_user_profile,
)


user_info_router = APIRouter(
    prefix="/user-info",
    tags=["user-info"],
)


@user_info_router.get("/search")
def search_users(
    q: str = Query(default="", min_length=0, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.is_active == 1)
    if q.strip():
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(User.username.ilike(pattern))
    users = query.limit(limit).all()
    return [
        {
            "user_id": u.user_id,
            "username": u.username,
            "profile_pic_url": u.profile_pic_url,
        }
        for u in users
    ]


@user_info_router.get("/tg/{tg_id}")
def get_user_info_by_tg_id(tg_id: int, db: Session = Depends(get_db)):
    try:
        return get_user_profile_stats_by_tg_id(db, tg_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@user_info_router.get("/web/{username}")
def get_user_info_by_username(username: str, db: Session = Depends(get_db)):
    try:
        return get_user_profile_info_by_username(db, username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@user_info_router.patch("/{user_id}", response_model=UpdateProfileResponse)
def update_user_profile_endpoint(
    user_id: int,
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
) -> UpdateProfileResponse:
    """
    Update editable user profile fields and optionally replace the profile picture.
    Accepts a username, about text, Telegram visibility, and an optional image data URL.
    """
    try:
        return update_user_profile(
            db=db,
            user_id=user_id,
            username=payload.username,
            about_me=payload.about_me,
            tg_visibility=payload.tg_visibility,
            profile_pic_data_url=payload.profile_pic_data_url,
        )
    except ValueError as e:
        detail = str(e)
        if detail == "User not found":
            raise HTTPException(status_code=404, detail=detail)
        if detail == "Username is already taken":
            raise HTTPException(status_code=409, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
