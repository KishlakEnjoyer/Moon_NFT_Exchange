from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

from services.frontend_url import build_account_url

load_dotenv()

def get_profile_keyboard(nickname: str) -> InlineKeyboardMarkup:
    buttons = []
    account_url = build_account_url(nickname)
    if account_url:
        buttons.append([InlineKeyboardButton(text=f"{nickname}'s profile", url=account_url)])

    buttons.append([InlineKeyboardButton(text='💰 Top up balance', callback_data='topup')])
    return InlineKeyboardMarkup(inline_keyboard=buttons)
