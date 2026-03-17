from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal
import datetime
import pymysql
import pymysql.cursors

from dotenv import load_dotenv
import os

from blockchain_service import create_wallet, mint_tokens, transfer_tokens, get_balance

load_dotenv()  

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "moon_db"),
    "charset": "utf8mb4"
}

def get_conn():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


class CreateWalletRequest(BaseModel):
    user_id: int

class MintRequest(BaseModel):
    user_id: int
    amount: float = 1000.0

class TransferRequest(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float
    description: str = "transfer"


@router.post("/wallet/create", summary="Create wallet for user")
def create_user_wallet(req: CreateWalletRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, wallet_address FROM users WHERE user_id = %s", (req.user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(404, "User not found")
            if user["wallet_address"]:
                raise HTTPException(400, "Wallet already created")

            wallet = create_wallet()
            cur.execute(
                "UPDATE users SET wallet_address = %s, wallet_private_key = %s WHERE user_id = %s",
                (wallet["address"], wallet["private_key"], req.user_id)
            )
            conn.commit()

        return {
            "user_id": req.user_id,
            "wallet_address": wallet["address"],
            "message": "Wallet created! Now call /mint"
        }
    finally:
        conn.close()


@router.post("/wallet/mint", summary="Give tokens")
def mint_to_user(req: MintRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT wallet_address FROM users WHERE user_id = %s", (req.user_id,))
            user = cur.fetchone()
            if not user or not user["wallet_address"]:
                raise HTTPException(400, "Create wallet!")

            tx_hash = mint_tokens(user["wallet_address"], req.amount)

            cur.execute("""
                INSERT INTO blockchain_events
                    (event_type, blockchain_network, contract_address, tx_hash, event_data)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                "mint", "localhost", user["wallet_address"], tx_hash,
                f'{{"user_id": {req.user_id}, "amount": {req.amount}}}'
            ))
            conn.commit()

        return {"user_id": req.user_id, "amount": req.amount, "tx_hash": tx_hash}
    finally:
        conn.close()


@router.post("/transfer", summary="transfer tokens 2p2")
def transfer(req: TransferRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id, wallet_address, wallet_private_key FROM users WHERE user_id IN (%s, %s)",
                (req.from_user_id, req.to_user_id)
            )
            users = {u["user_id"]: u for u in cur.fetchall()}

            sender = users.get(req.from_user_id)
            receiver = users.get(req.to_user_id)

            if not sender:
                raise HTTPException(404, "Sender not found")
            if not receiver:
                raise HTTPException(404, "Receiver not found")
            if not sender["wallet_address"]:
                raise HTTPException(400, "Sender doesn't have a wallet")
            if not receiver["wallet_address"]:
                raise HTTPException(400, "Receiver doesn't have a wallet")

            balance = get_balance(sender["wallet_address"])
            if balance < req.amount:
                raise HTTPException(400, f"Error. Balance: {balance} TON")

            tx_hash = transfer_tokens(
                sender["wallet_private_key"],
                receiver["wallet_address"],
                req.amount,
                req.description
            )

            now = datetime.datetime.now()

            cur.execute("""
                INSERT INTO blockchain_events
                    (event_type, blockchain_network, contract_address, tx_hash, event_data)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                "transfer", "localhost", sender["wallet_address"], tx_hash,
                f'{{"from": {req.from_user_id}, "to": {req.to_user_id}, "amount": {req.amount}}}'
            ))
            conn.commit()

        return {
            "success": True,
            "tx_hash": tx_hash,
            "from_user_id": req.from_user_id,
            "to_user_id": req.to_user_id,
            "amount": req.amount
        }
    finally:
        conn.close()


@router.get("/balance/{user_id}", summary="Баланс юзера")
def balance(user_id: int):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT wallet_address FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
            if not user or not user["wallet_address"]:
                raise HTTPException(400, "Wallet not found")
            b = get_balance(user["wallet_address"])
            return {"user_id": user_id, "wallet_address": user["wallet_address"], "balance": b, "symbol": "TON"}
    finally:
        conn.close()


@router.get("/history/{user_id}", summary="Transaction history")
def history(user_id: int):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT event_type, tx_hash, event_data, created_at
                FROM blockchain_events
                WHERE JSON_EXTRACT(event_data, '$.from') = %s
                   OR JSON_EXTRACT(event_data, '$.to') = %s
                   OR JSON_EXTRACT(event_data, '$.user_id') = %s
                ORDER BY created_at DESC
                LIMIT 50
            """, (user_id, user_id, user_id))
            rows = cur.fetchall()
        return {"user_id": user_id, "events": rows}
    finally:
        conn.close()