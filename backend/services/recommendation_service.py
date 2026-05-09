from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from core.models import ActiveListingsView, User


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = BACKEND_ROOT / "ml" / "recsys_model.pkl"
_MODEL_CACHE: dict[str, tuple[int, dict[str, Any]]] = {}


def get_recommended_listing_ids(
    db: Session,
    user_id: int | None,
    limit: int = 50,
) -> list[int]:
    active_rows = _get_active_candidate_rows(db=db, user_id=user_id)
    if not active_rows:
        return []

    active_ids = {row.listing_id for row in active_rows}
    model = _load_recsys_model()

    ranked_ids = []
    if user_id is not None:
        ranked_ids.extend(
            model.get("recommendations_by_user", {}).get(int(user_id), [])
        )

    ranked_ids.extend(model.get("popular_listing_ids", []))
    ranked_ids = _unique_active_ids(ranked_ids, active_ids=active_ids)

    if len(ranked_ids) < limit:
        newest_ids = [
            row.listing_id
            for row in sorted(
                active_rows,
                key=lambda item: (item.listed_at, item.listing_id),
                reverse=True,
            )
        ]
        ranked_ids.extend(
            _unique_active_ids(
                newest_ids,
                active_ids=active_ids,
                exclude_ids=set(ranked_ids),
            )
        )

    return ranked_ids[:limit]


def _load_recsys_model(model_path: str = str(DEFAULT_MODEL_PATH)) -> dict[str, Any]:
    path = Path(model_path)
    if not path.exists():
        return {
            "version": 1,
            "recommendations_by_user": {},
            "popular_listing_ids": [],
        }

    stat = path.stat()
    cache_key = str(path.resolve())
    cached = _MODEL_CACHE.get(cache_key)
    if cached and cached[0] == stat.st_mtime_ns:
        return cached[1]

    with path.open("rb") as file:
        model = pickle.load(file)

    if not isinstance(model, dict):
        return {
            "version": 1,
            "recommendations_by_user": {},
            "popular_listing_ids": [],
        }

    _MODEL_CACHE[cache_key] = (stat.st_mtime_ns, model)
    return model


def _get_active_candidate_rows(db: Session, user_id: int | None) -> list[ActiveListingsView]:
    query = (
        db.query(ActiveListingsView)
        .join(User, ActiveListingsView.seller_id == User.user_id)
        .filter(User.is_active == 1)
    )

    if user_id is not None:
        query = query.filter(ActiveListingsView.seller_id != user_id)

    return query.all()


def _unique_active_ids(
    listing_ids: list[int],
    active_ids: set[int],
    exclude_ids: set[int] | None = None,
) -> list[int]:
    exclude_ids = exclude_ids or set()
    result = []
    seen = set(exclude_ids)

    for listing_id in listing_ids:
        listing_id = int(listing_id)
        if listing_id in seen or listing_id not in active_ids:
            continue

        seen.add(listing_id)
        result.append(listing_id)

    return result
