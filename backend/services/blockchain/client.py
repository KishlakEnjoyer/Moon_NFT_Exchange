import os
from hexbytes import HexBytes
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


def _normalize_tx_hash(tx_hash: str) -> HexBytes:
    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    return HexBytes(tx_hash)


def get_transaction(tx_hash: str) -> dict | None:
    w3 = get_web3()
    try:
        tx = w3.eth.get_transaction(_normalize_tx_hash(tx_hash))
        if tx:
            return {
                "hash": tx["hash"].hex(),
                "block_number": tx["blockNumber"],
                "from": tx["from"],
                "to": tx["to"],
                "value": str(tx["value"]),
                "gas": tx["gas"],
                "gas_price": str(tx["gasPrice"]),
                "nonce": tx["nonce"],
                "input": tx["input"].hex() if tx["input"] else "",
                "v": tx["v"],
                "r": hex(tx["r"]),
                "s": hex(tx["s"]),
                "chain_id": tx["chainId"],
            }
        return None
    except Exception:
        return None


def get_transaction_receipt(tx_hash: str) -> dict | None:
    w3 = get_web3()
    try:
        receipt = w3.eth.get_transaction_receipt(_normalize_tx_hash(tx_hash))
        if receipt:
            return {
                "transaction_hash": receipt["transactionHash"].hex(),
                "block_number": receipt["blockNumber"],
                "block_hash": receipt["blockHash"].hex(),
                "from": receipt["from"],
                "to": receipt["to"],
                "status": receipt["status"],
                "gas_used": receipt["gasUsed"],
                "effective_gas_price": str(receipt["effectiveGasPrice"]),
                "cumulative_gas_used": receipt["cumulativeGasUsed"],
                "logs": [
                    {
                        "address": log.address,
                        "topics": [t.hex() for t in log.topics],
                        "data": log.data.hex() if log.data else "",
                        "log_index": log.logIndex,
                    }
                    for log in receipt["logs"]
                ],
            }
        return None
    except Exception:
        return None