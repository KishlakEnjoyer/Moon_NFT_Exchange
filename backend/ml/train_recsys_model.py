from __future__ import annotations

import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.database import SessionLocal
from core.models import (
    ActiveListingsView,
    Listing,
    ListingStatuses,
    ListingView,
    Present,
    Transaction,
    TransactionStatuses,
)


MODEL_TOP_K = 100
VIEW_WEIGHT = 1.0
PURCHASE_WEIGHT = 3.0
MODEL_PATH = Path(__file__).resolve().parent / "recsys_model.pkl"


def train_and_save_model(model_path: Path = MODEL_PATH) -> dict:
    with SessionLocal() as db:
        listings_df = pd.read_sql(
            select(
                Listing.listing_id,
                Listing.present_id,
                Listing.seller_id,
                Listing.status_id,
                Listing.price,
                Listing.created_at,
            ),
            db.bind,
        )
        presents_df = pd.read_sql(
            select(
                Present.present_id,
                Present.collection_id,
                Present.model_id,
                Present.background_id,
                Present.symbol_id,
                Present.present_num,
            ),
            db.bind,
        )
        listing_views_df = pd.read_sql(
            select(ListingView.user_id, ListingView.listing_id),
            db.bind,
        )
        transactions_df = pd.read_sql(
            select(
                Transaction.buyer_id,
                Transaction.present_id,
                Transaction.status_id,
            ),
            db.bind,
        )
        active_listing_ids_df = pd.read_sql(
            select(ActiveListingsView.listing_id),
            db.bind,
        )
        confirmed_status_id = db.scalar(
            select(TransactionStatuses.status_id)
            .where(TransactionStatuses.status_name == "confirmed")
        )
        active_status_id = db.scalar(
            select(ListingStatuses.status_id)
            .where(ListingStatuses.status_name == "active")
        )

    active_ids = set(active_listing_ids_df["listing_id"].astype(int))
    if active_status_id is not None:
        listings_df = listings_df[listings_df["status_id"] == active_status_id]
    listings_df = listings_df[listings_df["listing_id"].isin(active_ids)]

    active_listing_meta = (
        listings_df.merge(presents_df, on="present_id", how="left")
        [[
            "listing_id",
            "present_id",
            "price",
            "collection_id",
            "model_id",
            "background_id",
            "symbol_id",
            "present_num",
        ]]
        .drop_duplicates("listing_id")
        .reset_index(drop=True)
    )

    view_interactions = listing_views_df.assign(weight=VIEW_WEIGHT)
    if confirmed_status_id is not None:
        transactions_df = transactions_df[transactions_df["status_id"] == confirmed_status_id]

    purchase_interactions = (
        transactions_df.merge(listings_df[["listing_id", "present_id"]], on="present_id", how="inner")
        .rename(columns={"buyer_id": "user_id"})
        [["user_id", "listing_id"]]
        .assign(weight=PURCHASE_WEIGHT)
    )

    interactions = pd.concat(
        [view_interactions[["user_id", "listing_id", "weight"]], purchase_interactions],
        ignore_index=True,
    )
    interactions = interactions.dropna(subset=["user_id", "listing_id"])
    if interactions.empty:
        model = _empty_model(active_listing_meta)
        _save_model(model_path, model)
        return model

    interactions[["user_id", "listing_id"]] = interactions[["user_id", "listing_id"]].astype(int)
    interactions = interactions.groupby(["user_id", "listing_id"], as_index=False)["weight"].sum()

    user_item, item_similarity = _build_item_similarity(interactions)
    popular_listing_ids = _popularity_fallback(
        interactions,
        active_listing_meta,
        top_k=MODEL_TOP_K,
    )["listing_id"].astype(int).tolist()

    recommendations_by_user = {}
    for user_id in user_item.index:
        user_id = int(user_id)
        user_recs = _recommend_for_user(
            user_id,
            user_item,
            item_similarity,
            interactions,
            active_listing_meta,
            top_k=MODEL_TOP_K,
        )["listing_id"].astype(int).tolist()

        seen_listing_ids = set(user_item.loc[user_id][user_item.loc[user_id] > 0].index.astype(int))
        for listing_id in popular_listing_ids:
            if listing_id not in user_recs and listing_id not in seen_listing_ids:
                user_recs.append(listing_id)

        recommendations_by_user[user_id] = user_recs[:MODEL_TOP_K]

    model = {
        "version": 1,
        "model_type": "item_item_collaborative_filtering_precomputed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "top_k": MODEL_TOP_K,
        "recommendations_by_user": recommendations_by_user,
        "popular_listing_ids": popular_listing_ids,
        "metadata": {
            "users_count": int(user_item.shape[0]),
            "items_count": int(user_item.shape[1]),
            "interactions_count": int(len(interactions)),
            "active_candidates_count": int(len(active_listing_meta)),
            "view_weight": VIEW_WEIGHT,
            "purchase_weight": PURCHASE_WEIGHT,
        },
    }
    _save_model(model_path, model)
    return model


