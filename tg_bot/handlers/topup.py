from decimal import Decimal, InvalidOperation, ROUND_DOWN, ROUND_HALF_UP, ROUND_UP
import os
from dotenv import load_dotenv
import requests as rq

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, LabeledPrice, Message, PreCheckoutQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

from services.topup_api import (
    TopupCooldownError,
    TopupInvoiceAmountError,
    TopupUserNotFoundError,
    TopupWalletNotFoundError,
    confirm_telegram_topup_paid,
    create_telegram_topup_invoice,
    mark_telegram_topup_invoice_failed,
)
from services.frontend_url import get_frontend_url
from states.TopupState import TopupStates

load_dotenv()

router = Router()

SITE_URL = get_frontend_url()
API_URL = os.getenv("API_DOCKER_URL")
YOOKASSA_TG_PROVIDER_TOKEN = os.getenv("YOOKASSA_TG_PROVIDER_TOKEN")
TOPUP_RUB_PER_TON = Decimal(os.getenv("TOPUP_RUB_PER_TON", "100"))
TOPUP_MIN_AMOUNT = Decimal(os.getenv("TOPUP_MIN_AMOUNT", "0"))
TOPUP_MAX_AMOUNT = Decimal(os.getenv("TOPUP_MAX_AMOUNT", "10000"))
YOOKASSA_MIN_PAYMENT_RUB = Decimal(os.getenv("YOOKASSA_MIN_PAYMENT_RUB", str(TOPUP_RUB_PER_TON)))
TELEGRAM_MIN_INVOICE_AMOUNT = int((YOOKASSA_MIN_PAYMENT_RUB * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))
TELEGRAM_MAX_INVOICE_AMOUNT = 99_999_999
TEST_PAYMENT_HINT = (
    "Test payment mode:\n"
    "- real money will not be charged;\n"
    "- for card payment use test card 5555 5555 5555 4444, any future date and any CVC;\n"
    "- for YooMoney wallet payment, log out of your real YooMoney account first."
)


def get_site_link_keyboard() -> InlineKeyboardMarkup | None:
    if not SITE_URL:
        return None

    builder = InlineKeyboardBuilder()
    builder.button(text="Open website", url=SITE_URL)
    return builder.as_markup()


def format_seconds_to_human(seconds: int) -> str:
    minutes = seconds // 60
    secs = seconds % 60

    if minutes > 0:
        return f"{minutes} min. {secs} sec."
    return f"{secs} sec."


def format_decimal(value: Decimal | str) -> str:
    decimal_value = Decimal(str(value))
    return format(decimal_value.normalize(), "f")


