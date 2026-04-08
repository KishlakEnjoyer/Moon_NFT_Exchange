from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from core.database import get_db
from core.models import Collections, Models, Backgrounds, Symbols
from core.request_models import CollectionOption, ModelOption, BackgroundOption, SymbolOption

filters_router = APIRouter(prefix="/api/filters", tags=["filters"])


@filters_router.get("/collections", response_model=List[CollectionOption])
def get_collections(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(
                Collections.collection_id,
                Collections.collection_name,
                Collections.collection_image_url,
                Collections.base_price,
                Collections.purchase_limit,
            )
            .where(Collections.is_active == 1)
            .order_by(Collections.collection_name)
        )
        .all()
    )
    return [
        CollectionOption(
            id=r.collection_id,
            name=r.collection_name,
            image_url=r.collection_image_url,
            base_price=str(r.base_price) if r.base_price else "0",
            purchase_limit=r.purchase_limit,
        )
        for r in rows
    ]


@filters_router.get("/models", response_model=List[ModelOption])
def get_models(
    collection_ids: str = Query(..., description="Comma-separated collection IDs, e.g. '1,2,3'"),
    db: Session = Depends(get_db),
):
    try:
        ids = [int(i.strip()) for i in collection_ids.split(",") if i.strip()]
    except ValueError:
        return []

    if not ids:
        return []

    rows = (
        db.execute(
            select(Models.model_id, Models.model_name, Models.model_image_url)
            .where(Models.collection_id.in_(ids))
            .order_by(Models.model_name)
        )
        .all()
    )
    return [
        ModelOption(id=r.model_id, name=r.model_name, image_url=r.model_image_url)
        for r in rows
    ]


@filters_router.get("/backgrounds", response_model=List[BackgroundOption])
def get_backgrounds(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(
                Backgrounds.background_id,
                Backgrounds.background_name,
                Backgrounds.background_image_url,
            )
            .order_by(Backgrounds.background_name)
        )
        .all()
    )
    return [
        BackgroundOption(id=r.background_id, name=r.background_name, image_url=r.background_image_url)
        for r in rows
    ]


@filters_router.get("/symbols", response_model=List[SymbolOption])
def get_symbols(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Symbols.symbol_id, Symbols.symbol_name, Symbols.symbol_image_url)
            .order_by(Symbols.symbol_name)
        )
        .all()
    )
    return [
        SymbolOption(id=r.symbol_id, name=r.symbol_name, image_url=r.symbol_image_url)
        for r in rows
    ]
