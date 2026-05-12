from __future__ import annotations

import base64
import binascii
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4
import uuid

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import bindparam, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from core.database import engine
from core.models import (
    AuditLog,
    ModerationQueueItem,
    Role,
    RolePermission,
    User,
    UserSanction,
)


PERMISSION_KEYS = [
    "dashboard.view",
    "reports.manage",
    "dictionaries.manage",
    "moderation.manage",
    "achievements.manage",
    "users.manage",
    "roles.manage",
    "audit.view",
]

PERMISSION_LABELS = {
    "dashboard.view": "Dashboard",
    "reports.manage": "Reports and warnings",
    "dictionaries.manage": "Collections, models, backgrounds, symbols",
    "moderation.manage": "Moderation queue",
    "achievements.manage": "Achievements",
    "users.manage": "Users and sanctions",
    "roles.manage": "Roles and permissions",
    "audit.view": "Audit log",
}

MASTER_ROLE_NAMES = {"master_admin", "owner", "super_admin", "главный админ", "мастер админ"}
ADMIN_ROLE_NAMES = {"admin", "administrator", "администратор"} | MASTER_ROLE_NAMES
MANAGER_ROLE_NAMES = {"manager", "moderator", "менеджер", "модератор"} | ADMIN_ROLE_NAMES
MASTER_ROLE_ID = 4
ADMIN_ROLE_IDS = {3, MASTER_ROLE_ID}
MANAGER_ROLE_IDS = {2, 3, MASTER_ROLE_ID}

IMAGE_DATA_URL_REGEX = re.compile(r"^data:(image/(png|jpeg|jpg|webp));base64,(.+)$", re.DOTALL)
IMAGE_MAX_BYTES = 5 * 1024 * 1024
IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}

SCHEMA_READY = False





def seed_master_role(db: Session) -> None:
    role = db.get(Role, MASTER_ROLE_ID)
    if not role:
        role = Role(role_id=MASTER_ROLE_ID, role_name="master_admin", description="Full platform owner access")
        db.add(role)
        db.flush()

    set_role_permissions(db, MASTER_ROLE_ID, PERMISSION_KEYS)

    master_user_id = os.getenv("MASTER_ADMIN_USER_ID")
    master_tg_id = os.getenv("MASTER_ADMIN_TG_ID")
    master_username = os.getenv("MASTER_ADMIN_USERNAME")

    user = None
    if master_user_id:
        user = db.get(User, int(master_user_id))
    if not user and master_tg_id:
        user = db.scalar(select(User).where(User.user_tg_id == int(master_tg_id)))
    if not user and master_username:
        user = db.scalar(select(User).where(User.username == master_username))

    if user and user.role_id != MASTER_ROLE_ID:
        user.role_id = MASTER_ROLE_ID


def normalize_role_name(user: User) -> str:
    if user.role and user.role.role_name:
        return user.role.role_name.strip().lower()
    return ""


def user_is_master(user: User) -> bool:
    return user.role_id == MASTER_ROLE_ID or normalize_role_name(user) in MASTER_ROLE_NAMES


def user_is_admin(user: User) -> bool:
    return user.role_id in ADMIN_ROLE_IDS or normalize_role_name(user) in ADMIN_ROLE_NAMES


def user_is_manager(user: User) -> bool:
    return user.role_id in MANAGER_ROLE_IDS or normalize_role_name(user) in MANAGER_ROLE_NAMES


def get_role_permissions(db: Session, role_id: int) -> list[str]:
    return [
        row.permission_key
        for row in db.scalars(
            select(RolePermission).where(RolePermission.role_id == role_id)
        ).all()
    ]


def set_role_permissions(db: Session, role_id: int, permissions: list[str]) -> None:
    valid_permissions = [permission for permission in permissions if permission in PERMISSION_KEYS]
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete(synchronize_session=False)
    for permission in valid_permissions:
        db.add(RolePermission(role_id=role_id, permission_key=permission))


def user_permissions(db: Session, user: User) -> list[str]:
    if user_is_master(user) or user_is_admin(user):
        return list(PERMISSION_KEYS)

    permissions = get_role_permissions(db, user.role_id)
    if user_is_manager(user):
        permissions = sorted(set(permissions) | {"dashboard.view", "reports.manage"})

    return permissions


