import asyncio
import logging
import os
from aiogram import Bot, Dispatcher
from aiogram.types import BotCommand
from dotenv import load_dotenv

from handlers import start, confirm_auth, info, topup

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = os.getenv("API_URL")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

dp.include_router(start.router)
dp.include_router(confirm_auth.router)
dp.include_router(info.router)
dp.include_router(topup.router)


async def main():
    commands = [
        BotCommand(command="start", description="Start authentication process"),
        BotCommand(command="profile", description="Info about your profile"),
        BotCommand(command="topup", description="Top up your balance"),
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
