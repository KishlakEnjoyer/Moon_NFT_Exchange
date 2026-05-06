from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from keyboards.infoKeyboard import contacts
from keyboards.profileKeyboard import get_profile_keyboard

import os
from dotenv import load_dotenv
import requests as rq

load_dotenv()

router = Router()

API_URL = os.getenv("API_DOCKER_URL") or os.getenv("REACT_APP_API_URL")
SITE_URL = os.getenv("REACT_APP_FRONT_URL")
REQUEST_TIMEOUT = 10


@router.message(Command("profile"))
async def profile_handler(message: Message) -> None:
    tg_id = message.from_user.id

    if not API_URL:
        await message.answer("Backend URL is not configured. Please try again later.")
        return

    try:
        res = rq.get(f"{API_URL}/user-info/tg/{tg_id}", timeout=REQUEST_TIMEOUT)
    except rq.RequestException as e:
        await message.answer(f"Backend is temporarily unavailable. Please try again later.\n\nError: {e}")
        return

    if res.status_code != 200:
        await message.answer(f"It looks like you don't have an account on the site yet.\n\nPlease, visit the site and log in to create your profile.\n\n{res.text[:3900]}", reply_markup=contacts)
        return
    
    profile = res.json()

    text = (
        f"👤 User Profile\n\n"
        f"Username: {profile['username']}\n"
        f"Role: {profile['role']}\n"
        f"Gifts: {profile['gifts_count']}\n"
        f"Active listings: {profile['active_listings_count']}\n"
        f"Sales: {profile['sales_count']}\n"
        f"TON balance: {profile['token_balance']}"
    )

    await message.answer(text, reply_markup=get_profile_keyboard(profile['username']))
