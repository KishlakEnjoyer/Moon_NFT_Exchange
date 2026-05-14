import os
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from vkbottle.bot import BotLabeler, Message

load_dotenv()

profile_labeler = BotLabeler()

API_URL = os.getenv("API_DOCKER_URL") or os.getenv("REACT_APP_API_URL")
SITE_URL = os.getenv("BOT_FRONT_URL") or os.getenv("REACT_APP_FRONT_URL")


def build_account_url(username: str | None) -> str | None:
    if not SITE_URL or not username:
        return None

    return f"{SITE_URL.rstrip('/')}/account/{quote(username, safe='')}"


@profile_labeler.message(text=["profile", "профиль"])
async def profile_handler(message: Message):
    vk_id = message.from_id
    if not API_URL:
        await message.answer("Backend URL не настроен. Попробуй позже.")
        return

    try:
        res = requests.get(f"{API_URL}/user-info/vk/{vk_id}", timeout=10)
    except Exception as e:
        await message.answer(f"Ошибка запроса к backend: {e}")
        return

    if res.status_code != 200:
        await message.answer(
            "Профиль пока не найден.\n\n"
            "Зайди на сайт и привяжи VK, чтобы бот мог показать данные профиля.\n"
            f"Сайт: {SITE_URL or 'не настроен'}\n\n"
            f"Ответ backend: {res.text[:700]}"
        )
        return

    profile = res.json()
    account_url = build_account_url(profile.get("username"))
    account_text = f"\nПрофиль на сайте: {account_url}" if account_url else ""
    wallet_text = f"\nWallet: {profile.get('wallet_address')}" if profile.get("wallet_address") else ""

    text = (
        f"👤 Профиль Moon\n\n"
        f"Username: {profile.get('username')}\n"
        f"Role: {profile.get('role')}\n"
        f"Gifts: {profile.get('gifts_count')}\n"
        f"Active listings: {profile.get('active_listings_count')}\n"
        f"Sales: {profile.get('sales_count')}\n"
        f"TON balance: {profile.get('token_balance')}"
        f"{wallet_text}"
        f"{account_text}"
    )

    await message.answer(text)
