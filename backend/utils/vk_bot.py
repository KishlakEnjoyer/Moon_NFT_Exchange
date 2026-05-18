import os
import time

import httpx


VK_BOT_TOKEN = os.getenv("VK_BOT_TOKEN")
VK_API_VERSION = os.getenv("VK_API_VERSION", "5.199")


def send_vk_message_sync(vk_id: int | None, text: str) -> bool:
    if not VK_BOT_TOKEN or not vk_id:
        return False

    payload = {
        "user_id": int(vk_id),
        "message": text,
        "random_id": int(time.time() * 1000),
        "access_token": VK_BOT_TOKEN,
        "v": VK_API_VERSION,
    }

    try:
        with httpx.Client() as client:
            response = client.post("https://api.vk.com/method/messages.send", data=payload, timeout=10)
            if response.status_code != 200:
                print(f"[VK DEBUG] Failed to send message: {response.text}")
                return False

            data = response.json()
            if data.get("error"):
                print(f"[VK DEBUG] Failed to send message: {data['error']}")
                return False

            return True
    except Exception as exc:
        print(f"[VK DEBUG] Exception sending VK message: {exc}")
        return False