def _build_item_similarity(interactions_df: pd.DataFrame):
    user_item_matrix = interactions_df.pivot_table(
        index="user_id",
        columns="listing_id",
        values="weight",
        aggfunc="sum",
        fill_value=0,
    )
    similarity = user_item_matrix.corr(min_periods=1).fillna(0)
    similarity = similarity.mask(np.eye(similarity.shape[0], dtype=bool), 0)
    return user_item_matrix, similarity


def _popularity_fallback(
    interactions_df: pd.DataFrame,
    candidate_meta: pd.DataFrame,
    top_k: int = 10,
    exclude_ids: set[int] | None = None,
):
    exclude_ids = set(exclude_ids or [])
    candidate_ids = set(candidate_meta["listing_id"].astype(int)) - exclude_ids
    scores = (
        interactions_df[interactions_df["listing_id"].isin(candidate_ids)]
        .groupby("listing_id")["weight"]
        .sum()
        .sort_values(ascending=False)
        .head(top_k)
        .rename("score")
        .reset_index()
    )
    if scores.empty:
        scores = candidate_meta[["listing_id"]].head(top_k).assign(score=0.0)
    return scores.merge(candidate_meta, on="listing_id", how="left")


def _recommend_for_user(
    user_id: int,
    user_item_matrix: pd.DataFrame,
    similarity: pd.DataFrame,
    interactions_df: pd.DataFrame,
    candidate_meta: pd.DataFrame,
    top_k: int = 10,
):
    if user_id not in user_item_matrix.index:
        return _popularity_fallback(interactions_df, candidate_meta, top_k=top_k)

    user_vector = user_item_matrix.loc[user_id]
    seen = user_vector[user_vector > 0]
    seen_ids = set(seen.index)

    candidate_ids = pd.Index(candidate_meta["listing_id"]).intersection(similarity.index)
    source_ids = seen.index.intersection(similarity.columns)

    if source_ids.empty or candidate_ids.empty:
        return _popularity_fallback(interactions_df, candidate_meta, top_k=top_k, exclude_ids=seen_ids)

    scores = similarity.loc[candidate_ids, source_ids].dot(seen.loc[source_ids])
    scores = scores.drop(index=seen_ids, errors="ignore")
    scores = scores.sort_values(ascending=False).head(top_k)

    if scores.empty:
        return _popularity_fallback(interactions_df, candidate_meta, top_k=top_k, exclude_ids=seen_ids)

    return scores.rename("score").reset_index().merge(candidate_meta, on="listing_id", how="left")


def _empty_model(active_listing_meta: pd.DataFrame) -> dict:
    return {
        "version": 1,
        "model_type": "item_item_collaborative_filtering_precomputed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "top_k": MODEL_TOP_K,
        "recommendations_by_user": {},
        "popular_listing_ids": active_listing_meta["listing_id"].head(MODEL_TOP_K).astype(int).tolist(),
        "metadata": {
            "users_count": 0,
            "items_count": 0,
            "interactions_count": 0,
            "active_candidates_count": int(len(active_listing_meta)),
            "view_weight": VIEW_WEIGHT,
            "purchase_weight": PURCHASE_WEIGHT,
        },
    }


def _save_model(model_path: Path, model: dict) -> None:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = model_path.with_suffix(".tmp")
    with tmp_path.open("wb") as file:
        pickle.dump(model, file)
    tmp_path.replace(model_path)


if __name__ == "__main__":
    trained_model = train_and_save_model()
    print(f"Saved recommendation model to {MODEL_PATH}")
    print(trained_model["metadata"])
