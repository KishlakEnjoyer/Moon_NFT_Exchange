from pydantic import BaseModel, Field
from decimal import Decimal


class ConfirmAuthRequest(BaseModel):
    state: str
    tg_id: int
    tg_username: str | None = None

class ConfirmVkAuthRequest(BaseModel):
    state: str
    vk_id: int
    vk_username: str | None = None


class DeclineAuthRequest(BaseModel):
    state: str


class TopUpRequest(BaseModel):
    wallet_address: str
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
    user_id: int | None = None
    title: str


class RenameAlbumRequest(BaseModel):
    new_title: str


class UpdateProfileRequest(BaseModel):
    username: str
    about_me: str | None = None
    tg_visibility: int
    vk_visibility: int
    profile_pic_data_url: str | None = None


class UpdateProfileResponse(BaseModel):
    user_id: int
    user_tg_id: int | None = None
    user_vk_id: int | None = None
    username: str
    tg_username: str | None = None
    vk_username: str | None = None
    tg_visibility: int
    vk_visibility: int
    profile_pic_url: str | None = None
    about_me: str | None = None


class AlbumResponse(BaseModel):
    album_id: int
    album_owner_id: int
    album_title: str

    class Config:
        from_attributes = True


class SendGiftRequest(BaseModel):
    sender_id: int | None = None
    receiver_id: int
    collection_id: int
    description: str | None = Field(default=None, max_length=100)

class GeneratePresentRequest(BaseModel):
    collection_id: int
    

class TransactionResponse(BaseModel):
    transaction_id: int
    transaction_price: str
    platform_fee: str
    seller_received: str
    transaction_date: str
    transaction_type: str
    transaction_status: str
    present_id: int
    collection_name: str
    buyer_id: int
    buyer_username: str | None
    buyer_profile_pic_url: str | None
    seller_id: int
    seller_username: str | None
    seller_profile_pic_url: str | None
    blockchain_tx_hash: str | None

    class Config:
        from_attributes = True
