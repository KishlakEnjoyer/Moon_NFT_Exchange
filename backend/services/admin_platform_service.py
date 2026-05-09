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

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from core.database import engine
from core.models import (
    AuditLog,
    FeaturedCollection,
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
    "featured.manage",
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
    "featured.manage": "Featured collections",
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


def ensure_admin_platform_schema() -> None:
    global SCHEMA_READY
    if SCHEMA_READY:
        return

    statements = [
        """
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id SMALLINT NOT NULL,
            permission_key VARCHAR(100) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_id, permission_key),
            CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
                REFERENCES roles(role_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_follows (
            follower_id BIGINT NOT NULL,
            following_id BIGINT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id),
            INDEX idx_user_follows_following (following_id),
            CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id)
                REFERENCES users(user_id) ON DELETE CASCADE,
            CONSTRAINT fk_user_follows_following FOREIGN KEY (following_id)
                REFERENCES users(user_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS achievements (
            achievement_id BIGINT NOT NULL AUTO_INCREMENT,
            title VARCHAR(120) NOT NULL,
            description VARCHAR(500) NOT NULL,
            image_url VARCHAR(255) NULL,
            rule_key VARCHAR(64) NULL,
            rule_value INT NULL,
            is_active SMALLINT NOT NULL DEFAULT 1,
            created_by BIGINT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (achievement_id),
            INDEX idx_achievements_rule (rule_key),
            CONSTRAINT fk_achievements_created_by FOREIGN KEY (created_by)
                REFERENCES users(user_id) ON DELETE SET NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_achievements (
            user_id BIGINT NOT NULL,
            achievement_id BIGINT NOT NULL,
            is_visible SMALLINT NOT NULL DEFAULT 1,
            awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, achievement_id),
            CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id)
                REFERENCES users(user_id) ON DELETE CASCADE,
            CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id)
                REFERENCES achievements(achievement_id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            audit_id BIGINT NOT NULL AUTO_INCREMENT,
            actor_user_id BIGINT NULL,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(80) NULL,
            entity_id VARCHAR(80) NULL,
            payload_json TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (audit_id),
            INDEX idx_audit_actor (actor_user_id),
            INDEX idx_audit_created (created_at),
            CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id)
                REFERENCES users(user_id) ON DELETE SET NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_sanctions (
            sanction_id BIGINT NOT NULL AUTO_INCREMENT,
            user_id BIGINT NOT NULL,
            moderator_id BIGINT NULL,
            action VARCHAR(50) NOT NULL,
            reason VARCHAR(255) NULL,
            report_id BIGINT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (sanction_id),
            INDEX idx_sanctions_user (user_id),
            CONSTRAINT fk_sanctions_user FOREIGN KEY (user_id)
                REFERENCES users(user_id) ON DELETE CASCADE,
            CONSTRAINT fk_sanctions_moderator FOREIGN KEY (moderator_id)
                REFERENCES users(user_id) ON DELETE SET NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS moderation_queue (
            moderation_id BIGINT NOT NULL AUTO_INCREMENT,
            item_type VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            target_kind VARCHAR(50) NULL,
            target_id BIGINT NULL,
            submitted_by BIGINT NULL,
            reviewed_by BIGINT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            image_data_url MEDIUMTEXT NULL,
            payload_json TEXT NULL,
            reason VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            PRIMARY KEY (moderation_id),
            INDEX idx_moderation_status (status),
            INDEX idx_moderation_item_type (item_type),
            CONSTRAINT fk_moderation_submitter FOREIGN KEY (submitted_by)
                REFERENCES users(user_id) ON DELETE SET NULL,
            CONSTRAINT fk_moderation_reviewer FOREIGN KEY (reviewed_by)
                REFERENCES users(user_id) ON DELETE SET NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS featured_collections (
            collection_id BIGINT NOT NULL,
            display_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (collection_id),
            CONSTRAINT fk_featured_collection FOREIGN KEY (collection_id)
                REFERENCES collections(collection_id) ON DELETE CASCADE
        )
        """,
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    try:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN profile_badge_achievement_id BIGINT NULL"))
    except OperationalError as exc:
        message = str(exc.orig).lower()
        if "duplicate column" not in message and "1060" not in message:
            raise

    SCHEMA_READY = True


def seed_master_role(db: Session) -> None:
    ensure_admin_platform_schema()
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
    ensure_admin_platform_schema()
    return [
        row.permission_key
        for row in db.scalars(
            select(RolePermission).where(RolePermission.role_id == role_id)
        ).all()
    ]


def set_role_permissions(db: Session, role_id: int, permissions: list[str]) -> None:
    ensure_admin_platform_schema()
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
    ensure_admin_platform_schema()
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
    ensure_admin_platform_schema()
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
    ensure_admin_platform_schema()
    value = db.scalar(
        text("SELECT profile_badge_achievement_id FROM users WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    return int(value) if value is not None else None


def set_profile_badge_achievement_id(db: Session, user_id: int, achievement_id: int | None) -> None:
    ensure_admin_platform_schema()
    db.execute(
        text("""
            UPDATE users
            SET profile_badge_achievement_id = :achievement_id
            WHERE user_id = :user_id
        """),
        {"achievement_id": achievement_id, "user_id": user_id},
    )


def images_root() -> Path:
    backend_root = Path(__file__).resolve().parents[1]
    project_root = backend_root.parent
    backend_images = backend_root / "images"
    if backend_images.exists():
        return backend_images
    return project_root / "images"


def decode_image_data_url(data_url: str) -> tuple[bytes, str]:
    match = IMAGE_DATA_URL_REGEX.fullmatch(data_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail="Image must be PNG, JPG, or WEBP")

    mime_type = match.group(1).replace("image/jpg", "image/jpeg")
    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=400, detail="Image is not valid base64 data") from exc

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image cannot be empty")
    if len(image_bytes) > IMAGE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    try:
        from io import BytesIO

        with Image.open(BytesIO(image_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
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
    ensure_admin_platform_schema()
    if image_data_url:
        decode_image_data_url(image_data_url)

    item = ModerationQueueItem(
        item_type=item_type,
        action=action,
        target_kind=target_kind,
        target_id=target_id,
        submitted_by=submitted_by,
        status="pending",
        image_data_url=image_data_url,
        payload_json=json.dumps(payload, ensure_ascii=False, default=str),
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


def featured_to_dict(row: FeaturedCollection, collection_name: str | None, image_url: str | None) -> dict[str, Any]:
    return {
        "collection_id": row.collection_id,
        "collection_name": collection_name,
        "collection_image_url": image_url,
        "display_order": row.display_order,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
