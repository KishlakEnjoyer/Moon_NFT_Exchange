import asyncio
import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, joinedload

from core.auth import get_current_user
from core.database import get_db
from core.models import (
    Backgrounds,
    Achievement,
    AuditLog,
    CartItem,
    Collections,
    Listing,
    ListingStatuses,
    ModerationQueueItem,
    Models,
    Present,
    Report,
    ReportStatus,
    Role,
    RolePermission,
    Symbols,
    Transaction,
    User,
    UserSanction,
)
from services.achievement_service import (
    ACHIEVEMENT_RULES,
    achievement_to_dict,
    backfill_achievement,
    backfill_all_achievements,
    save_achievement_image,
)
from services.admin_platform_service import (
    PERMISSION_KEYS,
    PERMISSION_LABELS,
    MASTER_ROLE_ID,
    MASTER_ROLE_NAMES,
    MODERATION_VOTES_KEY,
    audit_to_dict,
    create_moderation_item,
    get_moderation_votes,
    get_visible_profile_badges,
    log_audit,
    moderation_to_dict,
    moderation_vote_counts,
    parse_payload_json,
    record_sanction,
    require_permission,
    sanction_to_dict,
    save_image_data_url,
    seed_master_role,
    set_role_permissions,
    user_has_permission,
    user_is_admin as platform_user_is_admin,
    user_is_master as platform_user_is_master,
    user_is_manager as platform_user_is_manager,
    user_permissions,
)
from services.notification_service import (
    NOTIFICATION_TYPE_REPORT_WARNING,
    create_notification,
    manager,
    notification_to_dict,
)


admin_router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_ROLE_IDS = {3}
MANAGER_ROLE_IDS = {2, 3}
ADMIN_ROLE_NAMES = {"admin", "administrator", "администратор"}
MANAGER_ROLE_NAMES = {"manager", "moderator", "менеджер", "модератор"} | ADMIN_ROLE_NAMES
PENDING_STATUS_NAMES = {"pending", "new", "open", "created", "awaiting review", "ожидает", "новая", "на рассмотрении"}
DICTIONARY_ADMIN_APPROVALS_REQUIRED = 2
DICTIONARY_ADMIN_REJECTIONS_REQUIRED = 1
archive_columns_checked = False


class ReportDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")


class ReportWarningRequest(BaseModel):
    reason_ru: str | None = Field(default=None, max_length=255)
    reason_en: str | None = Field(default=None, max_length=255)


class DictionaryItemPayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    image_url: str | None = None
    image_data_url: str | None = None
    collection_id: int | None = None
    collection_limit: int | None = Field(default=None, ge=1)
    purchase_limit: int | None = Field(default=None, ge=1)
    base_price: Decimal | None = Field(default=None, ge=0)


class RolePayload(BaseModel):
    role_name: str = Field(min_length=2, max_length=50)
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)


class UserRolePayload(BaseModel):
    role_id: int


class UserActivePayload(BaseModel):
    is_active: int = Field(ge=0, le=1)
    reason: str | None = Field(default=None, max_length=255)


class AchievementPayload(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=500)
    image_data_url: str | None = None
    image_url: str | None = None
    rule_key: str | None = None
    rule_value: int | None = Field(default=None, ge=1)
    is_active: int = Field(default=1, ge=0, le=1)
    backfill_existing: bool = True


class AchievementActivePayload(BaseModel):
    is_active: int = Field(ge=0, le=1)


