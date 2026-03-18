from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from decimal import Decimal
import datetime

from core.database import get_db
from models import (
    User, Present, Collection, Listing, ListingStatus,
    Transaction, TransactionType, TransactionStatus,
    BlockchainEvent, BlockchainEventType,
    UserCollectionPurchase
)
from blockchain_service import (
    create_wallet, mint_tokens, get_token_balance,
    purchase_present, upgrade_present,
    list_present, buy_present, delist_present, burn_present,
    get_present_owner
)

router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


# ── Хелперы ──────────────────────────────────────────────────

async def _get_user(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if not user.wallet_address:
        raise HTTPException(400, "У пользователя нет кошелька")
    return user

async def _get_type_id(db: AsyncSession, type_name: str) -> int:
    result = await db.execute(
        select(TransactionType.type_id).where(TransactionType.type_name == type_name)
    )
    return result.scalar_one()

async def _get_status_id(db: AsyncSession, status_name: str) -> int:
    result = await db.execute(
        select(TransactionStatus.status_id).where(TransactionStatus.status_name == status_name)
    )
    return result.scalar_one()

async def _get_listing_status_id(db: AsyncSession, status_name: str) -> int:
    result = await db.execute(
        select(ListingStatus.status_id).where(ListingStatus.status_name == status_name)
    )
    return result.scalar_one()

async def _get_event_type_id(db: AsyncSession, event_type_name: str) -> int:
    result = await db.execute(
        select(BlockchainEventType.event_type_id).where(
            BlockchainEventType.event_type_name == event_type_name
        )
    )
    return result.scalar_one()

async def _log_event(db: AsyncSession, event_type_name: str, tx_hash: str,
                     block_number: int, event_data: dict):
    event_type_id = await _get_event_type_id(db, event_type_name)
    db.add(BlockchainEvent(
        event_type_id=event_type_id,
        blockchain_network="localhost",
        contract_address="",
        tx_hash=tx_hash,
        block_number=block_number,
        event_data=event_data
    ))


# ── Модели запросов ──────────────────────────────────────────

class CreateWalletRequest(BaseModel):
    user_id: int

class MintRequest(BaseModel):
    user_id: int
    amount: float = 1000.0

class PurchasePresentRequest(BaseModel):
    user_id: int
    present_id: int

class UpgradePresentRequest(BaseModel):
    user_id: int
    present_id: int

class ListPresentRequest(BaseModel):
    user_id: int
    present_id: int
    price: float

class BuyPresentRequest(BaseModel):
    buyer_user_id: int
    present_id: int

class DelistPresentRequest(BaseModel):
    user_id: int
    present_id: int

class BurnPresentRequest(BaseModel):
    user_id: int
    present_id: int


# ── Эндпоинты ────────────────────────────────────────────────

@router.post("/wallet/create", summary="Создать кошелёк юзеру")
async def create_user_wallet(req: CreateWalletRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.wallet_address:
        raise HTTPException(400, "Кошелёк уже создан")

    wallet = create_wallet()
    user.wallet_address = wallet["address"]
    user.wallet_private_key = wallet["private_key"]
    await db.commit()

    return {"user_id": req.user_id, "wallet_address": wallet["address"]}


@router.post("/wallet/mint", summary="Выдать TON токены юзеру")
async def mint_to_user(req: MintRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, req.user_id)
    tx_hash = mint_tokens(user.wallet_address, req.amount)

    await _log_event(db, "mint", tx_hash, 0,
                     {"user_id": req.user_id, "amount": req.amount})
    await db.commit()

    return {"user_id": req.user_id, "amount": req.amount, "tx_hash": tx_hash}


@router.get("/balance/{user_id}", summary="Баланс TON токенов")
async def get_balance(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, user_id)
    balance = get_token_balance(user.wallet_address)
    return {"user_id": user_id, "balance": balance, "symbol": "TON"}


@router.post("/present/purchase", summary="Купить неулучшенный подарок")
async def purchase(req: PurchasePresentRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, req.user_id)

    # Загружаем подарок с коллекцией
    result = await db.execute(
        select(Present)
        .options(selectinload(Present.collection))
        .where(Present.present_id == req.present_id, Present.is_burned == False)
    )
    present = result.scalar_one_or_none()
    if not present:
        raise HTTPException(404, "Подарок не найден")
    if present.collection.collection_available_count <= 0:
        raise HTTPException(400, "Коллекция закончилась")

    # Проверяем лимит покупки
    if present.collection.purchase_limit:
        result = await db.execute(
            select(UserCollectionPurchase).where(
                UserCollectionPurchase.user_id == req.user_id,
                UserCollectionPurchase.collection_id == present.collection_id
            )
        )
        ucp = result.scalar_one_or_none()
        count = ucp.purchase_count if ucp else 0
        if count >= present.collection.purchase_limit:
            raise HTTPException(400, "Достигнут лимит покупки для этой коллекции")

    base_price = float(present.collection.base_price)

    tx_hash, block_num = purchase_present(
        user.wallet_private_key, req.present_id, base_price
    )

    now = datetime.datetime.now()

    # Транзакция в БД
    type_id = await _get_type_id(db, "purchase")
    status_id = await _get_status_id(db, "confirmed")

    db.add(Transaction(
        buyer_id=req.user_id, seller_id=req.user_id,
        present_id=req.present_id, type_id=type_id, status_id=status_id,
        transaction_price=Decimal(str(base_price)),
        platform_fee=Decimal("0"), seller_received=Decimal(str(base_price)),
        blockchain_network="localhost", blockchain_tx_hash=tx_hash,
        block_number=block_num, transaction_date=now
    ))

    # Уменьшаем доступное количество
    present.collection.collection_available_count -= 1

    # Обновляем счётчик покупок
    result = await db.execute(
        select(UserCollectionPurchase).where(
            UserCollectionPurchase.user_id == req.user_id,
            UserCollectionPurchase.collection_id == present.collection_id
        )
    )
    ucp = result.scalar_one_or_none()
    if ucp:
        ucp.purchase_count += 1
    else:
        db.add(UserCollectionPurchase(
            user_id=req.user_id,
            collection_id=present.collection_id,
            purchase_count=1
        ))

    await _log_event(db, "buy", tx_hash, block_num,
                     {"present_id": req.present_id, "buyer_id": req.user_id, "price": base_price})
    await db.commit()

    return {"success": True, "tx_hash": tx_hash, "block_number": block_num}


@router.post("/present/list", summary="Выставить подарок на продажу")
async def list_on_marketplace(req: ListPresentRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, req.user_id)

    result = await db.execute(
        select(Present).where(Present.present_id == req.present_id, Present.is_burned == False)
    )
    present = result.scalar_one_or_none()
    if not present:
        raise HTTPException(404, "Подарок не найден")
    if not present.is_upgraded:
        raise HTTPException(400, "Можно продавать только улучшенные подарки")

    # Проверяем нет ли активного листинга
    active_status_id = await _get_listing_status_id(db, "active")
    result = await db.execute(
        select(Listing).where(
            Listing.present_id == req.present_id,
            Listing.status_id == active_status_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Подарок уже выставлен на продажу")

    tx_hash, block_num = list_present(user.wallet_private_key, req.present_id, req.price)

    db.add(Listing(
        present_id=req.present_id, seller_id=req.user_id,
        status_id=active_status_id, price=Decimal(str(req.price)),
        blockchain_tx_hash=tx_hash
    ))

    await _log_event(db, "list", tx_hash, block_num,
                     {"present_id": req.present_id, "seller_id": req.user_id, "price": req.price})
    await db.commit()

    return {"success": True, "tx_hash": tx_hash}


@router.post("/present/buy", summary="Купить подарок на маркетплейсе")
async def buy_on_marketplace(req: BuyPresentRequest, db: AsyncSession = Depends(get_db)):
    buyer = await _get_user(db, req.buyer_user_id)

    active_status_id = await _get_listing_status_id(db, "active")
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.status))
        .where(Listing.present_id == req.present_id, Listing.status_id == active_status_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(404, "Активный лот не найден")
    if listing.seller_id == req.buyer_user_id:
        raise HTTPException(400, "Нельзя купить свой подарок")

    price = float(listing.price)
    platform_fee = round(price * 0.05, 6)
    seller_received = round(price - platform_fee, 6)

    tx_hash, block_num = buy_present(buyer.wallet_private_key, req.present_id, price)

    now = datetime.datetime.now()
    sold_status_id = await _get_listing_status_id(db, "sold")
    listing.status_id = sold_status_id

    type_id = await _get_type_id(db, "marketplace")
    status_id = await _get_status_id(db, "confirmed")

    db.add(Transaction(
        buyer_id=req.buyer_user_id, seller_id=listing.seller_id,
        present_id=req.present_id, type_id=type_id, status_id=status_id,
        transaction_price=Decimal(str(price)),
        platform_fee=Decimal(str(platform_fee)),
        seller_received=Decimal(str(seller_received)),
        blockchain_network="localhost", blockchain_tx_hash=tx_hash,
        block_number=block_num, transaction_date=now
    ))

    await _log_event(db, "buy", tx_hash, block_num, {
        "present_id": req.present_id, "buyer_id": req.buyer_user_id,
        "seller_id": listing.seller_id, "price": price
    })
    await db.commit()

    return {
        "success": True, "tx_hash": tx_hash,
        "price": price, "platform_fee": platform_fee,
        "seller_received": seller_received
    }


@router.post("/present/delist", summary="Снять подарок с продажи")
async def delist(req: DelistPresentRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, req.user_id)

    active_status_id = await _get_listing_status_id(db, "active")
    result = await db.execute(
        select(Listing).where(
            Listing.present_id == req.present_id,
            Listing.seller_id == req.user_id,
            Listing.status_id == active_status_id
        )
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(404, "Активный лот не найден")

    tx_hash, _ = delist_present(user.wallet_private_key, req.present_id)

    cancelled_status_id = await _get_listing_status_id(db, "cancelled")
    listing.status_id = cancelled_status_id

    await _log_event(db, "delist", tx_hash, 0,
                     {"present_id": req.present_id, "user_id": req.user_id})
    await db.commit()

    return {"success": True, "tx_hash": tx_hash}


@router.post("/present/burn", summary="Burn-to-redeem")
async def burn(req: BurnPresentRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user(db, req.user_id)

    # Берём цену первоначальной покупки
    purchase_type_id = await _get_type_id(db, "purchase")
    result = await db.execute(
        select(Transaction.transaction_price)
        .where(
            Transaction.present_id == req.present_id,
            Transaction.type_id == purchase_type_id
        )
        .order_by(Transaction.transaction_date.asc())
        .limit(1)
    )
    original_price = result.scalar_one_or_none()
    if not original_price:
        raise HTTPException(400, "Не найдена цена первоначальной покупки")

    refund = round(float(original_price) * 0.85, 6)

    tx_hash, block_num = burn_present(user.wallet_private_key, req.present_id, refund)

    now = datetime.datetime.now()

    # Помечаем подарок как сожжённый
    result = await db.execute(select(Present).where(Present.present_id == req.present_id))
    present = result.scalar_one()
    present.is_burned = True

    type_id = await _get_type_id(db, "burn")
    status_id = await _get_status_id(db, "confirmed")

    db.add(Transaction(
        buyer_id=req.user_id, seller_id=req.user_id,
        present_id=req.present_id, type_id=type_id, status_id=status_id,
        transaction_price=Decimal(str(refund)),
        platform_fee=Decimal("0"), seller_received=Decimal(str(refund)),
        blockchain_network="localhost", blockchain_tx_hash=tx_hash,
        block_number=block_num, transaction_date=now
    ))

    await _log_event(db, "burn", tx_hash, block_num,
                     {"present_id": req.present_id, "user_id": req.user_id, "refund": refund})
    await db.commit()

    return {"success": True, "tx_hash": tx_hash, "refund": refund}


@router.get("/present/{present_id}/owner", summary="Владелец подарка из блокчейна")
async def present_owner(present_id: int):
    address = get_present_owner(present_id)
    if address == "0x0000000000000000000000000000000000000000":
        return {"present_id": present_id, "owner": None}
    return {"present_id": present_id, "owner_address": address}