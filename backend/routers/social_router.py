from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.achievement_service import evaluate_user_achievements
from core.auth import get_current_user
from core.database import get_db
from core.models import Achievement, User, UserAchievement, UserFollow
from services.admin_platform_service import (
    get_profile_badge_achievement_id,
    get_visible_profile_badges,
    set_profile_badge_achievement_id,
)


social_router = APIRouter(prefix="/social", tags=["social"])


class FollowResponse(BaseModel):
    following: bool
    followers_count: int
    following_count: int


class AchievementVisibilityRequest(BaseModel):
    is_visible: int = Field(ge=0, le=1)


class AchievementVisibilityResponse(BaseModel):
    achievement_id: int
    is_visible: int


class ProfileBadgeRequest(BaseModel):
    achievement_id: int | None = None


class ProfileBadgeResponse(BaseModel):
    profile_badge_achievement_id: int | None


class SocialUserResponse(BaseModel):
    user_id: int
    username: str | None
    profile_pic_url: str | None
    profile_badge_achievement_id: int | None
    profile_badge_image_url: str | None
    profile_badge_title: str | None
    is_following: bool


def _follow_counts(db: Session, user_id: int) -> tuple[int, int]:
    followers_count = int(
        db.scalar(
            select(func.count()).select_from(UserFollow).where(UserFollow.following_id == user_id)
        )
        or 0
    )
    following_count = int(
        db.scalar(
            select(func.count()).select_from(UserFollow).where(UserFollow.follower_id == user_id)
        )
        or 0
    )
    return followers_count, following_count


def _serialize_social_user(db: Session, user: User, viewer_id: int) -> SocialUserResponse:
    is_following = False
    if viewer_id != user.user_id:
        is_following = db.get(
            UserFollow,
            {"follower_id": viewer_id, "following_id": user.user_id},
        ) is not None

    profile_badge = get_visible_profile_badges(db, {user.user_id}).get(user.user_id)

    return SocialUserResponse(
        user_id=user.user_id,
        username=user.username,
        profile_pic_url=user.profile_pic_url if user.is_active else None,
        profile_badge_achievement_id=profile_badge["achievement_id"] if profile_badge else None,
        profile_badge_image_url=profile_badge["image_url"] if profile_badge else None,
        profile_badge_title=profile_badge["title"] if profile_badge else None,
        is_following=is_following,
    )


@social_router.post("/users/{user_id}/follow", response_model=FollowResponse)
def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.get(User, user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.get(
        UserFollow,
        {"follower_id": current_user.user_id, "following_id": user_id},
    )

    if not existing:
        db.add(UserFollow(
            follower_id=current_user.user_id,
            following_id=user_id,
        ))

        try:
            db.flush()

            evaluate_user_achievements(db, user_id)

            db.commit()
        except IntegrityError:
            db.rollback()
        except Exception:
            db.rollback()
            raise

    followers_count, following_count = _follow_counts(db, user_id)

    return FollowResponse(
        following=True,
        followers_count=followers_count,
        following_count=following_count,
    )


@social_router.delete("/users/{user_id}/follow", response_model=FollowResponse)
def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    follow = db.get(UserFollow, {"follower_id": current_user.user_id, "following_id": user_id})
    if follow:
        db.delete(follow)
        db.commit()

    followers_count, following_count = _follow_counts(db, user_id)
    return FollowResponse(
        following=False,
        followers_count=followers_count,
        following_count=following_count,
    )


@social_router.get("/users/{user_id}/followers", response_model=list[SocialUserResponse])
def list_followers(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    target = db.get(User, user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    users = db.scalars(
        select(User)
        .join(UserFollow, UserFollow.follower_id == User.user_id)
        .where(UserFollow.following_id == user_id, User.is_active == 1)
        .order_by(UserFollow.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_serialize_social_user(db, user, current_user.user_id) for user in users]


@social_router.get("/users/{user_id}/following", response_model=list[SocialUserResponse])
def list_following(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    target = db.get(User, user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    users = db.scalars(
        select(User)
        .join(UserFollow, UserFollow.following_id == User.user_id)
        .where(UserFollow.follower_id == user_id, User.is_active == 1)
        .order_by(UserFollow.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_serialize_social_user(db, user, current_user.user_id) for user in users]


@social_router.patch("/achievements/{achievement_id}/visibility", response_model=AchievementVisibilityResponse)
def set_achievement_visibility(
    achievement_id: int,
    payload: AchievementVisibilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    user_achievement = db.get(
        UserAchievement,
        {"user_id": current_user.user_id, "achievement_id": achievement_id},
    )
    if not user_achievement:
        raise HTTPException(status_code=404, detail="Achievement is not awarded to this user")

    user_achievement.is_visible = payload.is_visible
    if payload.is_visible == 0 and get_profile_badge_achievement_id(db, current_user.user_id) == achievement_id:
        set_profile_badge_achievement_id(db, current_user.user_id, None)
    db.commit()
    return AchievementVisibilityResponse(
        achievement_id=achievement_id,
        is_visible=payload.is_visible,
    )


@social_router.patch("/profile-badge", response_model=ProfileBadgeResponse)
def set_profile_badge(
    payload: ProfileBadgeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    if payload.achievement_id is None:
        set_profile_badge_achievement_id(db, current_user.user_id, None)
        db.commit()
        return ProfileBadgeResponse(profile_badge_achievement_id=None)

    user_achievement = db.get(
        UserAchievement,
        {"user_id": current_user.user_id, "achievement_id": payload.achievement_id},
    )
    achievement = db.get(Achievement, payload.achievement_id)
    if not user_achievement or not achievement or not achievement.is_active:
        raise HTTPException(status_code=404, detail="Achievement is not awarded to this user")
    if user_achievement.is_visible != 1:
        raise HTTPException(status_code=400, detail="Only visible achievements can be used as a profile badge")

    set_profile_badge_achievement_id(db, current_user.user_id, payload.achievement_id)
    db.commit()
    return ProfileBadgeResponse(profile_badge_achievement_id=payload.achievement_id)
