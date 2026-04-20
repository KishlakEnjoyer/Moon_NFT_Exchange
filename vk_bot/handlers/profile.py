import os
import requests
from dotenv import load_dotenv
from vkbottle.bot import BotLabeler, Message

load_dotenv()

profile_labeler = BotLabeler()

API_URL = os.getenv("API_DOCKER_URL")
SITE_URL = os.getenv("REACT_APP_FRONT_URL")


@profile_labeler.message(text=["profile", "профиль"])
async def profile_handler(message: Message):
    vk_id = message.from_id

    try:
        res = requests.get(f"{API_URL}/user-info/vk/{vk_id}", timeout=10)
    except Exception as e:
        await message.answer(f"Ошибка запроса к backend: {e}")
        return

    if res.status_code != 200:
        await message.answer(
            "Профиль пока не найден.\n\n"
            "Скорее всего, backend ещё не умеет искать пользователя по VK ID.\n"
            f"Откройте сайт: {SITE_URL}\n\n"
            f"Ответ backend: {res.text[:700]}"
        )
        return

    profile = res.json()

    text = (
        f"👤 Профиль Moon\n\n"
        f"Username: {profile.get('username')}\n"
        f"Role: {profile.get('role')}\n"
        f"Gifts: {profile.get('gifts_count')}\n"
        f"Active listings: {profile.get('active_listings_count')}\n"
        f"Sales: {profile.get('sales_count')}\n"
        f"Balance: {profile.get('token_balance')}"
    )

    await message.answer(text)