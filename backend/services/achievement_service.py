from __future__ import annotations

import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from core.models import (
    Achievement,
    Collections,
    CurrentOwner,
    Notification,
    Present,
    TransactionHistory,
    User,
    UserAchievement,
)
from services.admin_platform_service import ensure_admin_platform_schema, save_image_data_url
from services.notification_service import create_notification, manager, notification_to_dict
from utils.tg_bot import send_tg_message_sync


NOTIFICATION_TYPE_ACHIEVEMENT = "achievement_unlocked"

ACHIEVEMENT_RULES = {
    "manual": "Manual only",
    "gifts_owned_at_least": "Own at least N gifts",
    "purchases_count_at_least": "Make at least N purchases",
    "sales_count_at_least": "Make at least N sales",
    "unique_collections_at_least": "Own gifts from at least N collections",
    "complete_collection": "Own every minted gift in at least one collection",
    "early_collector": "Be among first N registered users",
    "top_spender_rank": "Be in top N spenders",
}


def achievement_to_dict(
    db: Session,
    achievement: Achievement,
    awarded_count: int | None = None,
    total_users: int | None = None,
) -> dict[str, Any]:
    ensure_admin_platform_schema()
    if awarded_count is None:
        awarded_count = int(
            db.scalar(
                select(func.count()).select_from(UserAchievement).where(
                    UserAchievement.achievement_id == achievement.achievement_id
                )
            )
            or 0
        )
    if total_users is None:
        total_users = int(db.scalar(select(func.count()).select_from(User)) or 0)

    percent = round((awarded_count / total_users) * 100, 2) if total_users else 0
    return {
        "achievement_id": achievement.achievement_id,
        "title": achievement.title,
        "description": achievement.description,
        "image_url": achievement.image_url,
        "rule_key": achievement.rule_key,
        "rule_value": achievement.rule_value,
        "is_active": achievement.is_active,
        "created_by": achievement.created_by,
        "created_at": achievement.created_at.isoformat() if achievement.created_at else None,
        "updated_at": achievement.updated_at.isoformat() if achievement.updated_at else None,
        "awarded_count": awarded_count,
        "users_percent": percent,
    }


def user_achievement_to_dict(
    db: Session,
    achievement: Achievement,
    user_achievement: UserAchievement,
) -> dict[str, Any]:
    data = achievement_to_dict(db, achievement)
    data.update({
        "is_visible": user_achievement.is_visible,
        "awarded_at": user_achievement.awarded_at.isoformat() if user_achievement.awarded_at else None,
    })
    return data


def save_achievement_image(image_data_url: str | None, title: str, current_image: str | None = None) -> str | None:
    if not image_data_url:
        return current_image
    return save_image_data_url(image_data_url, "achievements", title)


def _count_owned_gifts(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(CurrentOwner)
            .join(Present, CurrentOwner.present_id == Present.present_id)
            .where(CurrentOwner.owner_id == user_id, Present.is_burned == 0)
        )
        or 0
    )


def _count_unique_owned_collections(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count(func.distinct(Present.collection_id)))
            .select_from(CurrentOwner)
            .join(Present, CurrentOwner.present_id == Present.present_id)
            .where(CurrentOwner.owner_id == user_id, Present.is_burned == 0)
        )
        or 0
    )


def _count_user_transactions(db: Session, user_id: int, kind: str) -> int:
    query = select(func.count()).select_from(TransactionHistory).where(
        TransactionHistory.transaction_status == "confirmed"
    )
    if kind == "purchase":
        query = query.where(TransactionHistory.buyer_id == user_id)
    else:
        query = query.where(TransactionHistory.seller_id == user_id)
    return int(db.scalar(query) or 0)


def _has_complete_collection(db: Session, user_id: int) -> bool:
    rows = (
        db.query(
            Collections.collection_id,
            Collections.collection_limit,
            func.count(CurrentOwner.present_id),
        )
        .join(Present, Present.collection_id == Collections.collection_id)
        .join(CurrentOwner, CurrentOwner.present_id == Present.present_id)
        .filter(CurrentOwner.owner_id == user_id, Present.is_burned == 0)
        .group_by(Collections.collection_id, Collections.collection_limit)
        .all()
    )
    return any(int(owned_count or 0) >= int(limit or 0) and int(limit or 0) > 0 for _, limit, owned_count in rows)


def _is_early_collector(db: Session, user_id: int, rank_limit: int) -> bool:
    ids = [
        int(row[0])
        for row in db.query(User.user_id).order_by(User.created_at.asc(), User.user_id.asc()).limit(rank_limit).all()
    ]
    return user_id in ids


