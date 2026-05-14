from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from sqlalchemy import and_, or_

from core.auth import get_current_user, get_optional_current_user_any
from core.database import get_db
from core.models import User
from core.request_models import UpdateProfileRequest, UpdateProfileResponse
from services.user_profile_service import (
    get_user_profile_info_by_username,
    get_user_profile_stats_by_tg_id,
    get_user_profile_stats_by_vk_id,
    update_user_profile,
)
from services.admin_platform_service import get_visible_profile_badges


user_info_router = APIRouter(
    prefix="/user-info",
    tags=["user-info"],
)


@user_info_router.get("/search")
def search_users(
    q: str = Query(default="", min_length=0, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    include_user_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    search = q.strip().lower()
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                and_(User.tg_visibility == 1, User.tg_username.ilike(pattern)),
                and_(User.vk_visibility == 1, User.vk_username.ilike(pattern)),
            )
        )
    users = query.limit(limit).all()

    if include_user_id is not None and all(u.user_id != include_user_id for u in users):
        included_user = db.query(User).filter(User.user_id == include_user_id).first()
        if included_user:
            username = (included_user.username or "").lower()
            tg_username = (included_user.tg_username or "").lower() if included_user.tg_visibility == 1 else ""
            vk_username = (included_user.vk_username or "").lower() if included_user.vk_visibility == 1 else ""
            if not search or search in username or search in tg_username or search in vk_username:
                users = [included_user, *users[: max(0, limit - 1)]]

    if include_user_id is not None:
        users = sorted(users, key=lambda u: 0 if u.user_id == include_user_id else 1)

    profile_badges = get_visible_profile_badges(db, {u.user_id for u in users})
    return [
        {
            "user_id": u.user_id,
            "username": u.username,
            "profile_pic_url": u.profile_pic_url if u.is_active else None,
            "is_active": u.is_active,
            "profile_badge_achievement_id": profile_badges.get(u.user_id, {}).get("achievement_id"),
            "profile_badge_image_url": profile_badges.get(u.user_id, {}).get("image_url"),
            "profile_badge_title": profile_badges.get(u.user_id, {}).get("title"),
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


@user_info_router.get("/vk/{vk_id}")
def get_user_info_by_vk_id(vk_id: int, db: Session = Depends(get_db)):
    try:
        return get_user_profile_stats_by_vk_id(db, vk_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@user_info_router.get("/web/{username}")
def get_user_info_by_username(
    username: str,
    current_user: User | None = Depends(get_optional_current_user_any),
    db: Session = Depends(get_db),
):
    try:
        return get_user_profile_info_by_username(
            db,
            username,
            viewer_user_id=current_user.user_id if current_user else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        print("FULL TRACEBACK:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@user_info_router.patch("/{user_id}", response_model=UpdateProfileResponse)
def update_user_profile_endpoint(
    user_id: int,
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UpdateProfileResponse:
    try:
        if user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Cannot update another user's profile")

        print("PATCH PROFILE CALLED", flush=True)
        print("IMAGE START:", repr((payload.profile_pic_data_url or "")[:150]), flush=True)

        return update_user_profile(
            db=db,
            user_id=current_user.user_id,
            username=payload.username,
            about_me=payload.about_me,
            tg_visibility=payload.tg_visibility,
            vk_visibility=payload.vk_visibility,
            profile_pic_data_url=payload.profile_pic_data_url,
            remove_profile_pic=payload.remove_profile_pic,
        )

    except HTTPException as e:
        print("PROFILE UPDATE HTTP EXCEPTION:", e.status_code, repr(e.detail), flush=True)
        raise

    except ValueError as e:
        print("PROFILE UPDATE VALUE ERROR:", repr(str(e)), flush=True)

        detail = str(e)
        if detail == "User not found":
            raise HTTPException(status_code=404, detail=detail)
        if detail == "Username is already taken":
            raise HTTPException(status_code=409, detail=detail)

        raise HTTPException(status_code=400, detail=detail)

    except Exception as e:
        import traceback
        print("PROFILE UPDATE UNEXPECTED ERROR:", repr(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
