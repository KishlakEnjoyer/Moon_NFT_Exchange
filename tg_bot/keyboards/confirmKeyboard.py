from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

confirm_keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="✅ Confirm", callback_data='confirm'),
        InlineKeyboardButton(text="❌ Decline", callback_data='decline'),
    ]
])