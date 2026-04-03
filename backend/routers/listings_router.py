from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from decimal import Decimal

from core.database import get_db
from core.models import ActiveListingsView, Listing, Present, User, CurrentOwner

listings_router = APIRouter(prefix="/listings", tags=["listings"])


class ListingResponse(BaseModel):
    listing_id: int
    price: str
    present_id: int
    token_id: str
    present_image_url: str | None
    collection_id: int
    collection_name: str
    blockchain_network: str
    model_name: str | None
    background_image_url: str | None
    symbol_name: str | None
    seller_id: int
    seller_username: str | None
    seller_wallet: str | None

    class Config:
        from_attributes = True


class CreateListingRequest(BaseModel):
    present_id: int
    seller_id: int
    price: str


class CreateListingResponse(BaseModel):
    listing_id: int
    present_id: int
    price: str


@listings_router.get("/active", response_model=List[ListingResponse])
def get_active_listings(db: Session = Depends(get_db)):
    listings = db.query(ActiveListingsView).all()
    return [
        ListingResponse(
            listing_id=l.listing_id,
            price=str(l.price),
            present_id=l.present_id,
            token_id=l.token_id,
            present_image_url=l.present_image_url,
            collection_id=l.collection_id,
            collection_name=l.collection_name,
            blockchain_network=l.blockchain_network,
            model_name=l.model_name,
            background_image_url=l.background_image_url,
            symbol_name=l.symbol_name,
            seller_id=l.seller_id,
            seller_username=l.seller_username,
            seller_wallet=l.seller_wallet,
        )
        for l in listings
    ]


@listings_router.post("/create", response_model=CreateListingResponse)
def create_listing(req: CreateListingRequest, db: Session = Depends(get_db)):
    present = db.scalar(select(Present).where(Present.present_id == req.present_id))
    if not present:
        raise HTTPException(status_code=404, detail="Present not found")

    if present.model_id is None:
        raise HTTPException(status_code=400, detail="Only upgraded presents can be listed for sale")

    if present.is_burned:
        raise HTTPException(status_code=400, detail="Burned presents cannot be listed")

    owner = db.scalar(
        select(CurrentOwner).where(
            CurrentOwner.present_id == req.present_id,
            CurrentOwner.owner_id == req.seller_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    existing = db.scalar(
        select(Listing).where(
            Listing.present_id == req.present_id,
            Listing.status_id == 1,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Present is already listed for sale")

    price = Decimal(req.price)
    if price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")

    listing = Listing(
        present_id=req.present_id,
        seller_id=req.seller_id,
        status_id=1,
        price=price,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    return CreateListingResponse(
        listing_id=listing.listing_id,
        present_id=listing.present_id,
        price=str(listing.price),
    )
