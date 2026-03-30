from decimal import Decimal, InvalidOperation
import os
from dotenv import load_dotenv

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from services.topup_api import (
    TopupCooldownError,
    TopupUserNotFoundError,
    TopupWalletNotFoundError,
    topup_topup_by_tg_id,
)
from states.TopupState import TopupStates

load_dotenv()

router = Router()

SITE_URL = os.getenv("REACT_APP_FRONT_URL")


def get_site_link_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Open website", url=SITE_URL)
    return builder.as_markup()


def format_seconds_to_human(seconds: int) -> str:
    minutes = seconds // 60
    secs = seconds % 60

    if minutes > 0:
        return f"{minutes} min. {secs} sec."
    return f"{secs} sec."


@router.callback_query(F.data == "topup")
async def top_up_start_handler(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(TopupStates.waiting_for_topup_amount)
    await callback.message.answer("Enter a top-up amount between 0 and 1000000:")
    await callback.answer()


@router.message(TopupStates.waiting_for_topup_amount)
async def top_up_amount_handler(message: Message, state: FSMContext) -> None:
    raw_amount = (message.text or "").strip().replace(",", ".")
    tg_id = message.from_user.id

    try:
        amount = Decimal(raw_amount)
    except InvalidOperation:
        await message.answer("Please enter a valid number.")
        return

    if amount <= 0:
        await message.answer("The amount must be greater than 0.")
        return

    if amount >= Decimal("1000000"):
        await message.answer("The amount must be less than 1000000.")
        return

    try:
        result = await topup_topup_by_tg_id(
            tg_id=tg_id,
            amount=str(amount),
        )
    except TopupUserNotFoundError:
        await message.answer(
            "You are not registered on the website yet.\n\n"
            "Please register first to get a wallet and use top-ups.",
            reply_markup=get_site_link_keyboard(),
        )
        await state.clear()
        return
    except TopupWalletNotFoundError:
        await message.answer(
            "You do not have a wallet on the website yet.\n\n"
            "Please open the website and finish registration.",
            reply_markup=get_site_link_keyboard(),
        )
        await state.clear()
        return
    except TopupCooldownError as e:
        await message.answer(
            "You can top up your balance only once every 5 minutes.\n\n"
            f"Please try again in: {format_seconds_to_human(e.remaining_seconds)}"
        )
        await state.clear()
        return
    except Exception:
        await message.answer("Failed to top up the balance. Please try again later.")
        await state.clear()
        return

    await message.answer(
        "Balance topped up successfully.\n\n"
        f"Amount: {result['amount']}\n"
        f"New balance: {result['new_balance']}\n"
        f"Tx hash: {result['tx_hash']}"
    )
    await state.clear()