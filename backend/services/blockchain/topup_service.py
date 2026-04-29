from __future__ import annotations

import os
from datetime import datetime, timedelta
from decimal import Decimal

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
TOPUP_MIN_AMOUNT = Decimal("0")
TOPUP_MAX_AMOUNT = Decimal("10000")


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
    if amount <= TOPUP_MIN_AMOUNT:
        raise ValueError("Amount must be greater than 0")
    if amount > TOPUP_MAX_AMOUNT:
        raise ValueError("Amount must be less than or equal to 10000")


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


def transfer_tokens_to_user_by_wallet_address(db: Session, wallet_address, amount: Decimal) -> dict:
    _validate_amount(amount)

    user: User = db.scalar(
        select(User).where(User.wallet_address == wallet_address)
    )

    if not user:
        raise ValueError("User not found")

    if not user.wallet_address:
        raise ValueError("User wallet not found")

    allowed, remaining_seconds = _check_cooldown(db, user.wallet_address)
    if not allowed:
        raise RuntimeError(f"Cooldown active:{remaining_seconds}")

    w3 = get_web3()
    contract = get_token_contract()

    faucet_private_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not faucet_private_key:
        raise RuntimeError("PLATFORM_OWNER_PRIVATE_KEY is not set")

    faucet_account = Account.from_key(faucet_private_key)
    faucet_address = faucet_account.address
    user_address = Web3.to_checksum_address(user.wallet_address)

    amount_units = to_token_units(str(amount))

    faucet_balance_raw = int(contract.functions.balanceOf(faucet_address).call())
    if faucet_balance_raw < amount_units:
        raise RuntimeError("Faucet wallet has insufficient token balance")

    pending_status_id = _get_pending_status_id(db)
    confirmed_status_id = _get_confirmed_status_id(db)
    failed_status_id = _get_failed_status_id(db)

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
            "amount": str(amount),
            "tx_hash": tx_hash_hex,
            "block_number": int(receipt.blockNumber),
            "new_balance": new_balance,  
            "cooldown_minutes": TOPUP_COOLDOWN_MINUTES,
        }

    except Exception:
        topup.status = failed_status_id
        db.commit()
        raise
