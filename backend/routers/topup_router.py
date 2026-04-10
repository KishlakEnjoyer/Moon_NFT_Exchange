from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.user_wallet_service import get_user_wallet_balances
from core.database import get_db
from core.request_models import TopUpRequest, TopUpResponse
from services.blockchain.topup_service import transfer_tokens_to_user_by_wallet_address

from utils.websocket_manager import ws_manager
import asyncio

topup_router = APIRouter(prefix="/topup", tags=["topup"])


@topup_router.post("/topup", response_model=TopUpResponse)
async def topup( 
    payload: TopUpRequest,
    db: Session = Depends(get_db),
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
        msg = str(e)

        print(msg)

        if msg == "User not found":
            raise HTTPException(status_code=404, detail=msg)

        if msg == "User wallet not found":
            raise HTTPException(status_code=400, detail=msg)

        raise HTTPException(status_code=400, detail=msg)

    except RuntimeError as e:
        msg = str(e)

        print(msg)

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