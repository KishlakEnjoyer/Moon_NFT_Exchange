from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from core.database import engine
from core.models import Notification, NotificationTypes, User
from utils.vk_bot import send_vk_message_sync
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


def _notification_vk_message(
    type_name: str,
    entity_type: str | None,
    entity_id: int | None,
    payload: dict | None,
    type_description: str | None,
) -> str:
    payload = payload or {}

    if type_name == "achievement_unlocked":
        title = payload.get("title") or "новое достижение"
        description = payload.get("description")
        return f"Moon NFT Exchange\nДостижение получено: {title}" + (f"\n{description}" if description else "")

    if type_name == NOTIFICATION_TYPE_REPORT_WARNING:
        reason = payload.get("reason_ru") or payload.get("reason") or "проверьте предупреждение в профиле"
        return f"Moon NFT Exchange\nПредупреждение модерации: {reason}"

    title_by_type = {
        NOTIFICATION_TYPE_PURCHASE: "Покупка подтверждена. Лот добавлен в вашу коллекцию.",
        NOTIFICATION_TYPE_SALE: "Подарок продан. Средства начислены на баланс.",
        NOTIFICATION_TYPE_UPGRADE: "Апгрейд завершен. Подарок готов к продаже или коллекции.",
        NOTIFICATION_TYPE_LISTING_SOLD: "Подарок продан. Средства начислены на баланс.",
        NOTIFICATION_TYPE_LISTING_CANCELLED: "Лот снят с продажи.",
        NOTIFICATION_TYPE_NEW_COLLECTION: "Доступна новая коллекция.",
        NOTIFICATION_TYPE_BURN: "Подарок сожжен. Возврат начислен на баланс.",
        NOTIFICATION_TYPE_TOPUP: "Баланс пополнен.",
        NOTIFICATION_TYPE_SYSTEM: "Новое системное уведомление.",
        NOTIFICATION_TYPE_LOGIN: "Вход подтвержден.",
        NOTIFICATION_TYPE_GIFT_RECEIVED: "Вы получили подарок.",
        "profile_photo_approved": "Фото профиля одобрено.",
        "profile_photo_rejected": "Фото профиля отклонено.",
    }
    title = title_by_type.get(type_name) or type_description or "Новое уведомление."
    entity = f"\n{entity_type} #{entity_id}" if entity_type and entity_id else ""
    return f"Moon NFT Exchange\n{title}{entity}"


def send_vk_notification_safely(
    db: Session,
    user_id: int,
    type_name: str,
    entity_type: str | None,
    entity_id: int | None,
    payload: dict | None,
    type_description: str | None,
) -> None:
    try:
        user = db.get(User, user_id)
        if not user or not user.user_vk_id:
            return

        send_vk_message_sync(
            user.user_vk_id,
            _notification_vk_message(type_name, entity_type, entity_id, payload, type_description),
        )
    except Exception:
        pass


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
    send_vk_notification_safely(
        db=db,
        user_id=user_id,
        type_name=type_name,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
        type_description=type_description or notification_type.description,
    )

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
