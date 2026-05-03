from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from services.price_estimation_service import estimate_price

price_estimate_router = APIRouter(
    prefix="/price-estimate",
    tags=["price-estimate"],
)


@price_estimate_router.get("/pricing/present/{present_id}")
def get_price_estimate(present_id: int, db: Session = Depends(get_db)):
    return estimate_price(db, present_id)
