from __future__ import annotations

import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import sys
import types

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

user_profile_service_stub = types.ModuleType("services.user_profile_service")


def _not_used(*args, **kwargs):
    raise NotImplementedError("This service is not used by these router unit tests")


user_profile_service_stub.get_user_profile_info_by_username = _not_used
user_profile_service_stub.get_user_profile_stats_by_tg_id = _not_used
user_profile_service_stub.get_user_profile_stats_by_vk_id = _not_used
user_profile_service_stub.update_user_profile = _not_used
sys.modules["services.user_profile_service"] = user_profile_service_stub

from core.database import Base
from core.models import TransactionHistory, User
from routers import info_router, transactions_router


class RankAndUserSearchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        self._original_transaction_badges = transactions_router.get_visible_profile_badges
        self._original_info_badges = info_router.get_visible_profile_badges
        transactions_router.get_visible_profile_badges = lambda db, user_ids: {}
        info_router.get_visible_profile_badges = lambda db, user_ids: {}

    def tearDown(self) -> None:
        transactions_router.get_visible_profile_badges = self._original_transaction_badges
        info_router.get_visible_profile_badges = self._original_info_badges
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def add_user(self, user_id: int, username: str | None = None) -> User:
        user = User(
            user_id=user_id,
            role_id=1,
            username=username or f"user{user_id}",
            is_active=1,
        )
        self.db.add(user)
        return user

    def add_confirmed_purchase(self, user_id: int, price: Decimal, transaction_id: int) -> None:
        self.db.add(
            TransactionHistory(
                transaction_id=transaction_id,
                transaction_price=price,
                platform_fee=Decimal("0"),
                seller_received=price,
                transaction_date=datetime.now(timezone.utc).replace(tzinfo=None),
                transaction_type="trade",
                transaction_status="confirmed",
                present_id=transaction_id,
                collection_name="Test",
                buyer_id=user_id,
                buyer_username=f"user{user_id}",
                seller_id=10_000 + user_id,
                seller_username=f"seller{user_id}",
            )
        )

    def test_top_spenders_appends_current_user_outside_top_ten(self) -> None:
        for user_id in range(1, 13):
            self.add_user(user_id)
        self.db.flush()

        for user_id in range(1, 13):
            self.add_confirmed_purchase(
                user_id=user_id,
                price=Decimal(100 - user_id),
                transaction_id=user_id,
            )
        self.db.commit()

        current_user = self.db.get(User, 12)
        rows = transactions_router.get_top_spenders(limit=10, current_user=current_user, db=self.db)

        self.assertEqual([row.user_id for row in rows[:10]], list(range(1, 11)))
        self.assertEqual(rows[-1].user_id, 12)
        self.assertEqual(rows[-1].rank, 12)
        self.assertEqual(rows[-1].spent_ton, "88.000000")

    def test_user_search_includes_requested_user_first(self) -> None:
        for user_id in range(1, 6):
            self.add_user(user_id)
        self.db.commit()

        rows = info_router.search_users(q="", limit=3, include_user_id=5, db=self.db)

        self.assertEqual(rows[0]["user_id"], 5)
        self.assertEqual(len(rows), 3)
        self.assertEqual(len({row["user_id"] for row in rows}), 3)


if __name__ == "__main__":
    unittest.main()
