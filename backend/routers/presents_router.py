from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_db
from core.models import Present, CurrentOwner

presents_router = APIRouter(prefix="/presents", tags=["presents"])


class ToggleVisibilityResponse(BaseModel):
    present_id: int
    is_visible: int


@presents_router.post("/{present_id}/toggle-visibility", response_model=ToggleVisibilityResponse)
def toggle_present_visibility(present_id: int, user_id: int, db: Session = Depends(get_db)):
    present = db.scalar(select(Present).where(Present.present_id == present_id))
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    owner = db.scalar(
        select(CurrentOwner).where(
            CurrentOwner.present_id == present_id,
            CurrentOwner.owner_id == user_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    present.is_visible = 0 if present.is_visible == 1 else 1
    db.commit()
    db.refresh(present)

    return ToggleVisibilityResponse(
        present_id=present.present_id,
        is_visible=present.is_visible,
    )
