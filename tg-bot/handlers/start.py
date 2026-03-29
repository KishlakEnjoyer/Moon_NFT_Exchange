from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from keyboards.confirmKeyboard import confirm_keyboard
from keyboards.infoKeyboard import contacts
from states.AuthState import AuthState

router = Router()


@router.message(CommandStart(deep_link=True))
async def start_with_state(message: Message, command: CommandStart, state: FSMContext):
    auth_state = command.args

    if not auth_state:
        await message.answer("Auth state not found.")
        return

    await state.update_data(auth_state=auth_state)
    await state.set_state(AuthState.waiting_confirm)

    await message.answer(
        "Do you confirm login to Moon NFT Exchange?",
        reply_markup=confirm_keyboard
    )

@router.message(CommandStart())
async def start_with_state(message: Message):
    await message.answer(
            "🌙 Welcome to Moon — NFT Marketplace on TON\n\n"
            "Here's what I can do for you:\n\n"
            "🔐 <b>Sign in to Moon</b>\n"
            "Log in to the platform securely via Telegram — no passwords, no hassle\n\n"
            "💎 <b>Top up your balance</b>\n"
            "Deposit TON to your Moon account and start trading in seconds\n\n"
            "🔔 <b>Notifications</b>\n"
            "Get instant updates on your listings, bids and transactions — right here in Telegram\n\n"
            "──────────────────────\n"
            "Tap a button below to get started 👇",
            parse_mode="HTML",
            reply_markup=contacts
        )