from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.models import User
from services.report_service import submit_report, get_report_types


report_router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)


class SubmitReportRequest(BaseModel):
    sender_id: int | None = None
    receiver_id: int
    report_type_id: int


@report_router.post("/submit")
def create_report(
    payload: SubmitReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if payload.sender_id is not None and payload.sender_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Cannot submit reports as another user")

        return submit_report(
            db=db,
            sender_id=current_user.user_id,
            receiver_id=payload.receiver_id,
            report_type_id=payload.report_type_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@report_router.get("/types")
def fetch_report_types(db: Session = Depends(get_db)):
    return get_report_types(db)
