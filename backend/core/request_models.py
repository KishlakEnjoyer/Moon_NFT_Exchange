from pydantic import BaseModel


class ConfirmAuthRequest(BaseModel):
    state: str
    tg_id: int
    tg_username: str | None = None

class DeclineAuthRequest(BaseModel):
    state: str