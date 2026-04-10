import os
import json
from pathlib import Path
from decimal import Decimal
from eth_account import Account
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


def send_eth(user_address: str, amount_wei: int, platform_private_key: str) -> str:
    w3 = get_web3()
    contract = get_token_contract()
    platform_account = Account.from_key(platform_private_key)
    platform_address = Web3.to_checksum_address(platform_account.address)
    checksum_user = Web3.to_checksum_address(user_address)
    
    nonce = w3.eth.get_transaction_count(platform_address)
    gas_price = w3.eth.gas_price
    
    tx = {
        "from": platform_address,
        "to": checksum_user,
        "value": amount_wei,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
        "gas": 21000,  
    }
    
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=platform_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise Exception("ETH transfer failed")
    
    return tx_hash_hex


def approve_tokens(spender_address: str, amount: int, user_address: str, user_private_key: str) -> str:
    w3 = get_web3()
    contract = get_token_contract()
    checksum_user = Web3.to_checksum_address(user_address)
    checksum_spender = Web3.to_checksum_address(spender_address)

    nonce = w3.eth.get_transaction_count(checksum_user)
    gas_price = w3.eth.gas_price

    tx = contract.functions.approve(checksum_spender, amount).build_transaction({
        "from": checksum_user,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
    })

    try:
        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)
    except Exception:
        tx["gas"] = 100000

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=user_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise Exception("Approve transaction failed")

    return tx_hash_hex


def get_allowance(owner_address: str, spender_address: str) -> int:
    """Check how many tokens the spender is allowed to transfer from owner."""
    contract = get_token_contract()
    checksum_owner = Web3.to_checksum_address(owner_address)
    checksum_spender = Web3.to_checksum_address(spender_address)
    return int(contract.functions.allowance(checksum_owner, checksum_spender).call())


def transfer_from_tokens(from_address: str, to_address: str, amount: int, 
                         platform_address: str, platform_private_key: str) -> str:

    w3 = get_web3()
    contract = get_token_contract()
    checksum_from = Web3.to_checksum_address(from_address)
    checksum_to = Web3.to_checksum_address(to_address)
    checksum_platform = Web3.to_checksum_address(platform_address)

    nonce = w3.eth.get_transaction_count(checksum_platform)
    gas_price = w3.eth.gas_price

    tx = contract.functions.transferFrom(checksum_from, checksum_to, amount).build_transaction({
        "from": checksum_platform,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
    })

    try:
        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)
    except Exception:
        tx["gas"] = 150000

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=platform_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise Exception("TransferFrom transaction failed")

    return tx_hash_hex