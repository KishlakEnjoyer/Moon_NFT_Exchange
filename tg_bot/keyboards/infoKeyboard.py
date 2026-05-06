from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

from services.frontend_url import get_frontend_url

load_dotenv()

contact_buttons = []
frontend_url = get_frontend_url()
if frontend_url:
    contact_buttons.append([InlineKeyboardButton(text='Moon NFT', url=frontend_url)])
contact_buttons.append([InlineKeyboardButton(text='GitHub', url='https://github.com/KishlakEnjoyer')])

contacts = InlineKeyboardMarkup(inline_keyboard=contact_buttons)
