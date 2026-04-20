from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, update

from core.auth import get_current_user, get_user_id_from_token
from core.database import get_db
from core.models import Notification, User
from services.notification_service import manager

notification_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notification_router.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        token_user_id = get_user_id_from_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return

    if token_user_id != user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@notification_router.get("/{user_id}")
def get_notifications(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's notifications")

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
def mark_all_read(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's notifications")

    db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == 0)
        .values(is_read=1)
    )
    db.commit()
    return {"ok": True}


@notification_router.post("/{notification_id}/read")
def mark_one_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        update(Notification)
        .where(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id,
        )
        .values(is_read=1)
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.commit()
    return {"ok": True}
