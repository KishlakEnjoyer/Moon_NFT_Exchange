from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, ROUND_UP
import asyncio
import os

from dotenv import load_dotenv
import requests as rq
from vkbottle.bot import BotLabeler, Message

from services.topup_api import (
    TopupConfigurationError,
    TopupCooldownError,
    TopupPaymentAmountError,
    TopupPaymentFailedError,
    TopupPaymentPendingError,
    TopupUserNotFoundError,
    TopupWalletNotFoundError,
    confirm_yookassa_topup_payment,
    create_yookassa_topup_payment,
)

load_dotenv()

topup_labeler = BotLabeler()

API_URL = os.getenv("API_DOCKER_URL") or os.getenv("REACT_APP_API_URL")
SITE_URL = os.getenv("BOT_FRONT_URL") or os.getenv("REACT_APP_FRONT_URL")
TOPUP_RUB_PER_TON = Decimal(os.getenv("TOPUP_RUB_PER_TON", "100"))
TOPUP_MIN_AMOUNT = Decimal(os.getenv("TOPUP_MIN_AMOUNT", "0"))
TOPUP_MAX_AMOUNT = Decimal(os.getenv("TOPUP_MAX_AMOUNT", "10000"))
YOOKASSA_MIN_PAYMENT_RUB = Decimal(os.getenv("YOOKASSA_MIN_PAYMENT_RUB", str(TOPUP_RUB_PER_TON)))
YOOKASSA_TEST_MODE = os.getenv("YOOKASSA_TEST_MODE", "false").lower() == "true"
YOOKASSA_POLL_INTERVAL_SECONDS = int(os.getenv("YOOKASSA_POLL_INTERVAL_SECONDS", "10"))
YOOKASSA_POLL_ATTEMPTS = int(os.getenv("YOOKASSA_POLL_ATTEMPTS", "60"))


def format_decimal(value: Decimal | str) -> str:
    decimal_value = Decimal(str(value))
    return format(decimal_value.normalize(), "f")


def get_effective_min_topup_amount() -> Decimal:
    yookassa_min_ton = (YOOKASSA_MIN_PAYMENT_RUB / TOPUP_RUB_PER_TON).quantize(
        Decimal("0.01"),
        rounding=ROUND_UP,
    )
    return max(TOPUP_MIN_AMOUNT, yookassa_min_ton)


