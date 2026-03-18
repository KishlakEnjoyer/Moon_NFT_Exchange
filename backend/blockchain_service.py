import json
import os
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

BLOCKCHAIN_URL = os.getenv("BLOCKCHAIN_URL", "http://127.0.0.1:8545")
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))

_data = json.loads((Path(__file__).parent / "contract_info.json").read_text())

token = w3.eth.contract(
    address=_data["token"]["address"],
    abi=_data["token"]["abi"]
)
marketplace = w3.eth.contract(
    address=_data["marketplace"]["address"],
    abi=_data["marketplace"]["abi"]
)

OWNER_PRIVATE_KEY = os.getenv("OWNER_PRIVATE_KEY")
owner = w3.eth.account.from_key(OWNER_PRIVATE_KEY)
PLATFORM_WALLET = owner.address


def _send_tx(fn, private_key: str, gas: int = 200_000):
    """Универсальная отправка транзакции"""
    sender = w3.eth.account.from_key(private_key)
    tx = fn.build_transaction({
        "from": sender.address,
        "nonce": w3.eth.get_transaction_count(sender.address),
        "gas": gas,
        "gasPrice": w3.to_wei("1", "gwei"),
    })
    signed = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_hash.hex(), receipt.blockNumber


def fund_wallet(to_address: str):
    """Отправить ETH для газа новому кошельку"""
    tx = {
        "from": owner.address,
        "to": to_address,
        "value": w3.to_wei(0.1, "ether"),
        "nonce": w3.eth.get_transaction_count(owner.address),
        "gas": 21_000,
        "gasPrice": w3.to_wei("1", "gwei"),
    }
    signed = w3.eth.account.sign_transaction(tx, OWNER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)


def create_wallet() -> dict:
    acc = w3.eth.account.create()
    fund_wallet(acc.address)
    return {"address": acc.address, "private_key": acc.key.hex()}


def mint_tokens(to_address: str, amount: float) -> str:
    amount_wei = w3.to_wei(amount, "ether")
    tx_hash, _ = _send_tx(
        token.functions.mint(to_address, amount_wei),
        OWNER_PRIVATE_KEY
    )
    return tx_hash


def get_token_balance(address: str) -> float:
    return float(w3.from_wei(token.functions.balanceOf(address).call(), "ether"))


def approve_marketplace(user_private_key: str, amount: float) -> str:
    """Юзер разрешает маркетплейсу тратить его токены"""
    amount_wei = w3.to_wei(amount, "ether")
    tx_hash, _ = _send_tx(
        token.functions.approve(
            _data["marketplace"]["address"],
            amount_wei
        ),
        user_private_key
    )
    return tx_hash


def purchase_present(
    user_private_key: str,
    present_id: int,
    base_price: float
) -> tuple[str, int]:
    """Покупка неулучшенного подарка из коллекции"""
    base_price_wei = w3.to_wei(base_price, "ether")
    # Сначала approve
    approve_marketplace(user_private_key, base_price)
    # Потом покупка
    tx_hash, block = _send_tx(
        marketplace.functions.purchasePresent(present_id, base_price_wei),
        user_private_key
    )
    return tx_hash, block


def upgrade_present(
    user_private_key: str,
    present_id: int,
    upgrade_cost: float
) -> tuple[str, int]:
    """Оплата улучшения подарка"""
    approve_marketplace(user_private_key, upgrade_cost)
    return _send_tx(
        marketplace.functions.upgradePresent(
            present_id,
            w3.to_wei(upgrade_cost, "ether")
        ),
        user_private_key
    )


def list_present(
    user_private_key: str,
    present_id: int,
    price: float
) -> tuple[str, int]:
    """Выставить подарок на продажу"""
    return _send_tx(
        marketplace.functions.listPresent(
            present_id,
            w3.to_wei(price, "ether")
        ),
        user_private_key
    )


def buy_present(
    buyer_private_key: str,
    present_id: int,
    price: float
) -> tuple[str, int]:
    """Купить подарок на маркетплейсе"""
    # approve на полную сумму (маркетплейс сам разобьёт на fee и seller)
    approve_marketplace(buyer_private_key, price)
    return _send_tx(
        marketplace.functions.buyPresent(present_id),
        buyer_private_key
    )


def delist_present(
    user_private_key: str,
    present_id: int
) -> tuple[str, int]:
    """Снять подарок с продажи"""
    return _send_tx(
        marketplace.functions.delistPresent(present_id),
        user_private_key
    )


def burn_present(
    user_private_key: str,
    present_id: int,
    refund_amount: float
) -> tuple[str, int]:
    """Burn-to-redeem: платформа должна approve маркетплейсу перед вызовом"""
    # Платформа approves маркетплейс на сумму рефанда
    approve_marketplace(OWNER_PRIVATE_KEY, refund_amount)
    return _send_tx(
        marketplace.functions.burnPresent(present_id),
        user_private_key
    )


def get_present_owner(present_id: int) -> str:
    """Получить адрес владельца подарка из блокчейна"""
    return marketplace.functions.getPresentOwner(present_id).call()