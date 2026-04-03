from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from typing import List

from core.database import get_db
from core.models import Cart, CartItem, Listing, ActiveListingsView

cart_router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartRequest(BaseModel):
    user_id: int
    listing_id: int


class CartItemResponse(BaseModel):
    cart_item_id: int
    listing_id: int
    price: str
    present_id: int
    token_id: str
    present_image_url: str | None
    collection_name: str
    model_name: str | None
    seller_id: int
    seller_username: str | None


class CartResponse(BaseModel):
    user_id: int
    items: List[CartItemResponse]
    total: str


def get_or_create_cart(db: Session, user_id: int) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@cart_router.get("/{user_id}", response_model=CartResponse)
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        return CartResponse(user_id=user_id, items=[], total="0")

    items = []
    total = 0
    for ci in cart.items:
        listing = db.query(ActiveListingsView).filter(
            ActiveListingsView.listing_id == ci.listing_id
        ).first()
        if listing:
            items.append(CartItemResponse(
                cart_item_id=ci.cart_item_id,
                listing_id=ci.listing_id,
                price=str(listing.price),
                present_id=listing.present_id,
                token_id=listing.token_id,
                present_image_url=listing.present_image_url,
                collection_name=listing.collection_name,
                model_name=listing.model_name,
                seller_id=listing.seller_id,
                seller_username=listing.seller_username,
            ))
            total += float(listing.price)

    return CartResponse(user_id=user_id, items=items, total=str(total))


@cart_router.post("/add", response_model=CartItemResponse)
def add_to_cart(req: AddToCartRequest, db: Session = Depends(get_db)):
    listing = db.query(ActiveListingsView).filter(
        ActiveListingsView.listing_id == req.listing_id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id == req.user_id:
        raise HTTPException(status_code=400, detail="Cannot add your own listing to cart")

    cart = get_or_create_cart(db, req.user_id)

    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.listing_id == req.listing_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Item already in cart")

    cart_item = CartItem(cart_id=cart.cart_id, listing_id=req.listing_id)
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)

    return CartItemResponse(
        cart_item_id=cart_item.cart_item_id,
        listing_id=cart_item.listing_id,
        price=str(listing.price),
        present_id=listing.present_id,
        token_id=listing.token_id,
        present_image_url=listing.present_image_url,
        collection_name=listing.collection_name,
        model_name=listing.model_name,
        seller_id=listing.seller_id,
        seller_username=listing.seller_username,
    )


@cart_router.delete("/{cart_item_id}")
def remove_from_cart(cart_item_id: int, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.cart_item_id == cart_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@cart_router.delete("/clear/{user_id}")
def clear_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()
        db.commit()
    return {"ok": True}
