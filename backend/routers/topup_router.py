import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.request_models import (
    TelegramTopUpInvoiceResponse,
    TelegramTopUpPaidRequest,
    TopUpRequest,
    TopUpResponse,
)
from services.blockchain.topup_service import (
    confirm_paid_telegram_topup,
    create_telegram_topup_invoice,
    transfer_tokens_to_user_by_wallet_address,
)

from utils.websocket_manager import ws_manager
import asyncio

topup_router = APIRouter(prefix="/topup", tags=["topup"])


def require_topup_secret(x_topup_secret: str | None = Header(default=None)) -> None:
    expected = os.getenv("TOPUP_INTERNAL_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="TOPUP_INTERNAL_SECRET is not set")

    if not hmac.compare_digest(x_topup_secret or "", expected):
        raise HTTPException(status_code=403, detail="Invalid topup secret")


def handle_topup_error(exc: Exception) -> None:
    msg = str(exc)

    print(msg)

    if msg == "User not found":
        raise HTTPException(status_code=404, detail=msg)

    if msg == "Topup not found":
        raise HTTPException(status_code=404, detail=msg)

    if msg == "User wallet not found":
        raise HTTPException(status_code=400, detail=msg)

    if msg.startswith("Cooldown active:"):
        seconds = int(msg.split(":")[1])
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Cooldown active",
                "remaining_seconds": seconds,
            },
        )

    raise HTTPException(status_code=400, detail=msg)


@topup_router.post("/topup", response_model=TopUpResponse)
async def topup( 
    payload: TopUpRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_topup_secret),
) -> TopUpResponse:
    try:
        result = await asyncio.to_thread( 
            transfer_tokens_to_user_by_wallet_address,
            db=db,
            wallet_address=payload.wallet_address,
            amount=payload.amount,
        )

        await ws_manager.send_balance(result["user_id"], result["new_balance"])

        return TopUpResponse(**result)

    except ValueError as e:
        handle_topup_error(e)

    except RuntimeError as e:
        handle_topup_error(e)


@topup_router.post("/telegram-invoice", response_model=TelegramTopUpInvoiceResponse)
async def telegram_invoice(
    payload: TopUpRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_topup_secret),
) -> TelegramTopUpInvoiceResponse:
    try:
        result = await asyncio.to_thread(
            create_telegram_topup_invoice,
            db=db,
            wallet_address=payload.wallet_address,
            amount=payload.amount,
        )
        return TelegramTopUpInvoiceResponse(**result)
    except ValueError as e:
        handle_topup_error(e)
    except RuntimeError as e:
        handle_topup_error(e)


@topup_router.post("/telegram-paid", response_model=TopUpResponse)
async def telegram_paid(
    payload: TelegramTopUpPaidRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_topup_secret),
) -> TopUpResponse:
    try:
        result = await asyncio.to_thread(
            confirm_paid_telegram_topup,
            db=db,
            topup_id=payload.topup_id,
            currency=payload.currency,
            total_amount=payload.total_amount,
            provider_payment_charge_id=payload.provider_payment_charge_id,
            telegram_payment_charge_id=payload.telegram_payment_charge_id,
        )

        await ws_manager.send_balance(result["user_id"], result["new_balance"])

        return TopUpResponse(**result)
    except ValueError as e:
        handle_topup_error(e)
    except RuntimeError as e:
        handle_topup_error(e)
