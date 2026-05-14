import os

from dotenv import load_dotenv
import requests


load_dotenv()

BACKEND_URL = os.getenv("API_DOCKER_URL") or os.getenv("REACT_APP_API_URL")
TOPUP_INTERNAL_SECRET = os.getenv("TOPUP_INTERNAL_SECRET")


class TopupCooldownError(Exception):
    def __init__(self, remaining_seconds: int):
        self.remaining_seconds = remaining_seconds
        super().__init__(f"Cooldown active: {remaining_seconds}")


class TopupUserNotFoundError(Exception):
    pass


class TopupWalletNotFoundError(Exception):
    pass


class TopupPaymentAmountError(Exception):
    pass


class TopupPaymentPendingError(Exception):
    pass


class TopupPaymentFailedError(Exception):
    pass


class TopupConfigurationError(Exception):
    pass


def _topup_headers() -> dict[str, str]:
    return {"X-Topup-Secret": TOPUP_INTERNAL_SECRET or ""}


def _response_detail(response: requests.Response):
    try:
        return response.json().get("detail")
    except ValueError:
        return response.text[:500]


def _raise_for_topup_error(response: requests.Response) -> None:
    if response.status_code == 404:
        raise TopupUserNotFoundError()

    if response.status_code == 400:
        detail = _response_detail(response)
        if detail == "User wallet not found":
            raise TopupWalletNotFoundError()
        if detail == "YooKassa payment is not succeeded":
            raise TopupPaymentPendingError()
        if detail in {"Topup already failed", "Topup is not pending"}:
            raise TopupPaymentFailedError(detail)
        if isinstance(detail, str) and "amount" in detail.lower():
            raise TopupPaymentAmountError(detail)
        raise RuntimeError(str(detail))

    if response.status_code == 403:
        raise TopupConfigurationError("Top-up API secret is invalid")

    if response.status_code == 429:
        detail = _response_detail(response)
        if isinstance(detail, dict):
            raise TopupCooldownError(int(detail.get("remaining_seconds", 0)))
        raise TopupCooldownError(0)

    if response.status_code in {500, 502, 503, 504}:
        detail = _response_detail(response)
        if isinstance(detail, str) and "YooKassa" in detail and "not configured" in detail:
            raise TopupConfigurationError(detail)
        raise RuntimeError(str(detail))


def create_yookassa_topup_payment(wallet_adr: str, amount: str) -> dict:
    if not BACKEND_URL:
        raise TopupConfigurationError("Backend URL is not configured")

    url = f"{BACKEND_URL}/topup/yookassa-payment"
    payload = {
        "wallet_address": wallet_adr,
        "amount": amount,
    }

    response = requests.post(url, json=payload, headers=_topup_headers(), timeout=40)
    _raise_for_topup_error(response)
    response.raise_for_status()
    return response.json()


def confirm_yookassa_topup_payment(topup_id: int, payment_id: str) -> dict:
    if not BACKEND_URL:
        raise TopupConfigurationError("Backend URL is not configured")

    url = f"{BACKEND_URL}/topup/yookassa-payment/{topup_id}/confirm"
    payload = {
        "payment_id": payment_id,
    }

    response = requests.post(url, json=payload, headers=_topup_headers(), timeout=180)
    _raise_for_topup_error(response)
    response.raise_for_status()
    return response.json()
