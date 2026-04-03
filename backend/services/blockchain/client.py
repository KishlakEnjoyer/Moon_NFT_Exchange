import os
from web3 import Web3
from web3.providers import HTTPProvider

_w3: Web3 | None = None


def get_web3() -> Web3:
    global _w3

    if _w3 is None:
        rpc_url = os.getenv("BLOCKCHAIN_RPC_URL")
        provider = HTTPProvider(
            endpoint_uri=rpc_url,
            request_kwargs={"timeout": 10},
        )
        _w3 = Web3(provider)

    return _w3


def check_rpc_connection() -> bool:
    w3 = get_web3()
    return w3.is_connected()


def get_chain_id() -> int:
    w3 = get_web3()
    return int(w3.eth.chain_id)


def get_latest_block_number() -> int:
    w3 = get_web3()
    return int(w3.eth.block_number)