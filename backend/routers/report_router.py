from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from services.report_service import submit_report, get_report_types


report_router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)


class SubmitReportRequest(BaseModel):
    sender_id: int
    receiver_id: int
    report_type_id: int


@report_router.post("/submit")
def create_report(payload: SubmitReportRequest, db: Session = Depends(get_db)):
    try:
        return submit_report(
            db=db,
            sender_id=payload.sender_id,
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
