import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.request_models import ConfirmAuthRequest, DeclineAuthRequest
from utils.redis_client import redis_client
from services.blockchain.user_wallet_service import ensure_user_wallet


auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/init")
def auth_init():
    state = str(uuid.uuid4())

    payload = {
        "status": "pending",
        "user_id": None,
        "tg_id": None,
    }

    redis_client.setex(
        f"auth:{state}",
        600,
        json.dumps(payload)
    )

    return {
        "state": state,
        "deep_link": f"https://t.me/moon_exchange_bot?start={state}"
    }


@auth_router.post("/confirm")
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

    user = db.query(User).filter(User.user_tg_id == payload.tg_id).first()

    if not user:
        base_username = payload.tg_username or f"user_{payload.tg_id}"
        username_candidate = base_username
        suffix = 1

        while db.query(User).filter(User.username == username_candidate).first():
            username_candidate = f"{base_username}_{suffix}"
            suffix += 1

        user = User(
            role_id=1,
            user_tg_id=payload.tg_id,
            tg_username=payload.tg_username,
            tg_visibility=1,
            wallet_address=None,
            is_active=1,
            about_me=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        updated = False

        if payload.tg_username and user.tg_username != payload.tg_username:
            user.tg_username = payload.tg_username
            updated = True

        if updated:
            db.commit()
            db.refresh(user)

    user = ensure_user_wallet(db, user)

    redis_payload = {
        "status": "confirmed",
        "user_id": user.user_id,
        "tg_id": user.user_tg_id,
        "user": {
            "user_id": user.user_id,
            "role_id": user.role_id,
            "user_tg_id": user.user_tg_id,
            "tg_username": user.tg_username,
            "tg_visibility": user.tg_visibility,
            "username": user.username,
            "wallet_address": user.wallet_address,
            "is_active": user.is_active,
            "about_me": user.about_me,
        }
    }

    redis_client.setex(key, 600, json.dumps(redis_payload))

    return {"ok": True}


@auth_router.post("/decline")
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

    return {
        "status": "confirmed",
        "user": {
            "user_id": user.user_id,
            "role_id": user.role_id,
            "user_tg_id": user.user_tg_id,
            "tg_username": user.tg_username,
            "tg_visibility": user.tg_visibility,
            "username": user.username,
            "profile_pic_url": user.profile_pic_url,
            "wallet_address": user.wallet_address,
            "is_active": user.is_active,
            "about_me": user.about_me,
        }
    }