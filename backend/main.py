from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.price_estimate_router import price_estimate_router
from routers.nsfw_detector_router import nsfw_detector_router
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
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Moon NFT Exchange API")

origins = [o for o in [os.getenv("REACT_APP_FRONT_URL"), os.getenv("REACT_APP_FRONT_URL2"), os.getenv("FRONT_URL_DOCKER")] if o]

print(f"🔐 CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
