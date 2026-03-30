from pydantic import BaseModel, Field
from decimal import Decimal


class ConfirmAuthRequest(BaseModel):
    state: str
    tg_id: int
    tg_username: str | None = None


class DeclineAuthRequest(BaseModel):
    state: str


class WalletTopupRequest(BaseModel):
    tg_id: int
    amount: Decimal = Field(gt=0)
    asset_type: int


class WalletTopupResponse(BaseModel):
    topup_id: int
    user_id: int
    amount: Decimal
    asset_type: int
    status: int
    message: str



class TopUpRequest(BaseModel):
    tg_id: int
    amount: Decimal = Field(gt=0, lt=1000000)


class TopUpResponse(BaseModel):
    topup_id: int
    user_id: int
    wallet_address: str
    amount: str
    tx_hash: str
    block_number: int
    new_balance: str
    cooldown_minutes: int