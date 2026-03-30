from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder

def get_topup_keyboard():
    builder = ReplyKeyboardBuilder()
    builder.button(text="💰 Top up")
    return builder.as_markup(resize_keyboard=True)

def get_topup_inline_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Top up", callback_data="topup")
    return builder.as_markup()