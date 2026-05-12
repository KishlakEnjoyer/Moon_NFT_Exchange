from contextlib import asynccontextmanager
import logging
import os
from threading import Thread

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import SessionLocal
from core.models import ActiveListingsView

from routers.price_estimate_router import price_estimate_router
from routers.nsfw_detector_router import nsfw_detector_router, preload_nsfw_detector
from routers.auth_router import auth_router
from routers.blockchain_debug_router import blockchain_debug_router
from routers.user_wallet_router import user_wallet_router
from routers.info_router import user_info_router
from routers.topup_router import topup_router
from routers.filter_router import filters_router
from routers.notification_router import notification_router
from routers.album_router import album_router
from routers.report_router import report_router
from routers.gift_router import gift_router
from routers.listings_router import listings_router
from routers.cart_router import cart_router
from routers.transactions_router import transactions_router
from routers.presents_router import presents_router
from routers.generation_image_router import image_generator_router
from routers.admin_router import admin_router
from routers.social_router import social_router

from services.smart_search_service import smart_search_service, SmartSearchItem
from services.profile_content_moderation_service import preload_profile_content_moderation


load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _split_env_list(value: str | None) -> list[str]:
    if not value:
        return []

    return [
        item.strip().rstrip("/")
        for item in value.split(",")
        if item.strip()
    ]


def preload_smart_search_items() -> None:
    """
    Прогревает CLIP не только загрузкой модели, но и реальным поиском по активным лотам.
    Это нужно, чтобы первый пользовательский smart search не упирался в долгую генерацию embeddings.
    """
    db = SessionLocal()

    try:
        logger.info("Warming up smart search image embeddings...")

        rows = (
            db.query(
                ActiveListingsView.present_id,
                ActiveListingsView.present_image_url,
            )
            .filter(ActiveListingsView.present_image_url.isnot(None))
            .limit(300)
            .all()
        )

        items = [
            SmartSearchItem(
                id=int(row.present_id),
                image_url=row.present_image_url,
            )
            for row in rows
            if row.present_image_url
        ]

        logger.info("Smart search warmup items: %s", len(items))

        if not items:
            logger.warning("Smart search warmup skipped: no active listing images found")
            return

        result = smart_search_service.search(
            query="gift",
            items=items,
            top_k=min(5, len(items)),
        )

        logger.info("Smart search image embeddings warmed up. Results: %s", len(result))

    except Exception:
        logger.exception("Failed to warm up smart search image embeddings")
    finally:
        db.close()


def run_background_preload() -> None:
    """
    Запускаем тяжёлый прогрев в фоне, чтобы API быстрее стартовал.
    """
    try:
        logger.info("Preloading NSFW detector...")
        preload_nsfw_detector()
        logger.info("NSFW detector preloaded")
    except Exception:
        logger.exception("Failed to preload NSFW detector")

    try:
        logger.info("Preloading smart search models...")
        smart_search_service.preload()
        logger.info("Smart search models preloaded")
    except Exception:
        logger.exception("Failed to preload smart search models")

    try:
        preload_smart_search_items()
    except Exception:
        logger.exception("Failed to preload smart search items")

    try:
        logger.info("Preloading profile content moderation...")
        preload_profile_content_moderation()
        logger.info("Profile content moderation preloaded")
    except Exception:
        logger.exception("Failed to preload profile content moderation")

    logger.info("Background preload finished")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")

    preload_thread = Thread(
        target=run_background_preload,
        daemon=True,
    )
    preload_thread.start()

    yield


app = FastAPI(
    title="Moon NFT Exchange API",
    lifespan=lifespan,
)


origins: list[str] = []

for origin in [
    "http://localhost:3000",
    "https://moon-nft.ru",
    "https://www.moon-nft.ru",
    os.getenv("REACT_APP_FRONT_URL"),
    os.getenv("REACT_APP_FRONT_URL2"),
    os.getenv("FRONT_URL_DOCKER"),
    *_split_env_list(os.getenv("CORS_ALLOWED_ORIGINS")),
]:
    if origin:
        normalized_origin = origin.rstrip("/")
        if normalized_origin not in origins:
            origins.append(normalized_origin)

logger.info("CORS origins: %s", origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/smart-search/health")
def smart_search_health():
    return {
        "ok": True,
        "clip_loaded": smart_search_service._clip_model is not None,
        "processor_loaded": smart_search_service._clip_processor is not None,
        "translator_loaded": smart_search_service._translator_model is not None,
        "cached_images": len(getattr(smart_search_service, "_image_cache", {})),
    }


app.include_router(auth_router)
app.include_router(blockchain_debug_router)
app.include_router(user_wallet_router)
app.include_router(user_info_router)
app.include_router(topup_router)
app.include_router(filters_router)
app.include_router(notification_router)
app.include_router(album_router)
app.include_router(report_router)
app.include_router(gift_router)
app.include_router(listings_router)
app.include_router(cart_router)
app.include_router(transactions_router)
app.include_router(presents_router)
app.include_router(image_generator_router)
app.include_router(nsfw_detector_router)
app.include_router(price_estimate_router)
app.include_router(admin_router)
app.include_router(social_router)