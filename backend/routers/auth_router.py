import uuid
from fastapi import APIRouter
from utils import jwt
import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = os.getenv("BOT_NAME") 

auth_router = APIRouter(prefix="/auth")

pending: dict = {}

@auth_router.post("/init")
def init_auth():
    state = str(uuid.uuid4())
    pending[state] = { "status": "pending" }
    deep_link = f"https://t.me/{BOT_NAME}?start={state}"
    return { "state":state, "deep_link": deep_link }

@auth_router.get("/status")
def token_status(state: str) -> dict:
    """
    Function for check status of login request
    """
    result = pending.get(state)

    if not result:
        return { "status": "expired" }
    
    return result