class ModerationDecisionPayload(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    reason: str | None = Field(default=None, max_length=255)


def get_role_name(user: User) -> str:
    if user.role and user.role.role_name:
        return user.role.role_name.lower()
    return ""


def user_is_admin(user: User) -> bool:
    return platform_user_is_admin(user)


def user_is_master(user: User) -> bool:
    return platform_user_is_master(user)


def user_is_manager(user: User) -> bool:
    return platform_user_is_manager(user)


def role_name_is_master(role_name: str | None) -> bool:
    return bool(role_name and role_name.strip().lower() in MASTER_ROLE_NAMES)


def require_manager(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    seed_master_role(db)
    db.commit()
    if not (user_is_manager(current_user) or bool(user_permissions(db, current_user))):
        raise HTTPException(status_code=403, detail="Manager role is required")
    return current_user


def require_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    seed_master_role(db)
    db.commit()
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role is required")
    return current_user


def require_admin_permission(permission: str, current_user: User, db: Session) -> None:
    seed_master_role(db)
    db.commit()
    require_permission(db, current_user, permission)


def ensure_archive_columns(db: Session) -> None:
    global archive_columns_checked
    if archive_columns_checked:
        return

    for table_name in ("models", "backgrounds", "symbols"):
        try:
            db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN is_active SMALLINT NOT NULL DEFAULT 1"))
            db.commit()
        except OperationalError as exc:
            db.rollback()
            message = str(exc.orig).lower()
            if "duplicate column" not in message and "1060" not in message:
                raise

    archive_columns_checked = True


def get_or_create_report_status_id(db: Session, status_name: str) -> int:
    status = db.scalar(
        select(ReportStatus).where(func.lower(ReportStatus.report_status_name) == status_name.lower())
    )
    if status:
        return int(status.report_status_id)

    if status_name == "pending":
        status = db.get(ReportStatus, 1)
        if status:
            return int(status.report_status_id)

    status = ReportStatus(report_status_name=status_name)
    db.add(status)
    db.flush()
    return int(status.report_status_id)


def get_or_create_listing_status_id(db: Session, status_name: str) -> int:
    status = db.scalar(
        select(ListingStatuses).where(func.lower(ListingStatuses.status_name) == status_name.lower())
    )
    if status:
        return int(status.status_id)

    status = ListingStatuses(status_name=status_name)
    db.add(status)
    db.flush()
    return int(status.status_id)


def get_report_status_name(report: Report) -> str:
    if not report.report_status or not report.report_status.report_status_name:
        return ""
    return report.report_status.report_status_name.strip().lower()


def report_is_pending(report: Report) -> bool:
    return report.closed_at is None and (
        report.report_status_id == 1
        or get_report_status_name(report) in PENDING_STATUS_NAMES
    )


def deactivate_user_active_listings(db: Session, user_id: int) -> int:
    active_status_id = get_or_create_listing_status_id(db, "active")
    cancelled_status_id = get_or_create_listing_status_id(db, "cancelled")
    listings = db.scalars(
        select(Listing).where(
            Listing.seller_id == user_id,
            Listing.status_id == active_status_id,
        )
    ).all()

    listing_ids = [listing.listing_id for listing in listings]
    for listing in listings:
        listing.status_id = cancelled_status_id

    if listing_ids:
        db.query(CartItem).filter(CartItem.listing_id.in_(listing_ids)).delete(synchronize_session=False)

    return len(listing_ids)


def approve_pending_reports_for_user(db: Session, receiver_id: int, moderator_id: int) -> int:
    approved_status_id = get_or_create_report_status_id(db, "approved")
    now = datetime.utcnow()
    reports = db.scalars(
        select(Report)
        .outerjoin(ReportStatus, Report.report_status_id == ReportStatus.report_status_id)
        .where(
            Report.receiver_id == receiver_id,
            Report.closed_at.is_(None),
            or_(
                Report.report_status_id == 1,
                func.lower(ReportStatus.report_status_name).in_(PENDING_STATUS_NAMES),
            ),
        )
    ).all()

    for report in reports:
        report.report_status_id = approved_status_id
        report.moderator_id = moderator_id
        report.closed_at = now

    return len(reports)


def money(value) -> str:
    if value is None:
        return "0"
    return str(value)


def user_label(user: User | None) -> str | None:
    if not user:
        return None
    return user.username or user.tg_username or user.vk_username or f"user_{user.user_id}"


def _badge_fields(prefix: str, badge: dict | None) -> dict:
    return {
        f"{prefix}_profile_badge_achievement_id": badge["achievement_id"] if badge else None,
        f"{prefix}_profile_badge_image_url": badge["image_url"] if badge else None,
        f"{prefix}_profile_badge_title": badge["title"] if badge else None,
    }


def serialize_report(report: Report, profile_badges: dict[int, dict] | None = None) -> dict:
    profile_badges = profile_badges or {}
    sender_badge = profile_badges.get(report.sender_id)
    receiver_badge = profile_badges.get(report.receiver_id)
    moderator_badge = profile_badges.get(report.moderator_id) if report.moderator_id else None
    return {
        "report_id": report.report_id,
        "sender_id": report.sender_id,
        "sender_username": user_label(report.sender),
        **_badge_fields("sender", sender_badge),
        "receiver_id": report.receiver_id,
        "receiver_username": user_label(report.receiver),
        **_badge_fields("receiver", receiver_badge),
        "receiver_is_active": report.receiver.is_active if report.receiver else None,
        "report_type_id": report.report_type_id,
        "report_type_title": report.report_type.report_type_title if report.report_type else None,
        "report_status_id": report.report_status_id,
        "report_status_name": report.report_status.report_status_name if report.report_status else "pending",
        "moderator_id": report.moderator_id,
        "moderator_username": user_label(report.moderator),
        **_badge_fields("moderator", moderator_badge),
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "closed_at": report.closed_at.isoformat() if report.closed_at else None,
    }


def send_notification_ws_safely(user_id: int, data: dict) -> None:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.send_to_user(user_id, data))
        else:
            asyncio.run(manager.send_to_user(user_id, data))
    except Exception:
        pass


def clean_warning_reason(value: str | None, fallback: str) -> str:
    text_value = (value or "").strip()
    return text_value or fallback


def serialize_collection(item: Collections) -> dict:
    return {
        "id": item.collection_id,
        "name": item.collection_name,
        "image_url": item.collection_image_url,
        "collection_limit": item.collection_limit,
        "purchase_limit": item.purchase_limit,
        "base_price": str(item.base_price),
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_raw_item(row) -> dict:
    data = dict(row)
    created_at = data.get("created_at")
    if created_at:
        data["created_at"] = created_at.isoformat()
    return data


def check_dictionary_kind(kind: str) -> str:
    if kind not in {"collections", "models", "backgrounds", "symbols"}:
        raise HTTPException(status_code=404, detail="Dictionary not found")
    return kind


@admin_router.get("/me")
def get_admin_access(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seed_master_role(db)
    db.commit()
    permissions = user_permissions(db, current_user)
    return {
        "user_id": current_user.user_id,
        "role_id": current_user.role_id,
        "role_name": current_user.role.role_name if current_user.role else None,
        "can_moderate": user_is_manager(current_user) or "reports.manage" in permissions,
        "can_admin": user_is_admin(current_user) or any(permission.endswith(".manage") for permission in permissions),
        "permissions": permissions,
        "available_permissions": [
            {"key": key, "label": PERMISSION_LABELS.get(key, key)}
            for key in PERMISSION_KEYS
        ],
    }


@admin_router.get("/summary")
def get_summary(
    days: int = Query(default=14, ge=1, le=90),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    collection_id: int | None = Query(default=None, ge=1),
    compare: bool = Query(default=False),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    pending_report_count = (
        db.query(func.count(Report.report_id))
        .outerjoin(ReportStatus, Report.report_status_id == ReportStatus.report_status_id)
        .filter(
            or_(
                Report.report_status_id == 1,
                func.lower(ReportStatus.report_status_name).in_(PENDING_STATUS_NAMES),
            )
        )
        .scalar()
        or 0
    )

    active_listing_status = db.scalar(
        select(ListingStatuses.status_id).where(func.lower(ListingStatuses.status_name) == "active")
    )

    active_listings = 0
    if active_listing_status:
        active_listings = (
            db.query(func.count(Listing.listing_id))
            .join(User, Listing.seller_id == User.user_id)
            .filter(
                Listing.status_id == active_listing_status,
                User.is_active == 1,
            )
            .scalar()
            or 0
        )

    today = datetime.utcnow().date()
    range_end = end_date or today
    range_start = start_date or (range_end - timedelta(days=days - 1))

    if range_start > range_end:
        raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания")

    if (range_end - range_start).days > 89:
        raise HTTPException(status_code=400, detail="Диапазон не должен быть больше 90 дней")

    range_start_dt = datetime.combine(range_start, datetime.min.time())
    range_end_dt = datetime.combine(range_end + timedelta(days=1), datetime.min.time())
    period_days = (range_end - range_start).days + 1

    if collection_id is not None and not db.get(Collections, collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")

    def filter_transactions_by_collection(query):
        if collection_id is None:
            return query

        return (
            query
            .join(Present, Present.present_id == Transaction.present_id)
            .filter(Present.collection_id == collection_id)
        )

    def get_period_totals(start_dt: datetime, end_dt: datetime) -> dict:
        totals_query = db.query(
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.transaction_price), 0),
            func.coalesce(func.sum(Transaction.platform_fee), 0),
        ).filter(
            Transaction.transaction_date >= start_dt,
            Transaction.transaction_date < end_dt,
        )
        totals_query = filter_transactions_by_collection(totals_query)
        row = totals_query.one()
        return {
            "transactions": int(row[0] or 0),
            "volume": money(row[1]),
            "platform_fee": money(row[2]),
        }

    def get_sales_by_day(start: date, end: date) -> list[dict]:
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
        rows_query = db.query(
            func.date(Transaction.transaction_date).label("day"),
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.transaction_price), 0),
        ).filter(
            Transaction.transaction_date >= start_dt,
            Transaction.transaction_date < end_dt,
        )
        rows_query = filter_transactions_by_collection(rows_query)
        rows = (
            rows_query
            .group_by(func.date(Transaction.transaction_date))
            .order_by(func.date(Transaction.transaction_date))
            .all()
        )

        by_day = {}
        for row in rows:
            day_value = row[0]
            if isinstance(day_value, datetime):
                day_key = day_value.date().isoformat()
            elif hasattr(day_value, "isoformat"):
                day_key = day_value.isoformat()
            else:
                day_key = str(day_value)
            by_day[day_key] = {
                "transactions": int(row[1] or 0),
                "volume": money(row[2]),
            }

        result = []
        for offset in range((end - start).days + 1):
            day = start + timedelta(days=offset)
            day_key = day.isoformat()
            day_stats = by_day.get(day_key, {"transactions": 0, "volume": "0"})
            result.append({
                "day": day_key,
                "transactions": day_stats["transactions"],
                "volume": day_stats["volume"],
            })
        return result

    sales_by_day = get_sales_by_day(range_start, range_end)

    top_collection_query = (
        db.query(
            Collections.collection_id,
            Collections.collection_name,
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.transaction_price), 0),
        )
        .join(Present, Present.collection_id == Collections.collection_id)
        .join(Transaction, Transaction.present_id == Present.present_id)
        .filter(
            Transaction.transaction_date >= range_start_dt,
            Transaction.transaction_date < range_end_dt,
        )
    )
    if collection_id is not None:
        top_collection_query = top_collection_query.filter(Collections.collection_id == collection_id)
    top_collection_rows = (
        top_collection_query
        .group_by(Collections.collection_id, Collections.collection_name)
        .order_by(func.sum(Transaction.transaction_price).desc())
        .limit(5)
        .all()
    )

    previous_start = range_start - timedelta(days=period_days)
    previous_end = range_start - timedelta(days=1)
    previous_start_dt = datetime.combine(previous_start, datetime.min.time())
    previous_end_dt = datetime.combine(previous_end + timedelta(days=1), datetime.min.time())
    current_totals = get_period_totals(range_start_dt, range_end_dt)
    previous_totals = get_period_totals(previous_start_dt, previous_end_dt) if compare else {
        "transactions": 0,
        "volume": "0",
        "platform_fee": "0",
    }
    previous_sales_by_day = get_sales_by_day(previous_start, previous_end) if compare else []
    comparison_sales_by_day = []
    for index, current_day in enumerate(sales_by_day):
        previous_day = previous_sales_by_day[index] if index < len(previous_sales_by_day) else None
        comparison_sales_by_day.append({
            **current_day,
            "previous_day": previous_day["day"] if previous_day else None,
            "previous_transactions": previous_day["transactions"] if previous_day else 0,
            "previous_volume": previous_day["volume"] if previous_day else "0",
        })

    current_volume_number = Decimal(str(current_totals["volume"]))
    previous_volume_number = Decimal(str(previous_totals["volume"]))
    volume_delta = current_volume_number - previous_volume_number
    volume_delta_percent = None
    if previous_volume_number != 0:
        volume_delta_percent = float((volume_delta / previous_volume_number) * Decimal("100"))

    report_status_rows = (
        db.query(
            ReportStatus.report_status_name,
            func.count(Report.report_id),
        )
        .outerjoin(Report, Report.report_status_id == ReportStatus.report_status_id)
        .group_by(ReportStatus.report_status_name)
        .all()
    )

    role_rows = (
        db.query(Role.role_name, func.count(User.user_id))
        .outerjoin(User, User.role_id == Role.role_id)
        .group_by(Role.role_name)
        .all()
    )

    return {
        "cards": {
            "users_total": db.query(func.count(User.user_id)).scalar() or 0,
            "users_active": db.query(func.count(User.user_id)).filter(User.is_active == 1).scalar() or 0,
            "transactions_total": db.query(func.count(Transaction.transaction_id)).scalar() or 0,
            "sales_volume": money(db.query(func.coalesce(func.sum(Transaction.transaction_price), 0)).scalar()),
            "platform_fee": money(db.query(func.coalesce(func.sum(Transaction.platform_fee), 0)).scalar()),
            "active_listings": active_listings,
            "pending_reports": pending_report_count,
        },
        "sales_by_day": sales_by_day,
        "collections": [
            {"id": row[0], "name": row[1]}
            for row in db.query(Collections.collection_id, Collections.collection_name)
            .order_by(Collections.collection_name.asc())
            .all()
        ],
        "comparison": {
            "enabled": compare,
            "current": {
                "start_date": range_start.isoformat(),
                "end_date": range_end.isoformat(),
                **current_totals,
            },
            "previous": {
                "start_date": previous_start.isoformat(),
                "end_date": previous_end.isoformat(),
                **previous_totals,
            },
            "delta": {
                "transactions": current_totals["transactions"] - previous_totals["transactions"],
                "volume": money(volume_delta),
                "volume_percent": volume_delta_percent,
            },
            "sales_by_day": comparison_sales_by_day,
        },
        "top_collections": [
            {"collection_id": row[0], "collection_name": row[1], "transactions": int(row[2] or 0), "volume": money(row[3])}
            for row in top_collection_rows
        ],
        "reports_by_status": [
            {"status": row[0] or "pending", "count": int(row[1] or 0)}
            for row in report_status_rows
        ],
        "users_by_role": [
            {"role": row[0] or "unknown", "count": int(row[1] or 0)}
            for row in role_rows
        ],
    }


