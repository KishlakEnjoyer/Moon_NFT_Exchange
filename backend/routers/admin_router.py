from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, joinedload

from core.auth import get_current_user
from core.database import get_db
from core.models import (
    Backgrounds,
    CartItem,
    Collections,
    Listing,
    ListingStatuses,
    Models,
    Present,
    Report,
    ReportStatus,
    Role,
    Symbols,
    Transaction,
    User,
)


admin_router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_ROLE_IDS = {3}
MANAGER_ROLE_IDS = {2, 3}
ADMIN_ROLE_NAMES = {"admin", "administrator", "администратор"}
MANAGER_ROLE_NAMES = {"manager", "moderator", "менеджер", "модератор"} | ADMIN_ROLE_NAMES
PENDING_STATUS_NAMES = {"pending", "new", "open", "created", "awaiting review", "ожидает", "новая", "на рассмотрении"}
archive_columns_checked = False


class ReportDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")


class DictionaryItemPayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    image_url: str | None = None
    collection_id: int | None = None
    collection_limit: int | None = Field(default=None, ge=1)
    purchase_limit: int | None = Field(default=None, ge=1)
    base_price: Decimal | None = Field(default=None, ge=0)


class RolePayload(BaseModel):
    role_name: str = Field(min_length=2, max_length=50)
    description: str | None = None


class UserRolePayload(BaseModel):
    role_id: int


class UserActivePayload(BaseModel):
    is_active: int = Field(ge=0, le=1)


def get_role_name(user: User) -> str:
    if user.role and user.role.role_name:
        return user.role.role_name.lower()
    return ""


def user_is_admin(user: User) -> bool:
    return user.role_id in ADMIN_ROLE_IDS or get_role_name(user) in ADMIN_ROLE_NAMES


def user_is_manager(user: User) -> bool:
    return user.role_id in MANAGER_ROLE_IDS or get_role_name(user) in MANAGER_ROLE_NAMES


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if not user_is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager role is required")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role is required")
    return current_user


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


def money(value) -> str:
    if value is None:
        return "0"
    return str(value)


def user_label(user: User | None) -> str | None:
    if not user:
        return None
    return user.username or user.tg_username or user.vk_username or f"user_{user.user_id}"


def serialize_report(report: Report) -> dict:
    return {
        "report_id": report.report_id,
        "sender_id": report.sender_id,
        "sender_username": user_label(report.sender),
        "receiver_id": report.receiver_id,
        "receiver_username": user_label(report.receiver),
        "receiver_is_active": report.receiver.is_active if report.receiver else None,
        "report_type_id": report.report_type_id,
        "report_type_title": report.report_type.report_type_title if report.report_type else None,
        "report_status_id": report.report_status_id,
        "report_status_name": report.report_status.report_status_name if report.report_status else "pending",
        "moderator_id": report.moderator_id,
        "moderator_username": user_label(report.moderator),
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "closed_at": report.closed_at.isoformat() if report.closed_at else None,
    }


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
def get_admin_access(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "role_id": current_user.role_id,
        "role_name": current_user.role.role_name if current_user.role else None,
        "can_moderate": user_is_manager(current_user),
        "can_admin": user_is_admin(current_user),
    }


