import os
import json
from pathlib import Path
from decimal import Decimal
from web3 import Web3

from services.blockchain.client import get_web3

ABI_PATH = Path(__file__).resolve().parent / "abi" / "MoonToken.json"


def _load_token_abi():
    with open(ABI_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_token_contract():
    w3 = get_web3()

    address = os.getenv("TOKEN_CONTRACT_ADDRESS")
    if not address:
        raise ValueError("TOKEN_CONTRACT_ADDRESS is not set")

    return w3.eth.contract(
        address=Web3.to_checksum_address(address),
        abi=_load_token_abi(),
    )


def to_token_units(amount: str | int | float) -> int:
    return int(Decimal(str(amount)) * Decimal(10**18))


def from_token_units(amount_raw: int) -> str:
    return str(Decimal(amount_raw) / Decimal(10**18))


def get_token_balance_raw(address: str) -> int:
    contract = get_token_contract()
    checksum_address = Web3.to_checksum_address(address)
    return int(contract.functions.balanceOf(checksum_address).call())


def get_token_balance(address: str) -> str:
    raw_balance = get_token_balance_raw(address)
    return from_token_units(raw_balance)


def get_token_name() -> str:
    contract = get_token_contract()
    return str(contract.functions.name().call())


def get_token_symbol() -> str:
    contract = get_token_contract()
    return str(contract.functions.symbol().call())


def get_token_decimals() -> int:
    contract = get_token_contract()
    return int(contract.functions.decimals().call())


def get_token_total_supply() -> str:
    contract = get_token_contract()
    total_supply_raw = int(contract.functions.totalSupply().call())
    return from_token_units(total_supply_raw)