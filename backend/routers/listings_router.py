from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from typing import List
from pydantic import BaseModel
from decimal import Decimal

from core.auth import get_current_user, get_optional_current_user_any
from core.database import get_db
from core.models import (
    ActiveListingsView,
    CartItem,
    CurrentOwner,
    Listing,
    ListingStatuses,
    ListingView,
    Present,
    User,
)
from services.listing_purchase_service import buy_listing as buy_listing_service
from services.recommendation_service import get_recommended_listing_ids
from services.smart_search_service import SmartSearchItem, smart_search_service
from services.admin_platform_service import get_visible_profile_badges

listings_router = APIRouter(prefix="/listings", tags=["listings"])
MAX_LISTING_PRICE = Decimal("100000")


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
    seller_profile_badge_achievement_id: int | None = None
    seller_profile_badge_image_url: str | None = None
    seller_profile_badge_title: str | None = None
    seller_wallet: str | None
    views: int = 0

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


class ListingViewResponse(BaseModel):
    listing_id: int
    views: int
    counted: bool


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


def get_listing_view_counts(db: Session, listing_ids: list[int]) -> dict[int, int]:
    if not listing_ids:
        return {}

    return {
        listing_id: int(views_count)
        for listing_id, views_count in (
            db.query(ListingView.listing_id, func.count(ListingView.user_id))
            .filter(ListingView.listing_id.in_(listing_ids))
            .group_by(ListingView.listing_id)
            .all()
        )
    }


def apply_listing_sort(query, sort: str | None):
    if sort == "price_desc":
        return query.order_by(ActiveListingsView.price.desc())

    if sort == "price_asc":
        return query.order_by(ActiveListingsView.price.asc())

    if sort == "newest":
        return query.order_by(ActiveListingsView.listed_at.desc())

    if sort == "oldest":
        return query.order_by(ActiveListingsView.listed_at.asc())

    if sort == "most_viewed":
        views_subquery = (
            select(
                ListingView.listing_id,
                func.count(ListingView.user_id).label("views_count"),
            )
            .group_by(ListingView.listing_id)
            .subquery()
        )
        return (
            query
            .outerjoin(views_subquery, ActiveListingsView.listing_id == views_subquery.c.listing_id)
            .order_by(
                func.coalesce(views_subquery.c.views_count, 0).desc(),
                ActiveListingsView.listed_at.desc(),
                ActiveListingsView.listing_id.desc(),
            )
        )

    return query


def sort_listing_rows(
    listings: list[ActiveListingsView],
    sort: str | None,
    views_by_listing_id: dict[int, int] | None = None,
) -> list[ActiveListingsView]:
    if sort == "price_desc":
        return sorted(listings, key=lambda listing: listing.price, reverse=True)

    if sort == "price_asc":
        return sorted(listings, key=lambda listing: listing.price)

    if sort == "newest":
        return sorted(listings, key=lambda listing: listing.listed_at, reverse=True)

    if sort == "oldest":
        return sorted(listings, key=lambda listing: listing.listed_at)

    if sort == "most_viewed":
        views = views_by_listing_id or {}
        return sorted(
            listings,
            key=lambda listing: (
                views.get(listing.listing_id, 0),
                listing.listed_at,
                listing.listing_id,
            ),
            reverse=True,
        )

    return listings