def _top_spender_ids(db: Session, rank_limit: int) -> set[int]:
    spender_id = case(
        (TransactionHistory.transaction_type == "purchase", TransactionHistory.seller_id),
        else_=TransactionHistory.buyer_id,
    ).label("spender_id")

    rows = (
        db.query(spender_id, func.coalesce(func.sum(TransactionHistory.transaction_price), Decimal("0")))
        .filter(TransactionHistory.transaction_status == "confirmed")
        .group_by(spender_id)
        .order_by(func.sum(TransactionHistory.transaction_price).desc())
        .limit(rank_limit)
        .all()
    )
    return {int(row[0]) for row in rows if row[0] is not None}


def user_matches_achievement(db: Session, user_id: int, achievement: Achievement) -> bool:
    rule_key = achievement.rule_key or "manual"
    rule_value = int(achievement.rule_value or 1)

    if not achievement.is_active or rule_key == "manual":
        return False

    if rule_key == "gifts_owned_at_least":
        return _count_owned_gifts(db, user_id) >= rule_value
    if rule_key == "purchases_count_at_least":
        return _count_user_transactions(db, user_id, "purchase") >= rule_value
    if rule_key == "sales_count_at_least":
        return _count_user_transactions(db, user_id, "sale") >= rule_value
    if rule_key == "unique_collections_at_least":
        return _count_unique_owned_collections(db, user_id) >= rule_value
    if rule_key == "complete_collection":
        return _has_complete_collection(db, user_id)
    if rule_key == "early_collector":
        return _is_early_collector(db, user_id, rule_value)
    if rule_key == "top_spender_rank":
        return user_id in _top_spender_ids(db, rule_value)

    return False


def send_achievement_notification(db: Session, user: User, achievement: Achievement) -> Notification | None:
    try:
        notification = create_notification(
            db=db,
            user_id=user.user_id,
            type_name=NOTIFICATION_TYPE_ACHIEVEMENT,
            entity_type="achievement",
            entity_id=achievement.achievement_id,
            payload={
                "achievement_id": achievement.achievement_id,
                "title": achievement.title,
                "description": achievement.description,
                "image_url": achievement.image_url,
            },
            type_description="Achievement unlocked",
            create_type_if_missing=True,
        )
        try:
            asyncio.get_event_loop().create_task(manager.send_to_user(user.user_id, notification_to_dict(notification)))
        except Exception:
            pass
        send_tg_message_sync(
            user.user_tg_id,
            f"Achievement unlocked: *{achievement.title}*\n{achievement.description}",
        )
        return notification
    except Exception:
        return None


def award_achievement(
    db: Session,
    user: User,
    achievement: Achievement,
    notify: bool = True,
) -> bool:
    ensure_admin_platform_schema()
    existing = db.get(UserAchievement, {"user_id": user.user_id, "achievement_id": achievement.achievement_id})
    if existing:
        return False

    db.add(UserAchievement(
        user_id=user.user_id,
        achievement_id=achievement.achievement_id,
        is_visible=1,
        awarded_at=datetime.utcnow(),
    ))
    db.flush()

    if notify:
        send_achievement_notification(db, user, achievement)

    return True


def evaluate_user_achievements(db: Session, user_id: int, notify: bool = True) -> int:
    ensure_admin_platform_schema()
    user = db.get(User, user_id)
    if not user or not user.is_active:
        return 0

    achievements = db.scalars(
        select(Achievement).where(Achievement.is_active == 1, Achievement.rule_key.isnot(None))
    ).all()

    awarded = 0
    for achievement in achievements:
        if user_matches_achievement(db, user.user_id, achievement):
            if award_achievement(db, user, achievement, notify=notify):
                awarded += 1

    return awarded


def backfill_achievement(db: Session, achievement: Achievement, notify: bool = True) -> int:
    ensure_admin_platform_schema()
    if not achievement.is_active or not achievement.rule_key or achievement.rule_key == "manual":
        return 0

    users = db.scalars(select(User).where(User.is_active == 1)).all()
    awarded = 0
    for user in users:
        if user_matches_achievement(db, user.user_id, achievement):
            if award_achievement(db, user, achievement, notify=notify):
                awarded += 1

    return awarded


def backfill_all_achievements(db: Session, notify: bool = True) -> int:
    ensure_admin_platform_schema()
    total = 0
    achievements = db.scalars(select(Achievement).where(Achievement.is_active == 1)).all()
    for achievement in achievements:
        total += backfill_achievement(db, achievement, notify=notify)
    return total
