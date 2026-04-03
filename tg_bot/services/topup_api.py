import os

import httpx

BACKEND_URL = os.getenv("API_DOCKER_URL")


class TopupCooldownError(Exception):
    def __init__(self, remaining_seconds: int):
        self.remaining_seconds = remaining_seconds
        super().__init__(f"Cooldown active: {remaining_seconds}")


class TopupUserNotFoundError(Exception):
    pass


class TopupWalletNotFoundError(Exception):
    pass


async def topup_topup_by_tg_id(tg_id: int, amount: str) -> dict:
    url = f"{BACKEND_URL}/topup/topup"
    payload = {
        "tg_id": tg_id,
        "amount": amount,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, json=payload)

    if response.status_code == 404:
        raise TopupUserNotFoundError()

    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail")
        if detail == "User wallet not found":
            raise TopupWalletNotFoundError()
        raise RuntimeError(str(detail))

    if response.status_code == 429:
        data = response.json()
        detail = data.get("detail", {})
        raise TopupCooldownError(int(detail.get("remaining_seconds", 0)))

    response.raise_for_status()
    return response.json()