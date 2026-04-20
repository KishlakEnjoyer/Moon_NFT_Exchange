from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.models import User
from core.request_models import SendGiftRequest
from services.gift_service import purchase_and_send_gift


gift_router = APIRouter(
    prefix="/gifts",
    tags=["gifts"],
)





@gift_router.post("/send")
def send_gift(
    payload: SendGiftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if payload.sender_id is not None and payload.sender_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Cannot send gifts as another user")

        return purchase_and_send_gift(
            db=db,
            sender_id=current_user.user_id,
            receiver_id=payload.receiver_id,
            collection_id=payload.collection_id,
            description=payload.description,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
