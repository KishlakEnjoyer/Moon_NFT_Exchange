import os
import httpx

BOT_TOKEN = os.getenv("BOT_TOKEN")


def send_tg_message_sync(tg_id: int | None, text: str) -> bool:
    if not BOT_TOKEN or not tg_id:
        print(f"[TG DEBUG] No bot token or tg_id ({tg_id})")
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": tg_id,
        "text": text,
        "parse_mode": "Markdown",
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=10)
            if response.status_code != 200:
                print(f"[TG DEBUG] Failed to send message: {response.text}")
            return response.status_code == 200
    except Exception as e:
        print(f"[TG DEBUG] Exception sending TG message: {e}")
        return False


async def send_tg_message(tg_id: int | None, text: str) -> bool:
    if not BOT_TOKEN or not tg_id:
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": tg_id,
        "text": text,
        "parse_mode": "Markdown",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=10)
        return response.status_code == 200
