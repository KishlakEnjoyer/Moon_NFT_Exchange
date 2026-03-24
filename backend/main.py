from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_router import auth_router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Moon NFT Exchange API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("REACT_APP_FRONT_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