def get_topup_price_kopecks(amount: Decimal) -> int:
    rub_amount = (amount * TOPUP_RUB_PER_TON).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int((rub_amount * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def get_effective_max_topup_amount() -> Decimal:
    telegram_max_rub = Decimal(TELEGRAM_MAX_INVOICE_AMOUNT) / Decimal("100")
    telegram_max_ton = (telegram_max_rub / TOPUP_RUB_PER_TON).quantize(
        Decimal("0.01"),
        rounding=ROUND_DOWN,
    )
    return min(TOPUP_MAX_AMOUNT, telegram_max_ton)


def get_effective_min_topup_amount() -> Decimal:
    telegram_min_rub = Decimal(TELEGRAM_MIN_INVOICE_AMOUNT) / Decimal("100")
    telegram_min_ton = (telegram_min_rub / TOPUP_RUB_PER_TON).quantize(
        Decimal("0.01"),
        rounding=ROUND_UP,
    )
    return max(TOPUP_MIN_AMOUNT, telegram_min_ton)


def parse_topup_payload(payload: str | None) -> int | None:
    if not payload:
        return None

    parts = payload.split(":")
    if len(parts) < 2 or parts[0] != "topup":
        return None

    try:
        return int(parts[1])
    except ValueError:
        return None


async def start_topup_flow(message: Message, state: FSMContext) -> None:
    min_amount = get_effective_min_topup_amount()
    max_amount = get_effective_max_topup_amount()
    await state.set_state(TopupStates.waiting_for_topup_amount)
    await message.answer(
        "Enter the amount in TON.\n\n"
        f"Rate: 1 TON = {format_decimal(TOPUP_RUB_PER_TON)} RUB\n"
        f"Amount: {format_decimal(min_amount)} - {format_decimal(max_amount)} TON\n\n"
        f"{TEST_PAYMENT_HINT}"
    )


@router.callback_query(F.data == "topup")
async def top_up_start_handler(callback: CallbackQuery, state: FSMContext) -> None:
    await start_topup_flow(callback.message, state)
    await callback.answer()


@router.message(Command("topup"))
async def top_up_command_handler(message: Message, state: FSMContext) -> None:
    await start_topup_flow(message, state)


@router.message(TopupStates.waiting_for_topup_amount)
async def top_up_amount_handler(message: Message, state: FSMContext) -> None:
    raw_amount = (message.text or "").strip().replace(",", ".")
    tg_id = message.from_user.id

    if not YOOKASSA_TG_PROVIDER_TOKEN:
        await message.answer("YooKassa payment token is not configured.")
        await state.clear()
        return

    try:
        res = rq.get(f"{API_URL}/user-info/tg/{tg_id}", timeout=10)
    except rq.RequestException:
        await message.answer("Failed to reach the backend. Please try again later.")
        await state.clear()
        return

    if res.status_code != 200:
        await message.answer(
            "It looks like you don't have an account on the site yet.\n\n"
            "Please, visit the site and log in to create your profile.",
            reply_markup=get_site_link_keyboard(),
        )
        await state.clear()
        return
    
    profile = res.json()

    try:
        amount = Decimal(raw_amount)
    except InvalidOperation:
        await message.answer("Please enter a valid number.")
        return

    if amount < TOPUP_MIN_AMOUNT:
        await message.answer(f"The amount must be at least {format_decimal(TOPUP_MIN_AMOUNT)}.")
        return

    effective_min_amount = get_effective_min_topup_amount()
    if amount < effective_min_amount:
        await message.answer(
            "The payment amount is too small for Telegram/YooMoney payments.\n\n"
            f"Please enter at least {format_decimal(effective_min_amount)} TON."
        )
        return

    if amount > TOPUP_MAX_AMOUNT:
        await message.answer(f"The amount must be less than or equal to {format_decimal(TOPUP_MAX_AMOUNT)}.")
        return

    price_kopecks = get_topup_price_kopecks(amount)
    if price_kopecks < TELEGRAM_MIN_INVOICE_AMOUNT:
        await message.answer(
            "The payment amount is too small for Telegram/YooMoney payments.\n\n"
            f"Please enter at least {format_decimal(get_effective_min_topup_amount())} TON."
        )
        return

    if price_kopecks > TELEGRAM_MAX_INVOICE_AMOUNT:
        await message.answer(
            "The payment amount is too large for Telegram payments.\n\n"
            f"Please enter from {format_decimal(get_effective_min_topup_amount())} "
            f"to {format_decimal(get_effective_max_topup_amount())} TON."
        )
        return

    try:
        invoice = await create_telegram_topup_invoice(
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
    except TopupInvoiceAmountError:
        await message.answer(
            "The payment amount is outside Telegram payment limits.\n\n"
            f"Please enter from {format_decimal(get_effective_min_topup_amount())} "
            f"to {format_decimal(get_effective_max_topup_amount())} TON."
        )
        return
    except Exception:
        await message.answer("Failed to create a payment invoice. Please try again later.")
        await state.clear()
        return

    try:
        await message.answer_invoice(
            title=f"Moon balance top-up: {invoice['amount']} TON",
            description=(
                f"{invoice['amount']} TON at the rate "
                f"1 TON = {invoice['rate_rub_per_ton']} RUB"
            ),
            payload=f"topup:{invoice['topup_id']}:{tg_id}",
            provider_token=YOOKASSA_TG_PROVIDER_TOKEN,
            currency=invoice["currency"],
            prices=[
                LabeledPrice(
                    label=f"{invoice['amount']} TON",
                    amount=int(invoice["price_kopecks"]),
                )
            ],
        )
    except TelegramBadRequest as exc:
        try:
            await mark_telegram_topup_invoice_failed(int(invoice["topup_id"]))
        except Exception as mark_error:
            print(f"Failed to mark rejected top-up invoice as failed: {mark_error}")

        if "CURRENCY_TOTAL_AMOUNT_INVALID" in str(exc):
            await message.answer(
                "Telegram rejected this payment amount.\n\n"
                f"Please enter from {format_decimal(get_effective_min_topup_amount())} "
                f"to {format_decimal(get_effective_max_topup_amount())} TON."
            )
        else:
            await message.answer("Telegram rejected the payment invoice. Please try again later.")
        await state.clear()
        return

    await message.answer(
        "Invoice created.\n\n"
        f"Top-up: {invoice['amount']} TON\n"
        f"To pay: {invoice['rub_amount']} RUB\n\n"
        f"{TEST_PAYMENT_HINT}"
    )
    await state.clear()


@router.pre_checkout_query()
async def topup_pre_checkout_handler(query: PreCheckoutQuery) -> None:
    topup_id = parse_topup_payload(query.invoice_payload)
    if not topup_id:
        await query.answer(ok=False, error_message="Invalid top-up invoice.")
        return

    await query.answer(ok=True)


@router.message(F.successful_payment)
async def topup_successful_payment_handler(message: Message) -> None:
    payment = message.successful_payment
    topup_id = parse_topup_payload(payment.invoice_payload)

    if not topup_id:
        await message.answer("Payment received, but the invoice payload is invalid. Please contact support.")
        return

    try:
        result = await confirm_telegram_topup_paid(
            topup_id=topup_id,
            currency=payment.currency,
            total_amount=payment.total_amount,
            provider_payment_charge_id=payment.provider_payment_charge_id,
            telegram_payment_charge_id=payment.telegram_payment_charge_id,
        )
    except TopupWalletNotFoundError:
        await message.answer("Payment received, but your wallet was not found. Please contact support.")
        return
    except Exception:
        await message.answer("Payment received, but balance top-up failed. Please contact support.")
        return

    await message.answer(
        "Balance topped up successfully.\n\n"
        f"Amount: {result['amount']} TON\n"
        f"New balance: {result['new_balance']} TON\n"
        f"Tx hash: {result['tx_hash']}"
    )
