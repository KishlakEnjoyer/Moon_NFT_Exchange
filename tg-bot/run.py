import asyncio
import logging
import os
import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, BotCommand
from aiogram.filters import CommandStart, CommandObject
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart(deep_link=True))
async def start_with_auth(message: Message, command: CommandObject):
    """
    Юзер пришёл по ссылке t.me/бот?start=auth_xxxxxxxx
    """
    param = command.args  

    if not param or not param.startswith("auth_"):
        await message.answer("Привет! Используй кнопку на сайте для авторизации.")
        return

    auth_token = param[5:]  
    user = message.from_user

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/api/auth/telegram",
                json={
                    "tg_id": user.id,
                    "username": user.username or f"user_{user.id}",
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "auth_token": auth_token
                },
                timeout=10.0
            )
            resp.raise_for_status()
            await message.answer(
                f"✅ Привет, {user.first_name}!\n\n"
                "Авторизация прошла успешно. Вернись на сайт — он автоматически войдёт в аккаунт."
            )
        except Exception as e:
            await message.answer("❌ Ошибка авторизации. Попробуй ещё раз.")
            logging.error(f"Auth error: {e}")


@dp.message(CommandStart())
async def start_no_param(message: Message):
    """Обычный /start без параметра"""
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\n"
        "Я бот платформы Moon NFT Exchange.\n"
        "Для авторизации используй кнопку на сайте."
    )


async def main():
    commands = [
        BotCommand(command="start", description="Главное меню"),
    ]
    await bot.set_my_commands(commands)
    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Bot running!")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Bot stopped!")