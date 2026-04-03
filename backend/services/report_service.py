from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.models import Report, ReportType


def submit_report(
    db: Session,
    sender_id: int,
    receiver_id: int,
    report_type_id: int,
):
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    existing = (
        db.query(Report)
        .filter(
            Report.sender_id == sender_id,
            Report.receiver_id == receiver_id,
            Report.report_type_id == report_type_id,
            Report.report_status_id == 1,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this report")

    report = Report(
        sender_id=sender_id,
        receiver_id=receiver_id,
        report_type_id=report_type_id,
        report_status_id=1,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "report_id": report.report_id,
        "sender_id": report.sender_id,
        "receiver_id": report.receiver_id,
        "report_type_id": report.report_type_id,
        "report_status_id": report.report_status_id,
        "created_at": report.created_at.isoformat(),
    }


def get_report_types(db: Session):
    types = db.query(ReportType).all()
    return [{"report_type_id": t.report_type_id, "report_type_title": t.report_type_title} for t in types]
