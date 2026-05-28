from __future__ import annotations

import unittest
from datetime import datetime
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.models import Notification, NotificationTypes
from services.notification_service import notification_to_dict


class NotificationLocalizationPayloadTests(unittest.TestCase):
    def test_notification_payload_keeps_language_variants(self) -> None:
        notification_type = NotificationTypes(
            type_id=1,
            type_name="report_warning",
            description="Report warning",
        )
        notification = Notification(
            notification_id=10,
            user_id=20,
            type_id=1,
            entity_type="report",
            entity_id=30,
            payload_json='{"reason":"Spam","reason_ru":"Спам","reason_en":"Spam"}',
            is_read=0,
            created_at=datetime(2026, 5, 25, 12, 0, 0),
        )
        notification.notification_type = notification_type

        data = notification_to_dict(notification)

        self.assertEqual(data["type"], "report_warning")
        self.assertEqual(data["payload"]["reason_ru"], "Спам")
        self.assertEqual(data["payload"]["reason_en"], "Spam")


if __name__ == "__main__":
    unittest.main()
