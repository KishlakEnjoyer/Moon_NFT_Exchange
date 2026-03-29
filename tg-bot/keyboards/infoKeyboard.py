from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
import os
from dotenv import load_dotenv

load_dotenv()

contacts = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Moon NFT', url=os.getenv("REACT_APP_FRONT_URL"))],
    [InlineKeyboardButton(text='GitHub', url='https://github.com/KishlakEnjoyer')],
])