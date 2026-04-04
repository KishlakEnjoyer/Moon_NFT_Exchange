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


def burn_tokens(wallet_address: str, amount: str, private_key: str) -> str:
    w3 = get_web3()
    contract = get_token_contract()
    checksum_address = Web3.to_checksum_address(wallet_address)
    amount_units = to_token_units(amount)

    nonce = w3.eth.get_transaction_count(checksum_address)
    gas_price = w3.eth.gas_price

    tx = contract.functions.burn(amount_units).build_transaction({
        "from": checksum_address,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
    })

    estimated_gas = w3.eth.estimate_gas(tx)
    tx["gas"] = int(estimated_gas * 1.2)

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise Exception("Burn transaction failed")

    return tx_hash_hex