from decimal import Decimal, InvalidOperation
import os
from dotenv import load_dotenv
import requests as rq

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from services.topup_api import (
    TopupCooldownError,
    TopupUserNotFoundError,
    TopupWalletNotFoundError,
    topup_topup_by_wal_adr,
)
from services.frontend_url import get_frontend_url
from states.TopupState import TopupStates

load_dotenv()

router = Router()

SITE_URL = get_frontend_url()
API_URL = os.getenv("API_DOCKER_URL")
TOPUP_MAX_AMOUNT = Decimal("10000")


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
    await callback.message.answer("Enter a top-up amount between 0 and 10000:")
    await callback.answer()


@router.message(TopupStates.waiting_for_topup_amount)
async def top_up_amount_handler(message: Message, state: FSMContext) -> None:
    raw_amount = (message.text or "").strip().replace(",", ".")
    tg_id = message.from_user.id

    res = rq.get(f"{API_URL}/user-info/tg/{tg_id}")

    if res.status_code != 200:
        await message.answer(f"It looks like you don't have an account on the site yet.\n\nPlease, visit the site and log in to create your profile.\n\n{res.text[:3900]}", reply_markup=contacts)
        return
    
    profile = res.json()

    try:
        amount = Decimal(raw_amount)
    except InvalidOperation:
        await message.answer("Please enter a valid number.")
        return

    if amount <= 0:
        await message.answer("The amount must be greater than 0.")
        return

    if amount > TOPUP_MAX_AMOUNT:
        await message.answer("The amount must be less than or equal to 10000.")
        return

    try:
        result = await topup_topup_by_wal_adr(
            wallet_adr=profile['wallet_address'],
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
