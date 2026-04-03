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


class CollectionOption(BaseModel):
    id: int
    name: str
    image_url: str | None = None
    base_price: str | None = None
    purchase_limit: int | None = None
    blockchain_network: str | None = None

    class Config:
        from_attributes = True


class ModelOption(BaseModel):
    id: int
    name: str
    image_url: str | None = None

    class Config:
        from_attributes = True


class BackgroundOption(BaseModel):
    id: int
    name: str
    image_url: str | None = None

    class Config:
        from_attributes = True


class SymbolOption(BaseModel):
    id: int
    name: str
    image_url: str | None = None

    class Config:
        from_attributes = True



class CreateAlbumRequest(BaseModel):
    user_id: int      
    title: str        


class RenameAlbumRequest(BaseModel):
    new_title: str


class UpdateProfileRequest(BaseModel):
    username: str
    about_me: str | None = None
    tg_visibility: int
    profile_pic_data_url: str | None = None


class UpdateProfileResponse(BaseModel):
    user_id: int
    username: str
    tg_username: str | None = None
    tg_visibility: int
    profile_pic_url: str | None = None
    about_me: str | None = None


class AlbumResponse(BaseModel):
    album_id: int
    album_owner_id: int
    album_title: str

    class Config:
        from_attributes = True