def user_has_permission(db: Session, user: User, permission: str) -> bool:
    return permission in user_permissions(db, user)


def require_permission(db: Session, user: User, permission: str) -> None:
    if not user_has_permission(db, user, permission):
        raise HTTPException(status_code=403, detail=f"Permission required: {permission}")


def log_audit(
    db: Session,
    actor_user_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    payload: dict[str, Any] | None = None,
) -> AuditLog:
    item = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        payload_json=json.dumps(payload, ensure_ascii=False, default=str) if payload else None,
    )
    db.add(item)
    db.flush()
    return item


def record_sanction(
    db: Session,
    user_id: int,
    moderator_id: int | None,
    action: str,
    reason: str | None = None,
    report_id: int | None = None,
) -> UserSanction:
    sanction = UserSanction(
        user_id=user_id,
        moderator_id=moderator_id,
        action=action,
        reason=reason,
        report_id=report_id,
    )
    db.add(sanction)
    db.flush()
    return sanction


def parse_payload_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return loaded if isinstance(loaded, dict) else {}


def get_profile_badge_achievement_id(db: Session, user_id: int) -> int | None:
    value = db.scalar(
        text("SELECT profile_badge_achievement_id FROM users WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    return int(value) if value is not None else None


def set_profile_badge_achievement_id(db: Session, user_id: int, achievement_id: int | None) -> None:
    db.execute(
        text("""
            UPDATE users
            SET profile_badge_achievement_id = :achievement_id
            WHERE user_id = :user_id
        """),
        {"achievement_id": achievement_id, "user_id": user_id},
    )


def get_visible_profile_badges(db: Session, user_ids: list[int] | set[int]) -> dict[int, dict[str, Any]]:
    normalized_user_ids = sorted({int(user_id) for user_id in user_ids if user_id})
    if not normalized_user_ids:
        return {}

    rows = db.execute(
        text("""
            SELECT
                u.user_id,
                u.profile_badge_achievement_id AS achievement_id,
                a.title,
                a.image_url
            FROM users u
            JOIN user_achievements ua
                ON ua.user_id = u.user_id
                AND ua.achievement_id = u.profile_badge_achievement_id
                AND ua.is_visible = 1
            JOIN achievements a
                ON a.achievement_id = u.profile_badge_achievement_id
                AND a.is_active = 1
            WHERE u.user_id IN :user_ids
                AND u.is_active = 1
                AND u.profile_badge_achievement_id IS NOT NULL
        """).bindparams(bindparam("user_ids", expanding=True)),
        {"user_ids": normalized_user_ids},
    ).mappings().all()

    return {
        int(row["user_id"]): {
            "achievement_id": int(row["achievement_id"]),
            "title": row["title"],
            "image_url": row["image_url"],
        }
        for row in rows
    }


def images_root() -> Path:
    backend_root = Path(__file__).resolve().parents[1]
    project_root = backend_root.parent
    backend_images = backend_root / "images"
    if backend_images.exists():
        return backend_images
    return project_root / "images"


def decode_image_data_url(data_url: str) -> tuple[bytes, str]:
    if not data_url:
        raise HTTPException(status_code=400, detail="Image is required")

    data_url = data_url.strip()

    match = IMAGE_DATA_URL_REGEX.fullmatch(data_url)
    if not match:
        raise HTTPException(status_code=400, detail="Image must be PNG, JPG, or WEBP")

    mime_type = match.group(1).lower().replace("image/jpg", "image/jpeg")
    image_data = match.group(3).strip()

    candidates = [
        image_data,
        re.sub(r"[\r\n]+", "", image_data).replace(" ", "+").replace("\t", "+"),
        re.sub(r"\s+", "", image_data),
    ]

    image_bytes = None
    last_error: Exception | None = None

    for candidate in dict.fromkeys(candidates):
        candidate = candidate.strip()
        candidate = candidate + ("=" * (-len(candidate) % 4))

        try:
            image_bytes = base64.b64decode(candidate, validate=True)
            break
        except (ValueError, binascii.Error) as exc:
            last_error = exc

    if image_bytes is None:
        raise HTTPException(
            status_code=400,
            detail="Image is not valid base64 data",
        ) from last_error

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image cannot be empty")

    if len(image_bytes) > IMAGE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    try:
        from io import BytesIO

        with Image.open(BytesIO(image_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise HTTPException(status_code=400, detail="Image file is invalid") from exc

    return image_bytes, IMAGE_EXTENSIONS[mime_type]


def save_image_data_url(data_url: str, folder: str, prefix: str) -> str:
    image_bytes, extension = decode_image_data_url(data_url)
    safe_prefix = re.sub(r"[^a-zA-Z0-9_-]+", "_", prefix.strip().lower()).strip("_") or "image"
    filename = f"{safe_prefix}_{uuid4().hex}{extension}"
    output_dir = images_root() / folder
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / filename).write_bytes(image_bytes)
    return filename


def moderation_to_dict(item: ModerationQueueItem) -> dict[str, Any]:
    return {
        "moderation_id": item.moderation_id,
        "item_type": item.item_type,
        "action": item.action,
        "target_kind": item.target_kind,
        "target_id": item.target_id,
        "submitted_by": item.submitted_by,
        "reviewed_by": item.reviewed_by,
        "status": item.status,
        "image_data_url": item.image_data_url,
        "payload": parse_payload_json(item.payload_json),
        "reason": item.reason,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
    }


def _get_profile_picture_dir() -> Path:
    backend_images_dir = Path(__file__).resolve().parents[1] / "images" / "pfps"
    repo_images_dir = Path(__file__).resolve().parents[2] / "images" / "pfps"

    for candidate in (backend_images_dir, repo_images_dir):
        if candidate.exists():
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate

    repo_images_dir.mkdir(parents=True, exist_ok=True)
    return repo_images_dir

def _get_moderation_image_dir(item_type: str, target_kind: str | None) -> Path:
    folder_by_target_kind = {
        "collections": "collections",
        "models": "models",
        "backgrounds": "bgs",
        "symbols": "symbols",
        "users": "pfps",
    }

    if item_type == "profile_photo":
        folder = "pfps"
    else:
        folder = folder_by_target_kind.get(target_kind or "", "moderation")

    image_dir = images_root() / folder
    image_dir.mkdir(parents=True, exist_ok=True)
    return image_dir


def create_moderation_item(
    db: Session,
    item_type: str,
    action: str,
    payload: dict[str, Any],
    submitted_by: int | None,
    image_data_url: str | None = None,
    target_kind: str | None = None,
    target_id: int | None = None,
) -> ModerationQueueItem:
    saved_image_filename = None

    if image_data_url:
        image_bytes, extension = decode_image_data_url(image_data_url)

        image_dir = _get_moderation_image_dir(item_type, target_kind)
        saved_image_filename = f"{uuid.uuid4().hex}{extension}"
        image_path = image_dir / saved_image_filename

        print("SAVING MODERATION IMAGE TO:", image_path, flush=True)
        image_path.write_bytes(image_bytes)
        print("IMAGE EXISTS AFTER SAVE:", image_path.exists(), image_path.stat().st_size, flush=True)

    item = ModerationQueueItem(
        item_type=item_type,
        action=action,
        target_kind=target_kind,
        target_id=target_id,
        submitted_by=submitted_by,
        status="pending",
        image_data_url=saved_image_filename,
        payload_json=json.dumps(
            {
                **payload,
                **({"new_image": saved_image_filename} if saved_image_filename else {}),
            },
            ensure_ascii=False,
            default=str,
        ),
    )

    db.add(item)
    db.flush()
    return item


def audit_to_dict(item: AuditLog) -> dict[str, Any]:
    return {
        "audit_id": item.audit_id,
        "actor_user_id": item.actor_user_id,
        "action": item.action,
        "entity_type": item.entity_type,
        "entity_id": item.entity_id,
        "payload": parse_payload_json(item.payload_json),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def sanction_to_dict(item: UserSanction) -> dict[str, Any]:
    return {
        "sanction_id": item.sanction_id,
        "user_id": item.user_id,
        "moderator_id": item.moderator_id,
        "action": item.action,
        "reason": item.reason,
        "report_id": item.report_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }

