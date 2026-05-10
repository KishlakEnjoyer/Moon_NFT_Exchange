from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from core.auth import get_current_user
from core.database import get_db
from core.models import ActiveListingsView, CartItem, Present, User
from services.listing_purchase_service import buy_cart_listings
from services.admin_platform_service import get_visible_profile_badges

cart_router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartRequest(BaseModel):
    user_id: int | None = None
    listing_id: int


class CartItemResponse(BaseModel):
    cart_item_id: int
    listing_id: int
    price: str
    present_id: int
    present_num: int
    present_image_url: str | None
    collection_name: str
    model_name: str | None
    seller_id: int
    seller_username: str | None
    seller_profile_badge_achievement_id: int | None = None
    seller_profile_badge_image_url: str | None = None
    seller_profile_badge_title: str | None = None


class CartResponse(BaseModel):
    user_id: int
    items: List[CartItemResponse]
    total: str


class CartPurchaseItemResponse(BaseModel):
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


class CartPurchaseResponse(BaseModel):
    purchases: List[CartPurchaseItemResponse]
    total: str
    new_balance: str | None


@cart_router.get("/{user_id}", response_model=CartResponse)
def get_cart(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's cart")

    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.user_id).all()
    if not cart_items:
        return CartResponse(user_id=current_user.user_id, items=[], total="0")

    listing_ids = [ci.listing_id for ci in cart_items]
    listings = (
        db.query(ActiveListingsView)
        .join(User, ActiveListingsView.seller_id == User.user_id)
        .filter(
            ActiveListingsView.listing_id.in_(listing_ids),
            User.is_active == 1,
        )
        .all()
    )
    listing_by_id = {listing.listing_id: listing for listing in listings}
    profile_badges = get_visible_profile_badges(db, {listing.seller_id for listing in listings})
    present_ids = [listing.present_id for listing in listings]
    present_num_by_id = {}
    if present_ids:
        present_num_by_id = {
            present.present_id: present.present_num
            for present in (
                db.query(Present.present_id, Present.present_num)
                .filter(Present.present_id.in_(present_ids))
                .all()
            )
        }

    items = []
    total = 0
    for ci in cart_items:
        listing = listing_by_id.get(ci.listing_id)
        if listing:
            items.append(CartItemResponse(
                cart_item_id=ci.cart_item_id,
                listing_id=ci.listing_id,
                price=str(listing.price),
                present_id=listing.present_id,
                present_num=present_num_by_id.get(listing.present_id, listing.present_id),
                present_image_url=listing.present_image_url,
                collection_name=listing.collection_name,
                model_name=listing.model_name,
                seller_id=listing.seller_id,
                seller_username=listing.seller_username,
                seller_profile_badge_achievement_id=profile_badges.get(listing.seller_id, {}).get("achievement_id"),
                seller_profile_badge_image_url=profile_badges.get(listing.seller_id, {}).get("image_url"),
                seller_profile_badge_title=profile_badges.get(listing.seller_id, {}).get("title"),
            ))
            total += float(listing.price)

    return CartResponse(user_id=current_user.user_id, items=items, total=str(total))


@cart_router.post("/add", response_model=CartItemResponse)
def add_to_cart(
    req: AddToCartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.user_id is not None and req.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's cart")

    listing = (
        db.query(ActiveListingsView)
        .join(User, ActiveListingsView.seller_id == User.user_id)
        .filter(
            ActiveListingsView.listing_id == req.listing_id,
            User.is_active == 1,
        )
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot add your own listing to cart")

    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.user_id,
        CartItem.listing_id == req.listing_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Item already in cart")

    cart_item = CartItem(user_id=current_user.user_id, listing_id=req.listing_id)
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    profile_badge = get_visible_profile_badges(db, {listing.seller_id}).get(listing.seller_id)

    return CartItemResponse(
        cart_item_id=cart_item.cart_item_id,
        listing_id=cart_item.listing_id,
        price=str(listing.price),
        present_id=listing.present_id,
        present_num=(
            db.query(Present.present_num)
            .filter(Present.present_id == listing.present_id)
            .scalar()
            or listing.present_id
        ),
        present_image_url=listing.present_image_url,
        collection_name=listing.collection_name,
        model_name=listing.model_name,
        seller_id=listing.seller_id,
        seller_username=listing.seller_username,
        seller_profile_badge_achievement_id=profile_badge["achievement_id"] if profile_badge else None,
        seller_profile_badge_image_url=profile_badge["image_url"] if profile_badge else None,
        seller_profile_badge_title=profile_badge["title"] if profile_badge else None,
    )


@cart_router.delete("/{cart_item_id}")
def remove_from_cart(
    cart_item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(CartItem).filter(CartItem.cart_item_id == cart_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if item.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's cart")
    db.delete(item)
    db.commit()
    return {"ok": True}


@cart_router.delete("/clear/{user_id}")
def clear_cart(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot clear another user's cart")

    db.query(CartItem).filter(CartItem.user_id == current_user.user_id).delete()
    db.commit()
    return {"ok": True}


@cart_router.post("/{user_id}/buy", response_model=CartPurchaseResponse)
def buy_cart(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot buy another user's cart")

    cart_items = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.user_id)
        .order_by(CartItem.added_at.asc(), CartItem.cart_item_id.asc())
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    return buy_cart_listings(
        db=db,
        buyer=current_user,
        listing_ids=[item.listing_id for item in cart_items],
    )
