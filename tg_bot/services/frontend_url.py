import os
from urllib.parse import quote, urlparse


LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}


def _is_public_http_url(url: str | None) -> bool:
    if not url:
        return False

    parsed = urlparse(url)
    host = parsed.hostname
    return parsed.scheme in {"http", "https"} and bool(host) and host not in LOCAL_HOSTS


def get_frontend_url() -> str | None:
    for key in ("BOT_FRONT_URL", "PUBLIC_FRONT_URL", "REACT_APP_FRONT_URL"):
        url = os.getenv(key)
        if _is_public_http_url(url):
            return url.rstrip("/")

    return None


def build_account_url(nickname: str) -> str | None:
    frontend_url = get_frontend_url()
    if not frontend_url:
        return None

    return f"{frontend_url}/account/{quote(nickname, safe='')}"
