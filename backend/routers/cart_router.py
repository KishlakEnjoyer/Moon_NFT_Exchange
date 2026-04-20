from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from core.auth import get_current_user
from core.database import get_db
from core.models import ActiveListingsView, CartItem, User

cart_router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartRequest(BaseModel):
    user_id: int | None = None
    listing_id: int


class CartItemResponse(BaseModel):
    cart_item_id: int
    listing_id: int
    price: str
    present_id: int
    present_image_url: str | None
    collection_name: str
    model_name: str | None
    seller_id: int
    seller_username: str | None


class CartResponse(BaseModel):
    user_id: int
    items: List[CartItemResponse]
    total: str


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

    items = []
    total = 0
    for ci in cart_items:
        listing = db.query(ActiveListingsView).filter(
            ActiveListingsView.listing_id == ci.listing_id
        ).first()
        if listing:
            items.append(CartItemResponse(
                cart_item_id=ci.cart_item_id,
                listing_id=ci.listing_id,
                price=str(listing.price),
                present_id=listing.present_id,
                present_image_url=listing.present_image_url,
                collection_name=listing.collection_name,
                model_name=listing.model_name,
                seller_id=listing.seller_id,
                seller_username=listing.seller_username,
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

    listing = db.query(ActiveListingsView).filter(
        ActiveListingsView.listing_id == req.listing_id
    ).first()
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

    return CartItemResponse(
        cart_item_id=cart_item.cart_item_id,
        listing_id=cart_item.listing_id,
        price=str(listing.price),
        present_id=listing.present_id,
        present_image_url=listing.present_image_url,
        collection_name=listing.collection_name,
        model_name=listing.model_name,
        seller_id=listing.seller_id,
        seller_username=listing.seller_username,
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
