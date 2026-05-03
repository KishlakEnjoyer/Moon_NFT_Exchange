import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user, get_current_user_any, get_user_id_from_token
from core.database import get_db
from core.models import User
from core.request_models import ConfirmAuthRequest, DeclineAuthRequest, ConfirmVkAuthRequest
from utils.jwt import generate_jwt
from utils.redis_client import redis_client
from services.user_wallet_service import ensure_user_wallet
from services.user_wallet_service import get_user_wallet_balances

from fastapi import WebSocket, WebSocketDisconnect
from utils.websocket_manager import ws_manager


auth_router = APIRouter(prefix="/auth", tags=["auth"])


def serialize_auth_user(user: User, balance=0) -> dict:
    return {
        "user_id": user.user_id,
        "role_id": user.role_id,
        "user_tg_id": user.user_tg_id,
        "user_vk_id": user.user_vk_id,
        "tg_username": user.tg_username,
        "vk_username": user.vk_username,
        "tg_visibility": user.tg_visibility,
        "vk_visibility": user.vk_visibility,
        "username": user.username,
        "profile_pic_url": user.profile_pic_url if user.is_active else None,
        "wallet_address": user.wallet_address,
        "is_active": user.is_active,
        "about_me": user.about_me,
        "balance": balance,
    }


def _create_auth_state(user_id: int | None, platform_key: str) -> dict[str, str]:
    state = str(uuid.uuid4())
    payload = {
        "status": "pending",
        "user_id": user_id,
        platform_key: None,
    }

    redis_client.setex(
        f"auth:{state}",
        600,
        json.dumps(payload)
    )

    return {"state": state}


@auth_router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        token_user_id = get_user_id_from_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return

    if token_user_id != user_id:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)


@auth_router.post("/init_tg")
def auth_init():
    auth_data = _create_auth_state(user_id=None, platform_key="tg_id")

    return {
        "state": auth_data["state"],
        "deep_link": f"https://t.me/moon_exchange_bot?start={auth_data['state']}"
    }

@auth_router.post("/init_vk")
def auth_init_vk():
    auth_data = _create_auth_state(user_id=None, platform_key="vk_id")

    return {
        "state": auth_data["state"],
        "bot_link": f"https://vk.me/moon_nft_exchange",
        "instruction": "Open VK bot and send the following message:\n\n" + auth_data["state"]
    }


@auth_router.get("/me")
def auth_me(current_user: User = Depends(get_current_user_any), db: Session = Depends(get_db)):
    balance = 0
    if current_user.is_active and current_user.user_tg_id:
        try:
            balance = get_user_wallet_balances(db, current_user.user_tg_id)["token_balance"]
        except Exception:
            balance = 0

    return serialize_auth_user(current_user, balance=balance)


@auth_router.post("/link/tg/init")
def auth_link_tg_init(current_user: User = Depends(get_current_user)):
    auth_data = _create_auth_state(user_id=current_user.user_id, platform_key="tg_id")

    return {
        "state": auth_data["state"],
        "deep_link": f"https://t.me/moon_exchange_bot?start={auth_data['state']}"
    }


@auth_router.post("/link/vk/init")
def auth_link_vk_init(current_user: User = Depends(get_current_user)):
    auth_data = _create_auth_state(user_id=current_user.user_id, platform_key="vk_id")

    return {
        "state": auth_data["state"],
        "bot_link": f"https://vk.me/moon_nft_exchange",
        "instruction": "Open VK bot and send the following message:\n\n" + auth_data["state"]
    }


