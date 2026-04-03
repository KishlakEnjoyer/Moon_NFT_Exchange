from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import select
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


def create_notification(
    db: Session,
    user_id: int,
    type_name: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Notification:
    notification_type = db.scalar(
        select(NotificationTypes).where(NotificationTypes.type_name == type_name)
    )
    if not notification_type:
        raise ValueError(f"Notification type '{type_name}' not found in DB")

    notification = Notification(
        user_id=user_id,
        type_id=notification_type.type_id,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=0,
    )
    db.add(notification)
    db.flush()

    db.refresh(notification)
    notification.notification_type = notification_type

    return notification


def notification_to_dict(notification: Notification) -> dict:
    return {
        "notification_id": notification.notification_id,
        "type": notification.notification_type.type_name,
        "description": notification.notification_type.description,
        "entity_type": notification.entity_type,
        "entity_id": notification.entity_id,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }