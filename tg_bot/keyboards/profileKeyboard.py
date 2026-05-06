from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

from services.frontend_url import build_account_url

load_dotenv()

def get_profile_keyboard(nickname: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f'{nickname}\'s profile', url=build_account_url(nickname))],
        [InlineKeyboardButton(text='💰 Top up balance', callback_data='topup')],
    ])