def get_topup_price_kopecks(amount: Decimal) -> int:
    rub_amount = (amount * TOPUP_RUB_PER_TON).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int((rub_amount * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def format_seconds_to_human(seconds: int) -> str:
    minutes = seconds // 60
    secs = seconds % 60
    if minutes > 0:
        return f"{minutes} мин. {secs} сек."
    return f"{secs} сек."


def site_hint() -> str:
    if SITE_URL:
        return f"\n\nСайт: {SITE_URL}"
    return ""


def test_payment_hint() -> str:
    if not YOOKASSA_TEST_MODE:
        return ""

    return (
        "\n\nТестовый режим: реальные деньги не спишутся. "
        "Для оплаты картой можно использовать 5555 5555 5555 4444, любую будущую дату и CVC."
    )


async def poll_yookassa_payment_status(message: Message, topup_id: int, payment_id: str) -> None:
    for _ in range(YOOKASSA_POLL_ATTEMPTS):
        await asyncio.sleep(YOOKASSA_POLL_INTERVAL_SECONDS)

        try:
            result = await asyncio.to_thread(
                confirm_yookassa_topup_payment,
                topup_id=topup_id,
                payment_id=payment_id,
            )
        except TopupPaymentPendingError:
            continue
        except TopupPaymentFailedError:
            await message.answer(
                "Не удалось подтвердить платёж. Если деньги списались, напиши в поддержку "
                f"и укажи номер пополнения #{topup_id}."
            )
            return
        except Exception as exc:
            print(f"Failed to poll YooKassa top-up #{topup_id}: {exc}")
            continue

        await message.answer(
            "Баланс пополнен успешно.\n\n"
            f"Пополнение: {result['amount']} TON\n"
            f"Новый баланс: {result['new_balance']} TON\n"
            f"Tx hash: {result['tx_hash']}"
        )
        return

    await message.answer(
        "Платёж пока не подтверждён. Если ты уже оплатил, но баланс не обновился, "
        f"напиши в поддержку и укажи номер пополнения #{topup_id}."
    )


async def start_topup_flow(message: Message) -> None:
    min_amount = get_effective_min_topup_amount()
    await message.answer(
        "Пополнение баланса через ЮKassa.\n\n"
        f"Курс: 1 TON = {format_decimal(TOPUP_RUB_PER_TON)} RUB\n"
        f"Сумма: {format_decimal(min_amount)} - {format_decimal(TOPUP_MAX_AMOUNT)} TON\n\n"
        "Напиши сумму командой, например: пополнить 10"
        f"{test_payment_hint()}"
    )



@topup_labeler.message(text=["topup", "/topup", "пополнить", "пополнение", "баланс"])
async def topup_start_handler(message: Message):
    await start_topup_flow(message)


@topup_labeler.message(text=["topup <amount>", "/topup <amount>", "пополнить <amount>", "пополнение <amount>"])
async def topup_amount_handler(message: Message, amount: str):
    if not API_URL:
        await message.answer("Backend URL не настроен. Попробуй позже.")
        return

    raw_amount = (amount or "").strip().replace(",", ".")
    vk_id = message.from_id

    try:
        topup_amount = Decimal(raw_amount)
    except InvalidOperation:
        await message.answer("Введи корректное число, например: пополнить 10")
        return

    min_amount = get_effective_min_topup_amount()
    if topup_amount < min_amount:
        await message.answer(f"Минимальная сумма пополнения: {format_decimal(min_amount)} TON.")
        return

    if topup_amount > TOPUP_MAX_AMOUNT:
        await message.answer(f"Максимальная сумма пополнения: {format_decimal(TOPUP_MAX_AMOUNT)} TON.")
        return

    if get_topup_price_kopecks(topup_amount) <= 0:
        await message.answer(f"Минимальная сумма пополнения: {format_decimal(min_amount)} TON.")
        return

    try:
        res = rq.get(f"{API_URL}/user-info/vk/{vk_id}", timeout=10)
    except rq.RequestException:
        await message.answer("Backend временно недоступен. Попробуй позже.")
        return

    if res.status_code != 200:
        await message.answer(
            "Профиль VK пока не найден.\n\n"
            "Сначала зайди на сайт и привяжи VK, потом повтори пополнение."
            f"{site_hint()}"
        )
        return

    profile = res.json()
    wallet_address = profile.get("wallet_address")
    if not wallet_address:
        await message.answer(
            "У профиля ещё нет кошелька.\n\n"
            "Открой сайт и заверши регистрацию, затем попробуй снова."
            f"{site_hint()}"
        )
        return

    try:
        invoice = create_yookassa_topup_payment(
            wallet_adr=wallet_address,
            amount=str(topup_amount),
        )
    except TopupUserNotFoundError:
        await message.answer(
            "Профиль не найден на сайте.\n\n"
            "Сначала зарегистрируйся или привяжи VK."
            f"{site_hint()}"
        )
        return
    except TopupWalletNotFoundError:
        await message.answer(
            "У профиля ещё нет кошелька.\n\n"
            "Открой сайт и заверши регистрацию."
            f"{site_hint()}"
        )
        return
    except TopupCooldownError as e:
        await message.answer(
            "Пополнять баланс можно не чаще одного раза за период ожидания.\n\n"
            f"Попробуй снова через {format_seconds_to_human(e.remaining_seconds)}."
        )
        return
    except TopupPaymentAmountError:
        await message.answer(
            f"Сумма не подходит для платежа. Введи от {format_decimal(min_amount)} "
            f"до {format_decimal(TOPUP_MAX_AMOUNT)} TON."
        )
        return
    except TopupConfigurationError:
        await message.answer("Пополнение через ЮKassa пока не настроено. Попробуй позже.")
        return
    except Exception:
        await message.answer("Не получилось создать платёж. Попробуй позже.")
        return

    await message.answer(
        "Платёж создан.\n\n"
        f"Пополнение: {invoice['amount']} TON\n"
        f"К оплате: {invoice['rub_amount']} RUB\n\n"
        "Оплати по ссылке:\n"
        f"{invoice['confirmation_url']}\n\n"
        "После успешной оплаты баланс обновится автоматически."
        f"{test_payment_hint()}"
    )

    payment_id = invoice.get("payment_id")
    if payment_id:
        asyncio.create_task(
            poll_yookassa_payment_status(
                message=message,
                topup_id=int(invoice["topup_id"]),
                payment_id=str(payment_id),
            )
        )
