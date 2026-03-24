from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from keyboards.confirmKeyboard import confirm_keyboard
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