@auth_router.post("/tg/confirm")
def auth_confirm(payload: ConfirmAuthRequest, db: Session = Depends(get_db)):
    key = f"auth:{payload.state}"
    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(status_code=404, detail="State expired or not found")

    auth_data = json.loads(raw)

    if auth_data.get("status") == "confirmed":
        return {"ok": True, "message": "Already confirmed"}

    if auth_data.get("status") in ["failed", "declined", "expired"]:
        raise HTTPException(status_code=400, detail="This auth request is no longer active")

    effective_username = payload.tg_username or f"user_{payload.tg_id}"
    target_user_id = auth_data.get("user_id")

    existing_tg_user = db.query(User).filter(User.user_tg_id == payload.tg_id).first()

    if target_user_id:
        user = db.query(User).filter(User.user_id == target_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if existing_tg_user and existing_tg_user.user_id != user.user_id:
            raise HTTPException(status_code=400, detail="This Telegram account is already linked to another user")

        user.user_tg_id = payload.tg_id
        user.tg_username = effective_username

        db.commit()
        db.refresh(user)

    else:
        if existing_tg_user:
            user = existing_tg_user

            updated = False
            if user.tg_username != effective_username:
                user.tg_username = effective_username
                updated = True

            if updated:
                db.commit()
                db.refresh(user)
        else:
            base_username = effective_username
            username_candidate = base_username
            suffix = 1

            while db.query(User).filter(User.username == username_candidate).first():
                username_candidate = f"{base_username}_{suffix}"
                suffix += 1

            user = User(
                role_id=1,
                user_tg_id=payload.tg_id,
                user_vk_id=None,
                tg_username=effective_username,
                vk_username=None,
                tg_visibility=1,
                vk_visibility=1,
                username=username_candidate,
                wallet_address=None,
                is_active=1,
                about_me=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    if user.is_active:
        user = ensure_user_wallet(db, user)
    access_token = generate_jwt(user.user_id, user.role_id)

    redis_payload = {
        "status": "confirmed",
        "user_id": user.user_id,
        "tg_id": user.user_tg_id,
        "access_token": access_token,
        "token_type": "Bearer",
        "user": serialize_auth_user(user)
    }

    redis_client.setex(key, 600, json.dumps(redis_payload))

    return {"ok": True}

@auth_router.post("/vk/confirm")
def auth_confirm_vk(payload: ConfirmVkAuthRequest, db: Session = Depends(get_db)):
    key = f"auth:{payload.state}"
    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(status_code=404, detail="State expired or not found")

    auth_data = json.loads(raw)

    if auth_data.get("status") == "confirmed":
        return {"ok": True, "message": "Already confirmed"}

    if auth_data.get("status") in ["failed", "declined", "expired"]:
        raise HTTPException(status_code=400, detail="This auth request is no longer active")

    effective_username = payload.vk_username or f"vk_user_{payload.vk_id}"
    target_user_id = auth_data.get("user_id")

    existing_vk_user = db.query(User).filter(User.user_vk_id == payload.vk_id).first()

    if target_user_id:
        user = db.query(User).filter(User.user_id == target_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if existing_vk_user and existing_vk_user.user_id != user.user_id:
            raise HTTPException(status_code=400, detail="This VK account is already linked to another user")

        user.user_vk_id = payload.vk_id

        user.vk_username = effective_username

        db.commit()
        db.refresh(user)

    else:
        if existing_vk_user:
            user = existing_vk_user

            user.vk_username = effective_username

            db.commit()
            db.refresh(user)
        else:
            base_username = effective_username
            username_candidate = base_username
            suffix = 1

            while db.query(User).filter(User.username == username_candidate).first():
                username_candidate = f"{base_username}_{suffix}"
                suffix += 1

            user = User(
                role_id=1,
                user_tg_id=None,
                user_vk_id=payload.vk_id,
                tg_username=None,
                vk_username=effective_username,
                tg_visibility=1,
                vk_visibility=1,
                username=username_candidate,
                wallet_address=None,
                is_active=1,
                about_me=None,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

    if user.is_active:
        user = ensure_user_wallet(db, user)
    access_token = generate_jwt(user.user_id, user.role_id)

    redis_payload = {
        "status": "confirmed",
        "user_id": user.user_id,
        "vk_id": user.user_vk_id,
        "access_token": access_token,
        "token_type": "Bearer",
        "user": serialize_auth_user(user)
    }

    redis_client.setex(key, 600, json.dumps(redis_payload))

    return {"ok": True}


@auth_router.post("/tg/decline")
def auth_decline(payload: DeclineAuthRequest):
    key = f"auth:{payload.state}"
    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(status_code=404, detail="State expired or not found")

    auth_data = json.loads(raw)

    if auth_data.get("status") == "confirmed":
        raise HTTPException(status_code=400, detail="This auth request is already confirmed")

    auth_data["status"] = "declined"
    auth_data["user_id"] = None
    auth_data["tg_id"] = None
    auth_data.pop("user", None)

    redis_client.setex(key, 600, json.dumps(auth_data))

    return {"ok": True}

@auth_router.post("/vk/decline")
def auth_decline_vk(payload: DeclineAuthRequest):
    key = f"auth:{payload.state}"
    raw = redis_client.get(key)

    if not raw:
        raise HTTPException(status_code=404, detail="State expired or not found")

    auth_data = json.loads(raw)

    if auth_data.get("status") == "confirmed":
        raise HTTPException(status_code=400, detail="This auth request is already confirmed")

    auth_data["status"] = "declined"
    auth_data["user_id"] = None
    auth_data["vk_id"] = None
    auth_data.pop("user", None)

    redis_client.setex(key, 600, json.dumps(auth_data))

    return {"ok": True}


@auth_router.get("/status/{state}")
def auth_status(state: str, db: Session = Depends(get_db)):
    key = f"auth:{state}"
    raw = redis_client.get(key)

    if not raw:
        return {"status": "expired"}

    auth_data = json.loads(raw)
    status = auth_data.get("status")

    if status == "pending":
        return {"status": "pending"}

    if status == "declined":
        return {"status": "declined"}

    if status == "failed":
        return {"status": "failed"}

    if status != "confirmed":
        return {"status": "failed"}

    user_id = auth_data.get("user_id")
    if not user_id:
        return {"status": "failed"}

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"status": "failed"}

    access_token = auth_data.get("access_token")
    token_type = auth_data.get("token_type") or "Bearer"

    if not access_token:
        access_token = generate_jwt(user.user_id, user.role_id)
        auth_data["access_token"] = access_token
        auth_data["token_type"] = token_type
        redis_client.setex(key, 600, json.dumps(auth_data))
    
    balance = 0
    if user.is_active and user.user_tg_id:
        balance = get_user_wallet_balances(db, user.user_tg_id)['token_balance']

    return {
        "status": "confirmed",
        "access_token": access_token,
        "token_type": token_type,
        "user": serialize_auth_user(user, balance=balance)
    }
