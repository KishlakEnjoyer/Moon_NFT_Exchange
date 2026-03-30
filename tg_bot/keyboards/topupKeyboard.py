from aiogram.utils.keyboard import ReplyKeyboardBuilder

def get_topup_keyboard():
    builder = ReplyKeyboardBuilder()
    builder.button(text="💰 Top up")
    return builder.as_markup(resize_keyboard=True)