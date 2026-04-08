from __future__ import annotations

import os
from datetime import datetime
from decimal import Decimal

from eth_account import Account
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from web3 import Web3

from core.models import (
    Collections,
    Notification,
    NotificationTypes,
    Present,
    Transaction,
    User,
    UserCollectionPurchase,
)
from services.blockchain.client import get_web3
from services.blockchain.crypto_service import decrypt_private_key
from services.blockchain.token_service import (
    from_token_units,
    get_token_balance_raw,
    get_token_contract,
    to_token_units,
)
from services.notification_service import (
    NotificationManager,
    create_notification,
    notification_to_dict,
)
from utils.tg_bot import send_tg_message, send_tg_message_sync

notification_manager = NotificationManager()


def get_next_present_num(db: Session, collection_id: int) -> int:
    max_num = db.scalar(
        select(func.max(Present.present_num)).where(Present.collection_id == collection_id)
    )
    return (max_num or 0) + 1


def get_user_purchase_count(db: Session, user_id: int, collection_id: int) -> int:
    record = db.scalar(
        select(UserCollectionPurchase.purchase_count).where(
            UserCollectionPurchase.user_id == user_id,
            UserCollectionPurchase.collection_id == collection_id,
        )
    )
    return record or 0


def increment_purchase_count(db: Session, user_id: int, collection_id: int) -> None:
    record = db.scalar(
        select(UserCollectionPurchase).where(
            UserCollectionPurchase.user_id == user_id,
            UserCollectionPurchase.collection_id == collection_id,
        )
    )
    if record:
        record.purchase_count += 1
    else:
        record = UserCollectionPurchase(
            user_id=user_id,
            collection_id=collection_id,
            purchase_count=1,
        )
        db.add(record)


def purchase_and_send_gift(
    db: Session,
    sender_id: int,
    receiver_id: int,
    collection_id: int,
    description: str | None = None,
) -> dict:
    sender = db.scalar(select(User).where(User.user_id == sender_id))
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    receiver = db.scalar(select(User).where(User.user_id == receiver_id))
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    if not sender.wallet_address:
        raise HTTPException(status_code=400, detail="Sender wallet not found")

    if not receiver.wallet_address:
        raise HTTPException(status_code=400, detail="Receiver wallet not found")

    collection = db.scalar(
        select(Collections).where(Collections.collection_id == collection_id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    if not collection.is_active:
        raise HTTPException(status_code=400, detail="Collection is not active")

    purchase_limit = collection.purchase_limit or 3
    current_count = get_user_purchase_count(db, sender_id, collection_id)
    if current_count >= purchase_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Purchase limit reached for this collection ({purchase_limit} max)",
        )

    minted_count = db.scalar(
        select(func.count(Present.present_id)).where(Present.collection_id == collection_id)
    ) or 0
    available = collection.collection_limit - minted_count
    if available <= 0:
        raise HTTPException(status_code=400, detail="Collection is sold out")

    price = collection.base_price
    print(f"[DEBUG] Collection: {collection.collection_name}, Price: {price}")
    price_units = to_token_units(str(price))

    sender_balance_raw = get_token_balance_raw(sender.wallet_address)
    if sender_balance_raw < price_units:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {price}, have {from_token_units(sender_balance_raw)}",
        )

    w3 = get_web3()
    contract = get_token_contract()

    if not sender.wallet_private_key_encrypted:
        raise HTTPException(status_code=400, detail="Sender wallet key not available")

    sender_private_key = decrypt_private_key(sender.wallet_private_key_encrypted)
    sender_account = Account.from_key(sender_private_key)
    sender_address = Web3.to_checksum_address(sender.wallet_address)
    platform_owner_key = os.getenv("PLATFORM_OWNER_PRIVATE_KEY")
    if not platform_owner_key:
        raise HTTPException(status_code=500, detail="Platform private key not configured")
    platform_account = Account.from_key(platform_owner_key)
    platform_address = Web3.to_checksum_address(platform_account.address)

    
    
    try:
        nonce = w3.eth.get_transaction_count(sender_address)
        gas_price = w3.eth.gas_price

        tx = contract.functions.transfer(platform_address, price_units).build_transaction(
            {
                "from": sender_address,
                "nonce": nonce,
                "gasPrice": gas_price,
                "chainId": w3.eth.chain_id,
            }
        )

        tx["gas"] = 100000

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=sender_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)

        if receipt["status"] != 1:
            raise HTTPException(status_code=500, detail="Blockchain transaction failed")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(e)}")

    print(f"[DEBUG 1] Blockchain TX OK: {tx_hash_hex}")

    try:
        present_num = get_next_present_num(db, collection_id)
        print(f"[DEBUG 2] Got present_num: {present_num}")

        present = Present(
            collection_id=collection_id,
            model_id=None,
            background_id=None,
            symbol_id=None,
            present_num=present_num,
            image_url=collection.collection_image_url,
            description=description,
            is_burned=0,
            is_visible=0,
            original_sender_id=sender_id,
        )
        print(f"[DEBUG 3] Present object created")

        db.add(present)
        db.flush()
        print(f"[DEBUG 4] Present flushed to DB, present_id={present.present_id}")

        transaction = Transaction(
            buyer_id=receiver_id,
            seller_id=sender_id,
            present_id=present.present_id,
            type_id=1,
            status_id=2,
            transaction_price=price,
            platform_fee=price,
            seller_received=Decimal("0.000000"),
            blockchain_tx_hash=tx_hash_hex,
            block_number=int(receipt["blockNumber"]),
            transaction_date=datetime.utcnow(),
        )
        db.add(transaction)
        print(f"[DEBUG 5] Transaction added")

        increment_purchase_count(db, sender_id, collection_id)
        print(f"[DEBUG 6] Purchase count incremented")

        is_self_gift = sender_id == receiver_id
        price_str = str(price)

        receiver_msg = f"🎁 You received a gift: *{collection.collection_name} \\#{present.present_num}* from *{sender.username}*!"
        sender_msg = f"📤 You sent a gift: *{collection.collection_name} \\#{present.present_num}* to *{receiver.username}* for *{price_str} TON*."

        if not is_self_gift:
            notification = create_notification(
                db=db,
                user_id=receiver_id,
                type_name="gift_received",
                entity_type="present",
                entity_id=present.present_id,
            )
            print(f"[DEBUG 7] Notification created")

        db.commit()
        print(f"[DEBUG 8] DB COMMIT SUCCESS")

        send_tg_message_sync(receiver.user_tg_id, receiver_msg)
        send_tg_message_sync(sender.user_tg_id, sender_msg)

    except Exception as e:
        print(f"[FATAL ERROR] Failed to save gift to DB: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Blockchain TX OK but DB save failed: {str(e)}")

    new_balance_raw = get_token_balance_raw(sender.wallet_address)
    new_balance = from_token_units(new_balance_raw)

    return {
        "present_id": present.present_id,
        "collection_id": present.collection_id,
        "present_num": present.present_num,
        "tx_hash": tx_hash_hex,
        "price": str(price),
        "new_balance": new_balance,
    }
