from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
import os
from dotenv import load_dotenv

load_dotenv()

def get_profile_keyboard(nickname: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f'{nickname}\'s profile', url=f'{os.getenv("REACT_APP_FRONT_URL")}/account/{nickname}')],
        [InlineKeyboardButton(text='💰 Top up balance', callback_data='topup')],
    ])
