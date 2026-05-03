from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from core.models import ListingStatuses, Present, Listing


def format_price(value: Decimal | None) -> str | None:
    if value is None:
        return None

    return str(value)


def estimate_price(db: Session, present_id: int):
    curr_present = db.scalar(select(Present).where(Present.present_id == present_id))
    
    if not curr_present:
        raise HTTPException(status_code=404, detail="Present not found")

    avg_price, min_price, max_price, listings_count = db.execute(
        select(
            func.avg(Listing.price),
            func.min(Listing.price),
            func.max(Listing.price),
            func.count(Listing.listing_id),
        ).where(
            Listing.present.has(Present.collection_id == curr_present.collection_id),
            Listing.status.has(ListingStatuses.status_name == "active"),
        )
    ).one()

    return {
        "avg_price": format_price(avg_price),
        "low_price": format_price(min_price),
        "high_price": format_price(max_price),
        "listings_count": listings_count,
    }
