from eth_account import Account
from web3 import Web3

from services.blockchain.client import get_web3
from services.blockchain.crypto_service import encrypt_private_key


def create_new_wallet() -> dict:
    account = Account.create()

    private_key_hex = account.key.hex()

    return {
        "address": account.address,
        "private_key": private_key_hex,
        "private_key_encrypted": encrypt_private_key(private_key_hex),
    }


def get_native_balance_wei(address: str) -> int:
    w3 = get_web3()
    checksum_address = Web3.to_checksum_address(address)
    return int(w3.eth.get_balance(checksum_address))


def get_native_balance_eth(address: str) -> str:
    w3 = get_web3()
    balance_wei = get_native_balance_wei(address)
    return str(w3.from_wei(balance_wei, "ether"))