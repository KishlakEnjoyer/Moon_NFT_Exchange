from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_router import auth_router
from routers.blockchain_debug_router import blockchain_debug_router
from routers.user_wallet_router import user_wallet_router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Moon NFT Exchange API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("REACT_APP_FRONT_URL"), os.getenv("REACT_APP_FRONT_URL2")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(blockchain_debug_router)
app.include_router(user_wallet_router)


