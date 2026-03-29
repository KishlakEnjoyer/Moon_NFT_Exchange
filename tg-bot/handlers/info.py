from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command
import requests as rq
import os
from dotenv import load_dotenv

load_dotenv()

router = Router()

@router.message(Command('info'))
async def display_info(message: Message):
    await message.answer(
        "🔃 Loading\n\n"
    )
    res = rq.get(f'{os.getenv("API_URL")}' + '/tg/' + message.from_user.id + "/balance")

    if(res.status_code != 200):
        await message.edit_text("Error!")

    res_json = res.json()

    await message.edit_text(
        "Profile info\n\n"
        f"{res_json.}"
    )