from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, select
from typing import List
from pydantic import BaseModel
from decimal import Decimal

from core.auth import get_current_user
from core.database import get_db
from core.models import ActiveListingsView, CartItem, Listing, ListingStatuses, Present, User, CurrentOwner
from services.listing_purchase_service import buy_listing as buy_listing_service
from services.smart_search_service import SmartSearchItem, smart_search_service

listings_router = APIRouter(prefix="/listings", tags=["listings"])


class ListingResponse(BaseModel):
    listing_id: int
    price: str
    present_id: int
    present_num: int
    present_image_url: str | None
    collection_id: int
    collection_name: str
    model_name: str | None
    background_image_url: str | None
    symbol_name: str | None
    seller_id: int
    seller_username: str | None
    seller_profile_pic_url: str | None
    seller_wallet: str | None

    class Config:
        from_attributes = True


class CreateListingRequest(BaseModel):
    present_id: int
    seller_id: int | None = None
    price: str


class CreateListingResponse(BaseModel):
    listing_id: int
    present_id: int
    price: str


class CancelListingResponse(BaseModel):
    listing_id: int
    present_id: int
    status: str


class BuyListingResponse(BaseModel):
    listing_id: int
    present_id: int
    buyer_id: int
    seller_id: int
    price: str
    platform_fee: str
    seller_received: str
    buyer_tx_hash: str
    seller_tx_hash: str | None
    new_balance: str | None
    seller_new_balance: str | None


def get_listing_status_id(db: Session, status_name: str) -> int:
    status_id = db.scalar(
        select(ListingStatuses.status_id).where(ListingStatuses.status_name == status_name)
    )
    if status_id is None:
        raise HTTPException(status_code=500, detail=f"Listing status '{status_name}' not found")

    return status_id


def parse_csv_ids(value: str | None, field_name: str) -> list[int]:
    if not value:
        return []

    try:
        return [int(item.strip()) for item in value.split(",") if item.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}") from exc


def apply_listing_sort(query, sort: str | None):
    if sort == "price_desc":
        return query.order_by(ActiveListingsView.price.desc())

    if sort == "price_asc":
        return query.order_by(ActiveListingsView.price.asc())

    if sort == "newest":
        return query.order_by(ActiveListingsView.listed_at.desc())

    return query


def sort_listing_rows(listings: list[ActiveListingsView], sort: str | None) -> list[ActiveListingsView]:
    if sort == "price_desc":
        return sorted(listings, key=lambda listing: listing.price, reverse=True)

    if sort == "price_asc":
        return sorted(listings, key=lambda listing: listing.price)

    if sort == "newest":
        return sorted(listings, key=lambda listing: listing.listed_at, reverse=True)

    return listings


def make_listing_responses(db: Session, listings: list[ActiveListingsView]) -> list[ListingResponse]:
    present_ids = [l.present_id for l in listings]
    seller_ids = [l.seller_id for l in listings]
    present_num_by_id = {}
    seller_profile_pic_by_id = {}

    if present_ids:
        present_num_by_id = {
            present.present_id: present.present_num
            for present in (
                db.query(Present.present_id, Present.present_num)
                .filter(Present.present_id.in_(present_ids))
                .all()
            )
        }
    if seller_ids:
        seller_profile_pic_by_id = {
            user.user_id: user.profile_pic_url
            for user in (
                db.query(User.user_id, User.profile_pic_url)
                .filter(User.user_id.in_(seller_ids))
                .all()
            )
        }

    return [
        ListingResponse(
            listing_id=l.listing_id,
            price=str(l.price),
            present_id=l.present_id,
            present_num=present_num_by_id.get(l.present_id, l.present_id),
            present_image_url=l.present_image_url,
            collection_id=l.collection_id,
            collection_name=l.collection_name,
            model_name=l.model_name,
            background_image_url=l.background_image_url,
            symbol_name=l.symbol_name,
            seller_id=l.seller_id,
            seller_username=l.seller_username,
            seller_profile_pic_url=seller_profile_pic_by_id.get(l.seller_id),
            seller_wallet=l.seller_wallet,
        )
        for l in listings
    ]


