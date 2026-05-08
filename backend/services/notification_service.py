from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from core.database import engine
from core.models import Notification, NotificationTypes
import json

NOTIFICATION_TYPE_PURCHASE           = "purchase_confirmed"
NOTIFICATION_TYPE_SALE               = "sale_completed"
NOTIFICATION_TYPE_UPGRADE            = "upgrade_completed"
NOTIFICATION_TYPE_LISTING_SOLD       = "listing_sold"
NOTIFICATION_TYPE_LISTING_CANCELLED  = "listing_cancelled"
NOTIFICATION_TYPE_NEW_COLLECTION     = "new_collection"
NOTIFICATION_TYPE_BURN               = "burn_completed"
NOTIFICATION_TYPE_TOPUP              = "wallet_topup"
NOTIFICATION_TYPE_SYSTEM             = "system"
NOTIFICATION_TYPE_LOGIN              = "login"
NOTIFICATION_TYPE_GIFT_RECEIVED      = "gift_received"
NOTIFICATION_TYPE_REPORT_WARNING     = "report_warning"

notification_payload_column_checked = False


class NotificationManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, data: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                self.disconnect(user_id)


manager = NotificationManager()


def ensure_notification_payload_column(db: Session) -> None:
    global notification_payload_column_checked
    if notification_payload_column_checked:
        return

    try:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE notifications ADD COLUMN payload_json TEXT NULL"))
    except OperationalError as exc:
        message = str(exc.orig).lower()
        if "duplicate column" not in message and "1060" not in message:
            raise

    notification_payload_column_checked = True


def create_notification(
    db: Session,
    user_id: int,
    type_name: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    payload: dict | None = None,
    type_description: str | None = None,
    create_type_if_missing: bool = False,
) -> Notification:
    ensure_notification_payload_column(db)
    notification_type = db.scalar(
        select(NotificationTypes).where(NotificationTypes.type_name == type_name)
    )
    if not notification_type:
        if not create_type_if_missing:
            raise ValueError(f"Notification type '{type_name}' not found in DB")

        notification_type = NotificationTypes(
            type_name=type_name,
            description=type_description,
        )
        db.add(notification_type)
        db.flush()

    notification = Notification(
        user_id=user_id,
        type_id=notification_type.type_id,
        entity_type=entity_type,
        entity_id=entity_id,
        payload_json=json.dumps(payload, ensure_ascii=False) if payload else None,
        is_read=0,
    )
    db.add(notification)
    db.flush()

    db.refresh(notification)
    notification.notification_type = notification_type

    return notification


def notification_to_dict(notification: Notification) -> dict:
    payload = None
    if notification.payload_json:
        try:
            payload = json.loads(notification.payload_json)
        except (TypeError, json.JSONDecodeError):
            payload = None

    return {
        "notification_id": notification.notification_id,
        "type": notification.notification_type.type_name,
        "description": notification.notification_type.description,
        "entity_type": notification.entity_type,
        "entity_id": notification.entity_id,
        "payload": payload,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }
