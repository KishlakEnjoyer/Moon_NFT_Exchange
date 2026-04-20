import re
import requests
from vkbottle.bot import BotLabeler, Message
import os
from dotenv import load_dotenv

load_dotenv()

auth_labeler = BotLabeler()

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
REACT_APP_API_URL = os.getenv("API_DOCKER_URL")


@auth_labeler.message()
async def auth_handler(message: Message):
    text = (message.text or "").strip()

    if not UUID_RE.match(text):
        return

    payload = {
        "state": text,
        "vk_id": message.from_id,
    }

    res = requests.post(f"{REACT_APP_API_URL}/auth/vk/confirm", json=payload, timeout=10)

    if res.status_code == 200:
        await message.answer("✅ Account linked. Return to the website.")
    else:
        await message.answer(f"❌ Linking error: {res.text[:500]}")


