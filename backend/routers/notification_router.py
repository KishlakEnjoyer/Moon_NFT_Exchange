from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, update
from core.database import get_db
from core.models import Notification, User
from services.notification_service import manager

notification_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notification_router.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@notification_router.get("/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .options(joinedload(Notification.notification_type))
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()

    return [
        {
            "notification_id": n.notification_id,
            "type": n.notification_type.type_name,
            "description": n.notification_type.description,
            "entity_type": n.entity_type,
            "entity_id": n.entity_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@notification_router.post("/{user_id}/read-all")
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == 0)
        .values(is_read=1)
    )
    db.commit()
    return {"ok": True}


@notification_router.post("/{notification_id}/read")
def mark_one_read(notification_id: int, db: Session = Depends(get_db)):
    db.execute(
        update(Notification)
        .where(Notification.notification_id == notification_id)
        .values(is_read=1)
    )
    db.commit()
    return {"ok": True}