@listings_router.get("/active", response_model=List[ListingResponse])
def get_active_listings(
    search: str | None = Query(default=None, max_length=120),
    smart: bool = Query(default=False),
    top_k: int | None = Query(default=None, ge=1, le=100),
    collection_ids: str | None = Query(default=None),
    model_ids: str | None = Query(default=None),
    background_ids: str | None = Query(default=None),
    symbol_ids: str | None = Query(default=None),
    price_min: Decimal | None = Query(default=None, ge=0),
    price_max: Decimal | None = Query(default=None, ge=0),
    sort: str | None = Query(default=None, pattern="^(price_desc|price_asc|newest)$"),
    db: Session = Depends(get_db),
):
    search_text = search.strip() if search else ""
    collection_id_values = parse_csv_ids(collection_ids, "collection_ids")
    model_id_values = parse_csv_ids(model_ids, "model_ids")
    background_id_values = parse_csv_ids(background_ids, "background_ids")
    symbol_id_values = parse_csv_ids(symbol_ids, "symbol_ids")

    if price_min is not None and price_max is not None and price_min > price_max:
        raise HTTPException(status_code=400, detail="price_min cannot be greater than price_max")

    query = (
        db.query(ActiveListingsView)
        .join(User, ActiveListingsView.seller_id == User.user_id)
        .filter(User.is_active == 1)
    )
    needs_present_join = bool(model_id_values or background_id_values or symbol_id_values)

    if needs_present_join:
        query = query.join(Present, ActiveListingsView.present_id == Present.present_id)

    if collection_id_values:
        query = query.filter(ActiveListingsView.collection_id.in_(collection_id_values))

    if model_id_values:
        query = query.filter(Present.model_id.in_(model_id_values))

    if background_id_values:
        query = query.filter(Present.background_id.in_(background_id_values))

    if symbol_id_values:
        query = query.filter(Present.symbol_id.in_(symbol_id_values))

    if price_min is not None:
        query = query.filter(ActiveListingsView.price >= price_min)

    if price_max is not None:
        query = query.filter(ActiveListingsView.price <= price_max)

    if search_text and not smart:
        pattern = f"%{search_text}%"
        query = query.filter(
            or_(
                ActiveListingsView.collection_name.ilike(pattern),
                ActiveListingsView.model_name.ilike(pattern),
                ActiveListingsView.symbol_name.ilike(pattern),
                ActiveListingsView.seller_username.ilike(pattern),
            )
        )

    if not (search_text and smart):
        query = apply_listing_sort(query, sort)

    listings = query.all()

    if search_text and smart:
        search_items = [
            SmartSearchItem(id=listing.listing_id, image_url=listing.present_image_url)
            for listing in listings
        ]

        try:
            results = smart_search_service.search(search_text, search_items, top_k=top_k)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Smart search unavailable: {exc}") from exc

        listings_by_id = {listing.listing_id: listing for listing in listings}
        listings = [
            listings_by_id[result.id]
            for result in results
            if result.id in listings_by_id
        ]
        listings = sort_listing_rows(listings, sort)

    return make_listing_responses(db, listings)


@listings_router.post("/create", response_model=CreateListingResponse)
def create_listing(
    req: CreateListingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.seller_id is not None and req.seller_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot create listings for another user")

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
            CurrentOwner.owner_id == current_user.user_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    existing = db.scalar(
        select(Listing).where(
            Listing.present_id == req.present_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Present is already listed for sale")

    price = Decimal(req.price)
    if price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")

    listing = Listing(
        present_id=req.present_id,
        seller_id=current_user.user_id,
        status_id=get_listing_status_id(db, "active"),
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


@listings_router.post("/{present_id}/cancel", response_model=CancelListingResponse)
def cancel_listing(
    present_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.scalar(
        select(Listing).where(
            Listing.present_id == present_id,
            Listing.seller_id == current_user.user_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
        )
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Active listing not found")

    listing.status_id = get_listing_status_id(db, "cancelled")
    db.query(CartItem).filter(CartItem.listing_id == listing.listing_id).delete()
    db.commit()
    db.refresh(listing)

    return CancelListingResponse(
        listing_id=listing.listing_id,
        present_id=listing.present_id,
        status="cancelled",
    )


@listings_router.post("/{listing_id}/buy", response_model=BuyListingResponse)
def buy_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return buy_listing_service(db=db, buyer=current_user, listing_id=listing_id)
