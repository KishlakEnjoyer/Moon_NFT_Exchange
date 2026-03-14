import asyncio
import logging
import threading
import os
from aiogram import Bot, Dispatcher
from aiogram.types import BotCommand
from dotenv import load_dotenv

# from handlers import start, room, game


load_dotenv()

bot = Bot(token=os.getenv("BOT_TOKEN"))
dp = Dispatcher()


async def main():
    commands = [
        BotCommand(command="start", description="Главное меню"),
        BotCommand(command="profile", description="Личный кабинет")
    ]
    await bot.set_my_commands(commands)
    await dp.start_polling(bot)
    
@dp.message_handler(commands=['start'])
async def start(message):
    await message.answer('Hi, health 200.')

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    print('Bot running!')
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Bot stopped!')