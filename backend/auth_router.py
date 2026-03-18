from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from datetime import datetime, timedelta
import secrets

from core.database import get_db
from core.config import settings
from models import User, Role
from blockchain_service import create_wallet, mint_tokens

router = APIRouter(prefix="/api/auth", tags=["Auth"])

_pending_auth: dict[str, dict] = {}

def create_jwt(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


class TelegramAuthRequest(BaseModel):
    tg_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    auth_token: str         


@router.post("/telegram", summary="Авторизация через Telegram бот")
async def telegram_auth(req: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    """Вызывает бот когда юзер нажал /start auth_xxxxx"""

    result = await db.execute(
        select(User).where(User.user_tg_id == req.tg_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(
            select(Role).where(Role.role_name == "user")
        )
        role = result.scalar_one()

        user = User(
            user_tg_id=req.tg_id,
            username=req.username,
            first_name=req.first_name,
            last_name=req.last_name,
            role_id=role.role_id,
            is_active=True
        )
        db.add(user)
        await db.flush()  

        wallet = create_wallet()
        user.wallet_address = wallet["address"]
        user.wallet_private_key = wallet["private_key"]

        await db.commit()
        await db.refresh(user)

        mint_tokens(user.wallet_address, 1000.0)

    # Generate JWT
    jwt_token = create_jwt(user.user_id)

    _pending_auth[req.auth_token] = {
        "jwt": jwt_token,
        "user_id": user.user_id,
        "username": user.username
    }

    return {"success": True, "message": "Авторизация успешна!"}


@router.get("/check", summary="Сайт проверяет завершилась ли авторизация")
async def check_auth(token: str):
    """
    Сайт вызывает каждые 2 сек пока юзер авторизуется в боте.
    Как только бот вызвал /telegram — возвращаем JWT.
    """
    data = _pending_auth.get(token)
    if not data:
        return {"ready": False}

    del _pending_auth[token]

    return {
        "ready": True,
        "jwt": data["jwt"],
        "user_id": data["user_id"],
        "username": data["username"]
    }


@router.get("/init", summary="Сайт инициирует авторизацию — получает ссылку на бота")
async def init_auth():
    """Сайт вызывает это перед редиректом в бота"""
    auth_token = secrets.token_urlsafe(32)
    bot_username = "moon_exchange_bot"  

    return {
        "auth_token": auth_token,
        "bot_url": f"https://t.me/{bot_username}?start=auth_{auth_token}"
    }