def make_listing_responses(db: Session, listings: list[ActiveListingsView]) -> list[ListingResponse]:
    present_ids = [l.present_id for l in listings]
    seller_ids = [l.seller_id for l in listings]
    listing_ids = [l.listing_id for l in listings]
    present_num_by_id = {}
    seller_profile_pic_by_id = {}
    seller_profile_badge_by_id = {}
    views_by_listing_id = {}

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
        seller_profile_badge_by_id = get_visible_profile_badges(db, set(seller_ids))
    views_by_listing_id = get_listing_view_counts(db, listing_ids)

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
            seller_profile_badge_achievement_id=seller_profile_badge_by_id.get(l.seller_id, {}).get("achievement_id"),
            seller_profile_badge_image_url=seller_profile_badge_by_id.get(l.seller_id, {}).get("image_url"),
            seller_profile_badge_title=seller_profile_badge_by_id.get(l.seller_id, {}).get("title"),
            seller_wallet=l.seller_wallet,
            views=views_by_listing_id.get(l.listing_id, 0),
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
    sort: str | None = Query(default="newest", pattern="^(price_desc|price_asc|newest|oldest|most_viewed)$"),
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
            print("SMART START", len(search_items), search, top_k, flush=True)

            results = smart_search_service.search(
                query=search_text,
                items=search_items,
                top_k=top_k,
            )

            print("SMART END", len(results), flush=True)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Smart search unavailable: {exc}") from exc

        listings_by_id = {listing.listing_id: listing for listing in listings}
        listings = [
            listings_by_id[result.id]
            for result in results
            if result.id in listings_by_id
        ]
        views_by_listing_id = get_listing_view_counts(db, [listing.listing_id for listing in listings])
        listings = sort_listing_rows(listings, sort, views_by_listing_id)

    return make_listing_responses(db, listings)


@listings_router.get("/recommended", response_model=List[ListingResponse])
def get_recommended_listings(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User | None = Depends(get_optional_current_user_any),
    db: Session = Depends(get_db),
):
    user_id = current_user.user_id if current_user and current_user.is_active else None
    listing_ids = get_recommended_listing_ids(db=db, user_id=user_id, limit=limit)
    if not listing_ids:
        return []

    listings_by_id = {
        listing.listing_id: listing
        for listing in (
            db.query(ActiveListingsView)
            .filter(ActiveListingsView.listing_id.in_(listing_ids))
            .all()
        )
    }
    ordered_listings = [
        listings_by_id[listing_id]
        for listing_id in listing_ids
        if listing_id in listings_by_id
    ]

    return make_listing_responses(db, ordered_listings)


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

    try:
        price = Decimal(req.price)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid listing price") from exc

    if price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")
    if price > MAX_LISTING_PRICE:
        raise HTTPException(status_code=400, detail="Price must be less than or equal to 100000")

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


@listings_router.post("/{listing_id}/view", response_model=ListingViewResponse)
def record_listing_view(
    listing_id: int,
    current_user: User | None = Depends(get_optional_current_user_any),
    db: Session = Depends(get_db),
):
    def count_listing_views() -> int:
        return int(
            db.scalar(
                select(func.count())
                .select_from(ListingView)
                .where(ListingView.listing_id == listing_id)
            ) or 0
        )

    listing = db.scalar(
        select(Listing)
        .join(User, Listing.seller_id == User.user_id)
        .where(
            Listing.listing_id == listing_id,
            Listing.status.has(ListingStatuses.status_name == "active"),
            User.is_active == 1,
        )
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Active listing not found")

    if not current_user or not current_user.is_active:
        return ListingViewResponse(
            listing_id=listing.listing_id,
            views=count_listing_views(),
            counted=False,
        )

    existing_view = db.scalar(
        select(ListingView).where(
            ListingView.user_id == current_user.user_id,
            ListingView.listing_id == listing.listing_id,
        )
    )
    if existing_view:
        return ListingViewResponse(
            listing_id=listing.listing_id,
            views=count_listing_views(),
            counted=False,
        )

    db.add(ListingView(user_id=current_user.user_id, listing_id=listing.listing_id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return ListingViewResponse(
            listing_id=listing_id,
            views=count_listing_views(),
            counted=False,
        )

    return ListingViewResponse(
        listing_id=listing.listing_id,
        views=count_listing_views(),
        counted=True,
    )


@listings_router.post("/{listing_id}/buy", response_model=BuyListingResponse)
def buy_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return buy_listing_service(db=db, buyer=current_user, listing_id=listing_id)
