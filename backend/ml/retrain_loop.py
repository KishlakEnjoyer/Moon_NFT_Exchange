from __future__ import annotations

import os
import sys
import time
import traceback
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from train_recsys_model import train_and_save_model


DEFAULT_INTERVAL_SECONDS = 3 * 60 * 60


def main() -> None:
    interval_seconds = int(os.getenv("RECSYS_RETRAIN_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS))
    run_once = os.getenv("RECSYS_RUN_ONCE", "").lower() in {"1", "true", "yes"}

    while True:
        try:
            model = train_and_save_model()
            print(
                "Recommendation model refreshed:",
                model.get("created_at"),
                model.get("metadata"),
                flush=True,
            )
        except Exception:
            traceback.print_exc()

        if run_once:
            break

        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()
