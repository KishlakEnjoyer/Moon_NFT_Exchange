from __future__ import annotations

import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from eth_account import Account
from sqlalchemy import desc, select
from sqlalchemy.orm import Session
from web3 import Web3

from core.models import TopupStatuses, User, WalletTopup
from services.blockchain.client import get_web3
from services.blockchain.token_service import (
    from_token_units,
    get_token_balance_raw,
    get_token_contract,
    to_token_units,
)

TOPUP_COOLDOWN_MINUTES = 5
TOPUP_MIN_AMOUNT = Decimal(os.getenv("TOPUP_MIN_AMOUNT", "0"))
TOPUP_MAX_AMOUNT = Decimal(os.getenv("TOPUP_MAX_AMOUNT", "10000"))
TOPUP_RUB_PER_TON = Decimal(os.getenv("TOPUP_RUB_PER_TON", "100"))
TOPUP_CURRENCY = "RUB"


def _format_decimal(value: Decimal) -> str:
    normalized = value.normalize()
    return format(normalized, "f")


def get_topup_price_kopecks(amount: Decimal) -> int:
    rub_amount = (amount * TOPUP_RUB_PER_TON).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int((rub_amount * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def get_topup_rub_amount(amount: Decimal) -> Decimal:
    return (amount * TOPUP_RUB_PER_TON).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _get_pending_status_id(db: Session) -> int:
    status = db.scalar(
        select(TopupStatuses).where(TopupStatuses.status_name == "pending")
    )
    return status.status_id if status else 1


def _get_confirmed_status_id(db: Session) -> int:
    status = db.scalar(
        select(TopupStatuses).where(TopupStatuses.status_name == "confirmed")
    )
    return status.status_id if status else 2


def _get_failed_status_id(db: Session) -> int:
    status = db.scalar(
        select(TopupStatuses).where(TopupStatuses.status_name == "failed")
    )
    return status.status_id if status else 3


def _validate_amount(amount: Decimal) -> None:
    if amount < TOPUP_MIN_AMOUNT:
        raise ValueError(f"Amount must be greater than or equal to {TOPUP_MIN_AMOUNT}")
    if amount > TOPUP_MAX_AMOUNT:
        raise ValueError(f"Amount must be less than or equal to {TOPUP_MAX_AMOUNT}")


def _check_cooldown(db: Session, wallet_adr: int) -> tuple[bool, int]:
    latest_topup = db.scalar(
        select(WalletTopup)
        .where(WalletTopup.wallet_address == wallet_adr)
        .order_by(desc(WalletTopup.created_at))
        .limit(1)
    )

    if not latest_topup:
        return True, 0

    next_available_at = latest_topup.created_at + timedelta(minutes=TOPUP_COOLDOWN_MINUTES)
    now = datetime.utcnow()

    if now >= next_available_at:
        return True, 0

    remaining_seconds = int((next_available_at - now).total_seconds())
    return False, remaining_seconds


def _get_active_user_by_wallet_address(db: Session, wallet_address: str) -> User:
    user: User = db.scalar(
        select(User).where(User.wallet_address == wallet_address)
    )

    if not user:
        raise ValueError("User not found")

    if not user.is_active:
        raise ValueError("User account is blocked")

    if not user.wallet_address:
        raise ValueError("User wallet not found")

    return user


def create_telegram_topup_invoice(db: Session, wallet_address: str, amount: Decimal) -> dict:
    _validate_amount(amount)

    user = _get_active_user_by_wallet_address(db, wallet_address)

    allowed, remaining_seconds = _check_cooldown(db, user.wallet_address)
    if not allowed:
        raise RuntimeError(f"Cooldown active:{remaining_seconds}")

    pending_status_id = _get_pending_status_id(db)
    topup = WalletTopup(
        wallet_address=user.wallet_address,
        amount=amount,
        requested_via="telegram_yookassa",
        status=pending_status_id,
        tx_hash=None,
        block_number=None,
        created_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
    )
    db.add(topup)
    db.commit()
    db.refresh(topup)

    rub_amount = get_topup_rub_amount(amount)

    return {
        "topup_id": topup.topup_id,
        "user_id": user.user_id,
        "wallet_address": user.wallet_address,
        "amount": _format_decimal(amount),
        "rate_rub_per_ton": _format_decimal(TOPUP_RUB_PER_TON),
        "rub_amount": _format_decimal(rub_amount),
        "price_kopecks": get_topup_price_kopecks(amount),
        "currency": TOPUP_CURRENCY,
        "cooldown_minutes": TOPUP_COOLDOWN_MINUTES,
    }


def _transfer_tokens_for_topup(db: Session, topup: WalletTopup, user: User) -> dict:
    w3 = get_web3()
    contract = get_token_contract()

    faucet_private_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not faucet_private_key:
        raise RuntimeError("PLATFORM_OWNER_PRIVATE_KEY is not set")

    faucet_account = Account.from_key(faucet_private_key)
    faucet_address = faucet_account.address
    user_address = Web3.to_checksum_address(user.wallet_address)

    amount = Decimal(str(topup.amount))
    amount_units = to_token_units(str(amount))

    faucet_balance_raw = int(contract.functions.balanceOf(faucet_address).call())
    if faucet_balance_raw < amount_units:
        raise RuntimeError("Faucet wallet has insufficient token balance")

    confirmed_status_id = _get_confirmed_status_id(db)
    failed_status_id = _get_failed_status_id(db)

    try:
        nonce = w3.eth.get_transaction_count(faucet_address)
        gas_price = w3.eth.gas_price

        tx = contract.functions.transfer(user_address, amount_units).build_transaction(
            {
                "from": faucet_address,
                "nonce": nonce,
                "gasPrice": gas_price,
                "chainId": w3.eth.chain_id,
            }
        )

        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=faucet_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        if receipt.status != 1:
            topup.status = failed_status_id
            topup.tx_hash = tx_hash_hex
            topup.block_number = receipt.blockNumber
            db.commit()
            raise RuntimeError("Transaction failed")

        topup.status = confirmed_status_id
        topup.tx_hash = tx_hash_hex
        topup.block_number = receipt.blockNumber
        topup.confirmed_at = datetime.utcnow()
        db.commit()
        db.refresh(topup)

        new_balance_raw = get_token_balance_raw(user.wallet_address)
        new_balance = from_token_units(new_balance_raw)

        return {
            "topup_id": topup.topup_id,
            "user_id": user.user_id,  
            "wallet_address": user.wallet_address,
            "amount": _format_decimal(amount),
            "tx_hash": tx_hash_hex,
            "block_number": int(receipt.blockNumber),
            "new_balance": new_balance,  
            "cooldown_minutes": TOPUP_COOLDOWN_MINUTES,
        }

    except Exception:
        topup.status = failed_status_id
        db.commit()
        raise


def transfer_tokens_to_user_by_wallet_address(db: Session, wallet_address, amount: Decimal) -> dict:
    _validate_amount(amount)

    user = _get_active_user_by_wallet_address(db, wallet_address)

    allowed, remaining_seconds = _check_cooldown(db, user.wallet_address)
    if not allowed:
        raise RuntimeError(f"Cooldown active:{remaining_seconds}")

    pending_status_id = _get_pending_status_id(db)

    topup = WalletTopup(
        wallet_address=user.wallet_address,
        amount=amount,
        requested_via="telegram_bot",
        status=pending_status_id,
        tx_hash=None,
        block_number=None,
        created_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
    )
    db.add(topup)
    db.commit()
    db.refresh(topup)

    return _transfer_tokens_for_topup(db, topup, user)


def confirm_paid_telegram_topup(
    db: Session,
    topup_id: int,
    currency: str,
    total_amount: int,
    provider_payment_charge_id: str | None = None,
    telegram_payment_charge_id: str | None = None,
) -> dict:
    if currency != TOPUP_CURRENCY:
        raise ValueError("Payment currency mismatch")

    topup = db.get(WalletTopup, topup_id)
    if not topup:
        raise ValueError("Topup not found")

    if topup.requested_via != "telegram_yookassa":
        raise ValueError("Topup source mismatch")

    amount = Decimal(str(topup.amount))
    expected_total_amount = get_topup_price_kopecks(amount)
    if int(total_amount) != expected_total_amount:
        raise ValueError("Payment amount mismatch")

    confirmed_status_id = _get_confirmed_status_id(db)
    failed_status_id = _get_failed_status_id(db)
    pending_status_id = _get_pending_status_id(db)

    if topup.status == confirmed_status_id:
        new_balance = from_token_units(get_token_balance_raw(topup.wallet_address))
        return {
            "topup_id": topup.topup_id,
            "user_id": topup.user.user_id,
            "wallet_address": topup.wallet_address,
            "amount": _format_decimal(amount),
            "tx_hash": topup.tx_hash or "",
            "block_number": int(topup.block_number or 0),
            "new_balance": new_balance,
            "cooldown_minutes": TOPUP_COOLDOWN_MINUTES,
        }

    if topup.status == failed_status_id:
        raise ValueError("Topup already failed")

    if topup.status != pending_status_id:
        raise ValueError("Topup is not pending")

    user = topup.user
    if not user:
        user = _get_active_user_by_wallet_address(db, topup.wallet_address)

    if not user.is_active:
        raise ValueError("User account is blocked")

    if provider_payment_charge_id:
        print(f"[YOOKASSA TOPUP] provider_charge_id={provider_payment_charge_id}")
    if telegram_payment_charge_id:
        print(f"[YOOKASSA TOPUP] telegram_charge_id={telegram_payment_charge_id}")

    return _transfer_tokens_for_topup(db, topup, user)
