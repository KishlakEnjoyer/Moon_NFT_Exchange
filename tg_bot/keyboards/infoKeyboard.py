from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

from services.frontend_url import get_frontend_url

load_dotenv()

contacts = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Moon NFT', url=get_frontend_url())],
    [InlineKeyboardButton(text='GitHub', url='https://github.com/KishlakEnjoyer')],
])