@admin_router.get("/summary")
def get_summary(
    days: int = Query(default=14, ge=1, le=90),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
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

    sales_by_day_rows = (
        db.query(
            func.date(Transaction.transaction_date).label("day"),
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.transaction_price), 0),
        )
        .filter(
            Transaction.transaction_date >= range_start_dt,
            Transaction.transaction_date < range_end_dt,
        )
        .group_by(func.date(Transaction.transaction_date))
        .order_by(func.date(Transaction.transaction_date))
        .all()
    )

    sales_by_day_map = {}
    for row in sales_by_day_rows:
        day_value = row[0]
        if isinstance(day_value, datetime):
            day_key = day_value.date().isoformat()
        elif hasattr(day_value, "isoformat"):
            day_key = day_value.isoformat()
        else:
            day_key = str(day_value)
        sales_by_day_map[day_key] = {
            "transactions": int(row[1] or 0),
            "volume": money(row[2]),
        }

    sales_by_day = []
    for offset in range((range_end - range_start).days + 1):
        day = range_start + timedelta(days=offset)
        day_key = day.isoformat()
        day_stats = sales_by_day_map.get(day_key, {"transactions": 0, "volume": "0"})
        sales_by_day.append({
            "day": day_key,
            "transactions": day_stats["transactions"],
            "volume": day_stats["volume"],
        })

    top_collection_rows = (
        db.query(
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
        .group_by(Collections.collection_id, Collections.collection_name)
        .order_by(func.sum(Transaction.transaction_price).desc())
        .limit(5)
        .all()
    )

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
        "top_collections": [
            {"collection_name": row[0], "transactions": int(row[1] or 0), "volume": money(row[2])}
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

    return [serialize_report(report) for report in reports]


@admin_router.patch("/reports/{report_id}/decision")
def decide_report(
    report_id: int,
    payload: ReportDecisionRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    report = db.scalar(select(Report).where(Report.report_id == report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    status_name = "approved" if payload.decision == "approve" else "rejected"
    report.report_status_id = get_or_create_report_status_id(db, status_name)
    report.moderator_id = current_user.user_id
    report.closed_at = datetime.utcnow()

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

    return serialize_report(report)


@admin_router.get("/dictionaries/{kind}")
def list_dictionary_items(
    kind: str,
    include_archived: bool = Query(default=True),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
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
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)
    name = payload.name.strip()

    if kind == "collections":
        item = Collections(
            collection_name=name,
            collection_image_url=payload.image_url,
            collection_limit=payload.collection_limit or 100,
            purchase_limit=payload.purchase_limit,
            base_price=payload.base_price or Decimal("100.00"),
            is_active=1,
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
    db.commit()
    db.refresh(item)
    return {"ok": True, "id": getattr(item, f"{kind[:-1]}_id", None)}


@admin_router.patch("/dictionaries/{kind}/{item_id}")
def update_dictionary_item(
    kind: str,
    item_id: int,
    payload: DictionaryItemPayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    kind = check_dictionary_kind(kind)
    ensure_archive_columns(db)
    name = payload.name.strip()

    if kind == "collections":
        item = db.get(Collections, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Collection not found")
        item.collection_name = name
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
        item.model_image_url = payload.image_url
    elif kind == "backgrounds":
        item = db.get(Backgrounds, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Background not found")
        item.background_name = name
        item.background_image_url = payload.image_url
    else:
        item = db.get(Symbols, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Symbol not found")
        item.symbol_name = name
        item.symbol_image_url = payload.image_url or item.symbol_image_url

    db.commit()
    return {"ok": True}


@admin_router.patch("/dictionaries/{kind}/{item_id}/archive")
def archive_dictionary_item(
    kind: str,
    item_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return set_dictionary_item_active(kind, item_id, 0, db)


@admin_router.patch("/dictionaries/{kind}/{item_id}/restore")
def restore_dictionary_item(
    kind: str,
    item_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return set_dictionary_item_active(kind, item_id, 1, db)


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


@admin_router.get("/roles")
def list_roles(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
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
            "users_count": int(counts.get(role.role_id, 0)),
        }
        for role in roles
    ]


@admin_router.post("/roles")
def create_role(
    payload: RolePayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    role_name = payload.role_name.strip()
    existing = db.scalar(select(Role).where(func.lower(Role.role_name) == role_name.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Role already exists")
    role = Role(role_name=role_name, description=payload.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return {"role_id": role.role_id, "role_name": role.role_name, "description": role.description}


@admin_router.patch("/roles/{role_id}")
def update_role(
    role_id: int,
    payload: RolePayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.role_name = payload.role_name.strip()
    role.description = payload.description
    db.commit()
    return {"ok": True}


@admin_router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users_count = db.query(func.count(User.user_id)).filter(User.role_id == role_id).scalar() or 0
    if users_count:
        raise HTTPException(status_code=400, detail="Role is used by users")
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()
    return {"ok": True}


@admin_router.get("/users")
def list_users(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
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
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = db.get(Role, payload.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user.role_id = payload.role_id
    db.commit()
    return {"ok": True}


@admin_router.patch("/users/{user_id}/active")
def set_user_active(
    user_id: int,
    payload: UserActivePayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.user_id and payload.is_active == 0:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    deactivated_listings = 0
    if payload.is_active == 0:
        deactivated_listings = deactivate_user_active_listings(db, user.user_id)
    db.commit()
    return {"ok": True, "deactivated_listings": deactivated_listings}
