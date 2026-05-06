import os

import httpx

BACKEND_URL = os.getenv("API_DOCKER_URL")
TOPUP_INTERNAL_SECRET = os.getenv("TOPUP_INTERNAL_SECRET")


class TopupCooldownError(Exception):
    def __init__(self, remaining_seconds: int):
        self.remaining_seconds = remaining_seconds
        super().__init__(f"Cooldown active: {remaining_seconds}")


class TopupUserNotFoundError(Exception):
    pass


class TopupWalletNotFoundError(Exception):
    pass


def _topup_headers() -> dict[str, str]:
    return {"X-Topup-Secret": TOPUP_INTERNAL_SECRET or ""}


def _raise_for_topup_error(response: httpx.Response) -> None:
    if response.status_code == 404:
        raise TopupUserNotFoundError()

    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail")
        if detail == "User wallet not found":
            raise TopupWalletNotFoundError()
        raise RuntimeError(str(detail))

    if response.status_code == 403:
        raise RuntimeError("Top-up API secret is invalid.")

    if response.status_code == 429:
        data = response.json()
        detail = data.get("detail", {})
        raise TopupCooldownError(int(detail.get("remaining_seconds", 0)))


async def topup_topup_by_wal_adr(wallet_adr: str, amount: str) -> dict:
    url = f"{BACKEND_URL}/topup/topup"
    payload = {
        "wallet_address": wallet_adr,
        "amount": amount,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, json=payload, headers=_topup_headers())

    _raise_for_topup_error(response)
    response.raise_for_status()
    return response.json()


async def create_telegram_topup_invoice(wallet_adr: str, amount: str) -> dict:
    url = f"{BACKEND_URL}/topup/telegram-invoice"
    payload = {
        "wallet_address": wallet_adr,
        "amount": amount,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=_topup_headers())

    _raise_for_topup_error(response)
    response.raise_for_status()
    return response.json()


async def confirm_telegram_topup_paid(
    *,
    topup_id: int,
    currency: str,
    total_amount: int,
    provider_payment_charge_id: str | None,
    telegram_payment_charge_id: str | None,
) -> dict:
    url = f"{BACKEND_URL}/topup/telegram-paid"
    payload = {
        "topup_id": topup_id,
        "currency": currency,
        "total_amount": total_amount,
        "provider_payment_charge_id": provider_payment_charge_id,
        "telegram_payment_charge_id": telegram_payment_charge_id,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, json=payload, headers=_topup_headers())

    _raise_for_topup_error(response)
    response.raise_for_status()
    return response.json()