@admin_router.get("/reports")
def list_reports(
    status: str = Query(default="pending", pattern="^(pending|approved|rejected|all)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    query = (
        select(Report)
        .options(
            joinedload(Report.sender),
            joinedload(Report.receiver),
            joinedload(Report.report_type),
            joinedload(Report.report_status),
            joinedload(Report.moderator),
        )
        .outerjoin(ReportStatus, Report.report_status_id == ReportStatus.report_status_id)
    )

    if status == "pending":
        query = query.where(
            or_(
                Report.report_status_id == 1,
                func.lower(ReportStatus.report_status_name).in_(PENDING_STATUS_NAMES),
            )
        )
    elif status != "all":
        query = query.where(func.lower(ReportStatus.report_status_name) == status)

    reports = db.scalars(
        query.order_by(Report.created_at.desc()).offset(offset).limit(limit)
    ).all()
    profile_badges = get_visible_profile_badges(
        db,
        {
            user_id
            for report in reports
            for user_id in (report.sender_id, report.receiver_id, report.moderator_id)
            if user_id
        },
    )

    return [serialize_report(report, profile_badges) for report in reports]


@admin_router.patch("/reports/{report_id}/decision")
def decide_report(
    report_id: int,
    payload: ReportDecisionRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    report = db.scalar(
        select(Report)
        .where(Report.report_id == report_id)
        .options(joinedload(Report.report_status))
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report_is_pending(report):
        raise HTTPException(status_code=409, detail="Report is already closed")

    status_name = "approved" if payload.decision == "approve" else "rejected"
    report.report_status_id = get_or_create_report_status_id(db, status_name)
    report.moderator_id = current_user.user_id
    report.closed_at = datetime.utcnow()
    log_audit(db, current_user.user_id, f"report.{payload.decision}", "report", report_id)

    db.commit()
    db.refresh(report)

    report = db.scalar(
        select(Report)
        .where(Report.report_id == report_id)
        .options(
            joinedload(Report.sender),
            joinedload(Report.receiver),
            joinedload(Report.report_type),
            joinedload(Report.report_status),
            joinedload(Report.moderator),
        )
    )

    profile_badges = get_visible_profile_badges(
        db,
        {user_id for user_id in (report.sender_id, report.receiver_id, report.moderator_id) if user_id},
    )
    return serialize_report(report, profile_badges)


@admin_router.post("/reports/{report_id}/warning")
def send_report_warning(
    report_id: int,
    payload: ReportWarningRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    report = db.scalar(
        select(Report)
        .where(Report.report_id == report_id)
        .options(
            joinedload(Report.receiver),
            joinedload(Report.report_type),
        )
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.receiver:
        raise HTTPException(status_code=404, detail="Report target not found")
    if not report.receiver.is_active:
        raise HTTPException(status_code=409, detail="Report target account is blocked")

    fallback_reason = (report.report_type.report_type_title if report.report_type else None) or "Report reason"
    reason_ru = clean_warning_reason(payload.reason_ru, fallback_reason)
    reason_en = clean_warning_reason(payload.reason_en, fallback_reason)

    notification = create_notification(
        db=db,
        user_id=report.receiver_id,
        type_name=NOTIFICATION_TYPE_REPORT_WARNING,
        entity_type="report",
        entity_id=report.report_id,
        payload={
            "report_id": report.report_id,
            "reason": fallback_reason,
            "reason_ru": reason_ru,
            "reason_en": reason_en,
            "moderator_id": current_user.user_id,
            "moderator_username": user_label(current_user),
        },
        type_description="Report warning",
        create_type_if_missing=True,
    )

    db.commit()
    record_sanction(db, report.receiver_id, current_user.user_id, "warning", reason_ru, report.report_id)
    log_audit(db, current_user.user_id, "report.warning", "report", report.report_id, {"receiver_id": report.receiver_id})
    db.commit()
    db.refresh(notification)
    notification_dict = notification_to_dict(notification)
    send_notification_ws_safely(report.receiver_id, notification_dict)

    return {"ok": True, "notification": notification_dict}


@admin_router.get("/dictionaries/{kind}")
def list_dictionary_items(
    kind: str,
    include_archived: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)

    if kind == "collections":
        query = select(Collections).order_by(Collections.collection_name)
        if not include_archived:
            query = query.where(Collections.is_active == 1)
        return [serialize_collection(item) for item in db.scalars(query).all()]

    if kind == "models":
        rows = db.execute(
            text(
                """
                SELECT m.model_id AS id, m.model_name AS name, m.model_image_url AS image_url,
                       m.collection_id, c.collection_name, m.is_active, m.created_at
                FROM models m
                LEFT JOIN collections c ON c.collection_id = m.collection_id
                WHERE (:include_archived = 1 OR m.is_active = 1)
                ORDER BY m.model_name
                """
            ),
            {"include_archived": 1 if include_archived else 0},
        ).mappings().all()
        return [serialize_raw_item(row) for row in rows]

    if kind == "backgrounds":
        rows = db.execute(
            text(
                """
                SELECT background_id AS id, background_name AS name, background_image_url AS image_url,
                       is_active, created_at
                FROM backgrounds
                WHERE (:include_archived = 1 OR is_active = 1)
                ORDER BY background_name
                """
            ),
            {"include_archived": 1 if include_archived else 0},
        ).mappings().all()
        return [serialize_raw_item(row) for row in rows]

    rows = db.execute(
        text(
            """
            SELECT symbol_id AS id, symbol_name AS name, symbol_image_url AS image_url,
                   is_active, created_at
            FROM symbols
            WHERE (:include_archived = 1 OR is_active = 1)
            ORDER BY symbol_name
            """
        ),
        {"include_archived": 1 if include_archived else 0},
    ).mappings().all()
    return [serialize_raw_item(row) for row in rows]


@admin_router.post("/dictionaries/{kind}")
def create_dictionary_item(
    kind: str,
    payload: DictionaryItemPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)
    name = payload.name.strip()

    if not payload.image_data_url:
        raise HTTPException(status_code=400, detail="Image upload is required")

    if payload.image_data_url:
        item = create_moderation_item(
            db=db,
            item_type="dictionary_image",
            action="create",
            target_kind=kind,
            target_id=None,
            submitted_by=current_user.user_id,
            image_data_url=payload.image_data_url,
            payload=payload.model_dump(exclude={"image_data_url"}),
        )
        log_audit(db, current_user.user_id, "moderation.create", "moderation", item.moderation_id, {"kind": kind, "action": "create"})
        db.commit()
        return {"ok": True, "id": None, "moderation_id": item.moderation_id, "status": "pending"}

    if kind == "collections":
        item = Collections(
            collection_name=name,
            collection_image_url=payload.image_url,
            collection_limit=payload.collection_limit or 100,
            purchase_limit=payload.purchase_limit,
            base_price=payload.base_price or Decimal("100.00"),
            is_active=0,
        )
    elif kind == "models":
        if not payload.collection_id:
            raise HTTPException(status_code=400, detail="collection_id is required")
        collection = db.get(Collections, payload.collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        item = Models(
            collection_id=payload.collection_id,
            model_name=name,
            model_image_url=payload.image_url,
        )
    elif kind == "backgrounds":
        item = Backgrounds(
            background_name=name,
            background_image_url=payload.image_url,
        )
    else:
        item = Symbols(
            symbol_name=name,
            symbol_image_url=payload.image_url or "",
        )

    db.add(item)
    log_audit(db, current_user.user_id, "dictionary.create", kind, None, payload.model_dump(exclude={"image_data_url"}))
    db.commit()
    db.refresh(item)
    return {"ok": True, "id": getattr(item, f"{kind[:-1]}_id", None)}


@admin_router.patch("/dictionaries/{kind}/{item_id}")
def update_dictionary_item(
    kind: str,
    item_id: int,
    payload: DictionaryItemPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)
    name = payload.name.strip()

    if payload.image_data_url:
        item = create_moderation_item(
            db=db,
            item_type="dictionary_image",
            action="update",
            target_kind=kind,
            target_id=item_id,
            submitted_by=current_user.user_id,
            image_data_url=payload.image_data_url,
            payload=payload.model_dump(exclude={"image_data_url"}),
        )
        log_audit(db, current_user.user_id, "moderation.create", "moderation", item.moderation_id, {"kind": kind, "target_id": item_id, "action": "update"})
        db.commit()
        return {"ok": True, "moderation_id": item.moderation_id, "status": "pending"}

    if kind == "collections":
        item = db.get(Collections, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Collection not found")
        item.collection_name = name
        if payload.image_url is not None:
            item.collection_image_url = payload.image_url
        item.collection_limit = payload.collection_limit or item.collection_limit
        item.purchase_limit = payload.purchase_limit
        item.base_price = payload.base_price or item.base_price
    elif kind == "models":
        item = db.get(Models, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Model not found")
        if payload.collection_id:
            collection = db.get(Collections, payload.collection_id)
            if not collection:
                raise HTTPException(status_code=404, detail="Collection not found")
            item.collection_id = payload.collection_id
        item.model_name = name
        if payload.image_url is not None:
            item.model_image_url = payload.image_url
    elif kind == "backgrounds":
        item = db.get(Backgrounds, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Background not found")
        item.background_name = name
        if payload.image_url is not None:
            item.background_image_url = payload.image_url
    else:
        item = db.get(Symbols, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Symbol not found")
        item.symbol_name = name
        if payload.image_url is not None:
            item.symbol_image_url = payload.image_url or item.symbol_image_url

    db.commit()
    log_audit(db, current_user.user_id, "dictionary.update", kind, item_id, payload.model_dump(exclude={"image_data_url"}))
    return {"ok": True}


@admin_router.patch("/dictionaries/{kind}/{item_id}/archive")
def archive_dictionary_item(
    kind: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    log_audit(db, current_user.user_id, "dictionary.archive", kind, item_id)
    return set_dictionary_item_active(kind, item_id, 0, db)


@admin_router.patch("/dictionaries/{kind}/{item_id}/restore")
def restore_dictionary_item(
    kind: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    log_audit(db, current_user.user_id, "dictionary.restore", kind, item_id)
    return set_dictionary_item_active(kind, item_id, 1, db)


@admin_router.patch("/dictionaries/collections/{item_id}/publish")
def publish_collection(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("dictionaries.manage", current_user, db)
    item = db.get(Collections, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Collection not found")

    models_count = db.scalar(select(func.count(Models.model_id)).where(Models.collection_id == item_id)) or 0
    if models_count <= 0:
        raise HTTPException(status_code=400, detail="Add at least one model before publishing the collection")

    item.is_active = 1
    log_audit(db, current_user.user_id, "dictionary.publish", "collections", item_id, {"models_count": int(models_count)})
    db.commit()
    return {"ok": True}


def set_dictionary_item_active(kind: str, item_id: int, is_active: int, db: Session) -> dict:
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)

    if kind == "collections":
        item = db.get(Collections, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Collection not found")
        item.is_active = is_active
        db.commit()
        return {"ok": True}

    table_by_kind = {
        "models": ("models", "model_id"),
        "backgrounds": ("backgrounds", "background_id"),
        "symbols": ("symbols", "symbol_id"),
    }
    table_name, id_column = table_by_kind[kind]
    result = db.execute(
        text(f"UPDATE {table_name} SET is_active = :is_active WHERE {id_column} = :item_id"),
        {"is_active": is_active, "item_id": item_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Dictionary item not found")
    db.commit()
    return {"ok": True}


def dictionary_image_folder(kind: str) -> str:
    return {
        "collections": "collections",
        "models": "models",
        "backgrounds": "bgs",
        "symbols": "symbols",
    }[kind]


def apply_dictionary_moderation(db: Session, item: ModerationQueueItem, reviewer: User) -> dict:
    kind = check_dictionary_kind(item.target_kind or "")
    payload = parse_payload_json(item.payload_json)
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Moderation payload is missing a name")
    if not item.image_data_url:
        raise HTTPException(status_code=400, detail="Moderation item is missing an image")

    filename = item.image_data_url

    if kind == "collections":
        if item.action == "create":
            target = Collections(
                collection_name=name,
                collection_image_url=filename,
                collection_limit=int(payload.get("collection_limit") or 100),
                purchase_limit=payload.get("purchase_limit"),
                base_price=Decimal(str(payload.get("base_price") or "100")),
                is_active=0,
            )
            db.add(target)
            db.flush()
        else:
            target = db.get(Collections, item.target_id)
            if not target:
                raise HTTPException(status_code=404, detail="Collection not found")
            target.collection_name = name
            target.collection_image_url = filename
            target.collection_limit = int(payload.get("collection_limit") or target.collection_limit)
            target.purchase_limit = payload.get("purchase_limit")
            target.base_price = Decimal(str(payload.get("base_price") or target.base_price))
    elif kind == "models":
        collection_id = int(payload.get("collection_id") or 0)
        if not db.get(Collections, collection_id):
            raise HTTPException(status_code=404, detail="Collection not found")
        if item.action == "create":
            target = Models(collection_id=collection_id, model_name=name, model_image_url=filename)
            db.add(target)
            db.flush()
        else:
            target = db.get(Models, item.target_id)
            if not target:
                raise HTTPException(status_code=404, detail="Model not found")
            target.collection_id = collection_id
            target.model_name = name
            target.model_image_url = filename
    elif kind == "backgrounds":
        if item.action == "create":
            target = Backgrounds(background_name=name, background_image_url=filename)
            db.add(target)
            db.flush()
        else:
            target = db.get(Backgrounds, item.target_id)
            if not target:
                raise HTTPException(status_code=404, detail="Background not found")
            target.background_name = name
            target.background_image_url = filename
    else:
        if item.action == "create":
            target = Symbols(symbol_name=name, symbol_image_url=filename)
            db.add(target)
            db.flush()
        else:
            target = db.get(Symbols, item.target_id)
            if not target:
                raise HTTPException(status_code=404, detail="Symbol not found")
            target.symbol_name = name
            target.symbol_image_url = filename

    item.target_id = getattr(target, f"{kind[:-1]}_id", item.target_id)
    item.status = "approved"
    item.reviewed_by = reviewer.user_id
    item.reviewed_at = datetime.utcnow()
    log_audit(db, reviewer.user_id, "moderation.approve", "moderation", item.moderation_id, {"target_kind": kind, "target_id": item.target_id})
    return {"ok": True, "target_id": item.target_id, "image_url": filename}


def apply_profile_photo_moderation(db: Session, item: ModerationQueueItem, reviewer: User) -> dict:
    payload = parse_payload_json(item.payload_json)
    user_id = int(payload.get("user_id") or item.target_id or 0)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not item.image_data_url:
        raise HTTPException(status_code=400, detail="Moderation item is missing an image")

    filename = save_image_data_url(item.image_data_url, "pfps", user.username or f"user_{user.user_id}")
    user.profile_pic_url = filename
    item.status = "approved"
    item.reviewed_by = reviewer.user_id
    item.reviewed_at = datetime.utcnow()
    create_notification(
        db=db,
        user_id=user.user_id,
        type_name="profile_photo_approved",
        entity_type="user",
        entity_id=user.user_id,
        payload={"profile_pic_url": filename},
        type_description="Profile photo approved",
        create_type_if_missing=True,
    )
    log_audit(db, reviewer.user_id, "moderation.approve", "moderation", item.moderation_id, {"target_kind": "users", "target_id": user.user_id})
    return {"ok": True, "target_id": user.user_id, "image_url": filename}


def save_moderation_payload(item: ModerationQueueItem, payload: dict[str, Any]) -> None:
    item.payload_json = json.dumps(payload, ensure_ascii=False, default=str)


def add_dictionary_moderation_vote(
    item: ModerationQueueItem,
    reviewer: User,
    decision: str,
    reason: str | None,
) -> tuple[dict[str, Any], dict[str, int]]:
    if item.submitted_by == reviewer.user_id:
        raise HTTPException(status_code=403, detail="Cannot review your own moderation request")

    if not user_is_admin(reviewer):
        raise HTTPException(status_code=403, detail="Admin role is required to review dictionary moderation requests")

    payload = parse_payload_json(item.payload_json)
    votes = get_moderation_votes(payload)

    if any(int(vote.get("user_id") or 0) == reviewer.user_id for vote in votes):
        raise HTTPException(status_code=409, detail="You have already voted on this moderation request")

    vote = {
        "user_id": reviewer.user_id,
        "role": "admin",
        "decision": decision,
        "reason": reason,
        "created_at": datetime.utcnow().isoformat(),
    }
    payload[MODERATION_VOTES_KEY] = [*votes, vote]
    save_moderation_payload(item, payload)
    return payload, moderation_vote_counts(payload)


def dictionary_moderation_is_rejected(vote_counts: dict[str, int]) -> bool:
    return vote_counts["admin_rejections"] >= DICTIONARY_ADMIN_REJECTIONS_REQUIRED


def dictionary_moderation_is_approved(vote_counts: dict[str, int]) -> bool:
    return vote_counts["admin_approvals"] >= DICTIONARY_ADMIN_APPROVALS_REQUIRED


def decide_dictionary_moderation_item(
    db: Session,
    item: ModerationQueueItem,
    decision_payload: ModerationDecisionPayload,
    reviewer: User,
) -> dict:
    payload, vote_counts = add_dictionary_moderation_vote(
        item=item,
        reviewer=reviewer,
        decision=decision_payload.decision,
        reason=decision_payload.reason,
    )

    if dictionary_moderation_is_rejected(vote_counts):
        item.status = "rejected"
        item.reason = decision_payload.reason
        item.reviewed_by = reviewer.user_id
        item.reviewed_at = datetime.utcnow()
        log_audit(
            db,
            reviewer.user_id,
            "moderation.reject",
            "moderation",
            item.moderation_id,
            {"reason": decision_payload.reason, "vote_counts": vote_counts},
        )
        db.commit()
        return {"ok": True, "status": "rejected", "vote_counts": vote_counts}

    if dictionary_moderation_is_approved(vote_counts):
        result = apply_dictionary_moderation(db, item, reviewer)
        result["status"] = "approved"
        result["vote_counts"] = vote_counts
        db.commit()
        return result

    log_audit(
        db,
        reviewer.user_id,
        "moderation.vote",
        "moderation",
        item.moderation_id,
        {
            "decision": decision_payload.decision,
            "role": "admin",
            "vote_counts": vote_counts,
        },
    )
    db.commit()
    return {"ok": True, "status": "pending", "vote_counts": vote_counts, "payload": payload}


@admin_router.get("/achievements/rules")
def list_achievement_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    return [{"key": key, "label": label} for key, label in ACHIEVEMENT_RULES.items()]


@admin_router.get("/achievements")
def list_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    achievements = db.scalars(select(Achievement).order_by(Achievement.created_at.desc())).all()
    return [achievement_to_dict(db, achievement) for achievement in achievements]


@admin_router.post("/achievements")
def create_achievement(
    payload: AchievementPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    rule_key = payload.rule_key or "manual"
    if rule_key not in ACHIEVEMENT_RULES:
        raise HTTPException(status_code=400, detail="Unknown achievement rule")

    image_url = save_achievement_image(payload.image_data_url, payload.title, payload.image_url)
    if not image_url:
        raise HTTPException(status_code=400, detail="Achievement image is required")
    achievement = Achievement(
        title=payload.title.strip(),
        description=payload.description.strip(),
        image_url=image_url,
        rule_key=rule_key,
        rule_value=payload.rule_value,
        is_active=payload.is_active,
        created_by=current_user.user_id,
    )
    db.add(achievement)
    db.flush()
    awarded = backfill_achievement(db, achievement, notify=True) if payload.backfill_existing else 0
    log_audit(db, current_user.user_id, "achievement.create", "achievement", achievement.achievement_id, {"awarded": awarded, "rule_key": rule_key})
    db.commit()
    db.refresh(achievement)
    return achievement_to_dict(db, achievement) | {"awarded_now": awarded}


@admin_router.patch("/achievements/{achievement_id}")
def update_achievement(
    achievement_id: int,
    payload: AchievementPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    achievement = db.get(Achievement, achievement_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    rule_key = payload.rule_key or "manual"
    if rule_key not in ACHIEVEMENT_RULES:
        raise HTTPException(status_code=400, detail="Unknown achievement rule")

    achievement.title = payload.title.strip()
    achievement.description = payload.description.strip()
    current_image = payload.image_url if payload.image_url is not None else achievement.image_url
    achievement.image_url = save_achievement_image(payload.image_data_url, payload.title, current_image)
    achievement.rule_key = rule_key
    achievement.rule_value = payload.rule_value
    achievement.is_active = payload.is_active
    awarded = backfill_achievement(db, achievement, notify=True) if payload.backfill_existing else 0
    log_audit(db, current_user.user_id, "achievement.update", "achievement", achievement.achievement_id, {"awarded": awarded, "rule_key": rule_key})
    db.commit()
    db.refresh(achievement)
    return achievement_to_dict(db, achievement) | {"awarded_now": awarded}


@admin_router.patch("/achievements/{achievement_id}/active")
def set_achievement_active(
    achievement_id: int,
    payload: AchievementActivePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    achievement = db.get(Achievement, achievement_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    achievement.is_active = payload.is_active
    awarded = backfill_achievement(db, achievement, notify=True) if payload.is_active else 0
    log_audit(db, current_user.user_id, "achievement.active", "achievement", achievement_id, {"is_active": payload.is_active, "awarded": awarded})
    db.commit()
    return {"ok": True, "awarded_now": awarded}


@admin_router.post("/achievements/backfill")
def backfill_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("achievements.manage", current_user, db)
    awarded = backfill_all_achievements(db, notify=True)
    log_audit(db, current_user.user_id, "achievement.backfill", "achievement", None, {"awarded": awarded})
    db.commit()
    return {"ok": True, "awarded": awarded}


@admin_router.get("/moderation")
def list_moderation_queue(
    status: str = Query(default="pending", pattern="^(pending|approved|rejected|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("moderation.manage", current_user, db)
    query = select(ModerationQueueItem).order_by(ModerationQueueItem.created_at.desc())
    if status != "all":
        query = query.where(ModerationQueueItem.status == status)
    return [moderation_to_dict(item) for item in db.scalars(query.limit(100)).all()]


@admin_router.patch("/moderation/{moderation_id}/decision")
def decide_moderation_item(
    moderation_id: int,
    payload: ModerationDecisionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("moderation.manage", current_user, db)
    item = db.get(ModerationQueueItem, moderation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Moderation item not found")
    if item.status != "pending":
        raise HTTPException(status_code=409, detail="Moderation item is already closed")

    if item.item_type == "dictionary_image":
        return decide_dictionary_moderation_item(db, item, payload, current_user)

    if payload.decision == "reject":
        item.status = "rejected"
        item.reason = payload.reason
        item.reviewed_by = current_user.user_id
        item.reviewed_at = datetime.utcnow()
        if item.item_type == "profile_photo" and item.target_id:
            create_notification(
                db=db,
                user_id=item.target_id,
                type_name="profile_photo_rejected",
                entity_type="user",
                entity_id=item.target_id,
                payload={"reason": payload.reason},
                type_description="Profile photo rejected",
                create_type_if_missing=True,
            )
        log_audit(db, current_user.user_id, "moderation.reject", "moderation", moderation_id, {"reason": payload.reason})
        db.commit()
        return {"ok": True}

    if item.item_type == "profile_photo":
        result = apply_profile_photo_moderation(db, item, current_user)
    else:
        raise HTTPException(status_code=400, detail="Unsupported moderation item")

    db.commit()
    return result


@admin_router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=300),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("audit.view", current_user, db)
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return [audit_to_dict(row) for row in rows]


@admin_router.get("/users/{user_id}/sanctions")
def list_user_sanctions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("users.manage", current_user, db)
    rows = db.scalars(
        select(UserSanction)
        .where(UserSanction.user_id == user_id)
        .order_by(UserSanction.created_at.desc())
    ).all()
    return [sanction_to_dict(row) for row in rows]


@admin_router.get("/roles")
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seed_master_role(db)
    db.commit()
    if not (
        user_has_permission(db, current_user, "roles.manage")
        or user_has_permission(db, current_user, "users.manage")
    ):
        raise HTTPException(status_code=403, detail="Permission required: roles.manage")
    counts = dict(
        db.query(User.role_id, func.count(User.user_id))
        .group_by(User.role_id)
        .all()
    )
    roles = db.scalars(select(Role).order_by(Role.role_id)).all()
    return [
        {
            "role_id": role.role_id,
            "role_name": role.role_name,
            "description": role.description,
            "permissions": user_permissions(db, User(role_id=role.role_id, role=role)),
            "users_count": int(counts.get(role.role_id, 0)),
        }
        for role in roles
    ]


@admin_router.post("/roles")
def create_role(
    payload: RolePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("roles.manage", current_user, db)
    role_name = payload.role_name.strip()
    if role_name_is_master(role_name) and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Only a master admin can create master admin roles")
    existing = db.scalar(select(Role).where(func.lower(Role.role_name) == role_name.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Role already exists")
    role = Role(role_name=role_name, description=payload.description)
    db.add(role)
    db.flush()
    set_role_permissions(db, role.role_id, payload.permissions)
    log_audit(db, current_user.user_id, "role.create", "role", role.role_id, {"role_name": role.role_name, "permissions": payload.permissions})
    db.commit()
    db.refresh(role)
    return {"role_id": role.role_id, "role_name": role.role_name, "description": role.description, "permissions": user_permissions(db, User(role_id=role.role_id, role=role))}


@admin_router.patch("/roles/{role_id}")
def update_role(
    role_id: int,
    payload: RolePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("roles.manage", current_user, db)
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.role_id == MASTER_ROLE_ID and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Cannot edit master admin role")
    if role_name_is_master(payload.role_name) and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Only a master admin can create master admin roles")
    role.role_name = payload.role_name.strip()
    role.description = payload.description
    set_role_permissions(db, role.role_id, payload.permissions)
    log_audit(db, current_user.user_id, "role.update", "role", role.role_id, {"role_name": role.role_name, "permissions": payload.permissions})
    db.commit()
    return {"ok": True}


@admin_router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("roles.manage", current_user, db)
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.role_id == MASTER_ROLE_ID and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Cannot delete master admin role")
    users_count = db.query(func.count(User.user_id)).filter(User.role_id == role_id).scalar() or 0
    if users_count:
        raise HTTPException(status_code=400, detail="Role is used by users")
    db.delete(role)
    log_audit(db, current_user.user_id, "role.delete", "role", role_id)
    db.commit()
    return {"ok": True}


@admin_router.get("/users")
def list_users(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("users.manage", current_user, db)
    query = select(User).options(joinedload(User.role)).order_by(User.created_at.desc())
    if q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.username.ilike(pattern),
                User.tg_username.ilike(pattern),
                User.vk_username.ilike(pattern),
            )
        )

    users = db.scalars(query.offset(offset).limit(limit)).all()
    result = []

    for user in users:
        sales_count = db.query(func.count(Transaction.transaction_id)).filter(Transaction.seller_id == user.user_id).scalar() or 0
        purchases_count = db.query(func.count(Transaction.transaction_id)).filter(Transaction.buyer_id == user.user_id).scalar() or 0
        result.append(
            {
                "user_id": user.user_id,
                "username": user.username,
                "user_tg_id": user.user_tg_id,
                "user_vk_id": user.user_vk_id,
                "tg_username": user.tg_username,
                "vk_username": user.vk_username,
                "tg_visibility": user.tg_visibility,
                "vk_visibility": user.vk_visibility,
                "role_id": user.role_id,
                "role_name": user.role.role_name if user.role else None,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "sales_count": int(sales_count),
                "purchases_count": int(purchases_count),
                "reports_sent": db.query(func.count(Report.report_id)).filter(Report.sender_id == user.user_id).scalar() or 0,
                "reports_received": db.query(func.count(Report.report_id)).filter(Report.receiver_id == user.user_id).scalar() or 0,
            }
        )

    return result


@admin_router.patch("/users/{user_id}/role")
def set_user_role(
    user_id: int,
    payload: UserRolePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("users.manage", current_user, db)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    if user_is_master(user) and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Cannot change a master admin role")
    role = db.get(Role, payload.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if (payload.role_id == MASTER_ROLE_ID or role_name_is_master(role.role_name)) and not user_is_master(current_user):
        raise HTTPException(status_code=403, detail="Only a master admin can assign master admin role")
    user.role_id = payload.role_id
    log_audit(db, current_user.user_id, "user.role", "user", user_id, {"role_id": payload.role_id})
    db.commit()
    return {"ok": True}


@admin_router.patch("/users/{user_id}/active")
def set_user_active(
    user_id: int,
    payload: UserActivePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission("users.manage", current_user, db)
    if user_id == current_user.user_id and payload.is_active == 0:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    deactivated_listings = 0
    approved_reports = 0
    if payload.is_active == 0:
        deactivated_listings = deactivate_user_active_listings(db, user.user_id)
        approved_reports = approve_pending_reports_for_user(db, user.user_id, current_user.user_id)
        record_sanction(db, user.user_id, current_user.user_id, "ban", payload.reason, None)
    else:
        record_sanction(db, user.user_id, current_user.user_id, "unban", payload.reason, None)
    log_audit(db, current_user.user_id, "user.active", "user", user_id, {"is_active": payload.is_active, "reason": payload.reason})
    db.commit()
    return {
        "ok": True,
        "deactivated_listings": deactivated_listings,
        "approved_reports": approved_reports,
    }
