import json
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv
import os

load_dotenv()

BLOCKCHAIN_URL = os.getenv("BLOCKCHAIN_URL")
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))

_data = json.loads((Path(__file__).parent / "contract_info.json").read_text())

contract = w3.eth.contract(
    address=_data["address"],
    abi=_data["abi"]
)

OWNER_PRIVATE_KEY = os.getenv("OWNER_PRIVATE_KEY")

owner = w3.eth.account.from_key(OWNER_PRIVATE_KEY)


def fund_wallet(to_address: str):
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
    return {
        "address": acc.address,
        "private_key": acc.key.hex()
    }


def mint_tokens(to_address: str, amount: float) -> str:
    amount_wei = w3.to_wei(amount, "ether")
    tx = contract.functions.mint(to_address, amount_wei).build_transaction({
        "from": owner.address,
        "nonce": w3.eth.get_transaction_count(owner.address),
        "gas": 100_000,
        "gasPrice": w3.to_wei("1", "gwei"),
    })
    signed = w3.eth.account.sign_transaction(tx, OWNER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_hash.hex()


def transfer_tokens(from_private_key: str, to_address: str, amount: float, description: str = "transfer") -> str:
    sender = w3.eth.account.from_key(from_private_key)
    amount_wei = w3.to_wei(amount, "ether")
    tx = contract.functions.transfer(to_address, amount_wei, description).build_transaction({
        "from": sender.address,
        "nonce": w3.eth.get_transaction_count(sender.address),
        "gas": 100_000,
        "gasPrice": w3.to_wei("1", "gwei"),
    })
    signed = w3.eth.account.sign_transaction(tx, from_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_hash.hex()


def get_balance(address: str) -> float:
    balance_wei = contract.functions.balanceOf(address).call()
    return float(w3.from_wei(balance_wei, "ether"))