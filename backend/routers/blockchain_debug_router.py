from fastapi import APIRouter
from services.blockchain.client import (
    check_rpc_connection,
    get_chain_id,
    get_latest_block_number,
)
from services.blockchain.wallet_service import (
    create_new_wallet,
    get_native_balance_eth,
    get_native_balance_wei,
)
from services.blockchain.token_service import (
    get_token_balance,
    get_token_balance_raw,
    get_token_name,
    get_token_symbol,
    get_token_decimals,
    get_token_total_supply,
)

blockchain_debug_router = APIRouter(
    prefix="/blockchain-debug",
    tags=["blockchain-debug"],
)


@blockchain_debug_router.get("/ping")
def blockchain_ping():
    return {
        "connected": check_rpc_connection(),
        "chain_id": get_chain_id(),
        "latest_block": get_latest_block_number(),
    }


@blockchain_debug_router.get("/token-info")
def blockchain_token_info():
    return {
        "name": get_token_name(),
        "symbol": get_token_symbol(),
        "decimals": get_token_decimals(),
        "total_supply": get_token_total_supply(),
    }


@blockchain_debug_router.get("/new-wallet")
def blockchain_new_wallet():
    wallet = create_new_wallet()

    return {
        "address": wallet["address"],
        "private_key": wallet["private_key"],
        "private_key_encrypted": wallet["private_key_encrypted"],
    }


@blockchain_debug_router.get("/wallet-info/{address}")
def blockchain_wallet_info(address: str):
    return {
        "address": address,
        "native_balance_wei": str(get_native_balance_wei(address)),
        "native_balance": get_native_balance_eth(address),
        "token_balance_raw": str(get_token_balance_raw(address)),
        "token_balance": get_token_balance(address),
    }