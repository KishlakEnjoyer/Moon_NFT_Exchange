from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("roles.role_id"),
        nullable=False,
        default=1,
    )
    user_tg_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    tg_username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tg_visibility: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    username: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    profile_pic_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    wallet_address: Mapped[str | None] = mapped_column(String(42), unique=True, nullable=True)
    wallet_private_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    wallet_encryption_version: Mapped[int | None] = mapped_column(SmallInteger, nullable=True, default=1)
    wallet_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
        default=datetime.utcnow,
    )

    is_active: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    about_me: Mapped[str | None] = mapped_column(String(150), nullable=True)

    role: Mapped[Role] = relationship("Role", back_populates="users")

    notifications: Mapped[list[Notification]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    albums: Mapped[list[Album]] = relationship(
        "Album",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    listings: Mapped[list[Listing]] = relationship(
        "Listing",
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    buyer_transactions: Mapped[list[Transaction]] = relationship(
        "Transaction",
        foreign_keys="Transaction.buyer_id",
        back_populates="buyer",
        cascade="all, delete-orphan",
    )
    seller_transactions: Mapped[list[Transaction]] = relationship(
        "Transaction",
        foreign_keys="Transaction.seller_id",
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    wallet_topups: Mapped[list[WalletTopup]] = relationship(
        "WalletTopup",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    collection_purchases: Mapped[list[UserCollectionPurchase]] = relationship(
        "UserCollectionPurchase",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    cart_items: Mapped[list[CartItem]] = relationship(
        "CartItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    users: Mapped[list[User]] = relationship("User", back_populates="role")


class Symbols(Base):
    __tablename__ = "symbols"

    symbol_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    symbol_image_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    presents: Mapped[list[Present]] = relationship("Present", back_populates="symbol")


class Backgrounds(Base):
    __tablename__ = "backgrounds"

    background_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    background_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    background_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    presents: Mapped[list[Present]] = relationship("Present", back_populates="background")


class Collections(Base):
    __tablename__ = "collections"

    collection_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    collection_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    collection_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    collection_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    purchase_limit: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("100.00"))
    is_active: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    models: Mapped[list[Models]] = relationship(
        "Models",
        back_populates="collection",
        cascade="all, delete-orphan",
    )
    presents: Mapped[list[Present]] = relationship(
        "Present",
        back_populates="collection",
        cascade="all, delete-orphan",
    )
    user_purchases: Mapped[list[UserCollectionPurchase]] = relationship(
        "UserCollectionPurchase",
        back_populates="collection",
        cascade="all, delete-orphan",
    )


class Models(Base):
    __tablename__ = "models"

    model_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("collections.collection_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    collection: Mapped[Collections] = relationship("Collections", back_populates="models")
    presents: Mapped[list[Present]] = relationship("Present", back_populates="model")


class Present(Base):
    __tablename__ = "presents"

    present_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("collections.collection_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("models.model_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    background_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("backgrounds.background_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    symbol_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("symbols.symbol_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    present_num: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(String(100), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    is_burned: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    is_visible: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    original_sender_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=True, index=True)

    collection: Mapped[Collections] = relationship("Collections", back_populates="presents")
    model: Mapped[Models | None] = relationship("Models", back_populates="presents")
    background: Mapped[Backgrounds | None] = relationship("Backgrounds", back_populates="presents")
    symbol: Mapped[Symbols | None] = relationship("Symbols", back_populates="presents")
    original_sender: Mapped[User | None] = relationship("User", foreign_keys=[original_sender_id])

    listings: Mapped[list[Listing]] = relationship(
        "Listing",
        back_populates="present",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[list[Transaction]] = relationship(
        "Transaction",
        back_populates="present",
        cascade="all, delete-orphan",
    )
    album_links: Mapped[list[AlbumPresent]] = relationship(
        "AlbumPresent",
        back_populates="present",
        cascade="all, delete-orphan",
    )


class Album(Base):
    __tablename__ = "albums"

    album_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    album_owner_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )
    album_title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    owner: Mapped[User] = relationship("User", back_populates="albums")
    album_presents: Mapped[list[AlbumPresent]] = relationship(
        "AlbumPresent",
        back_populates="album",
        cascade="all, delete-orphan",
    )


class AlbumPresent(Base):
    __tablename__ = "album_presents"

    album_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("albums.album_id", ondelete="CASCADE"),
        primary_key=True,
    )
    present_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("presents.present_id", ondelete="CASCADE"),
        primary_key=True,
    )
    added_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True, default=datetime.utcnow)

    album: Mapped[Album] = relationship("Album", back_populates="album_presents")
    present: Mapped[Present] = relationship("Present", back_populates="album_links")


class ListingStatuses(Base):
    __tablename__ = "listing_statuses"

    status_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    status_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    listings: Mapped[list[Listing]] = relationship("Listing", back_populates="status")


class Listing(Base):
    __tablename__ = "listings"

    listing_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    present_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("presents.present_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("listing_statuses.status_id"),
        nullable=False,
        default=1,
        index=True,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    present: Mapped[Present] = relationship("Present", back_populates="listings")
    seller: Mapped[User] = relationship("User", back_populates="listings")
    status: Mapped[ListingStatuses] = relationship("ListingStatuses", back_populates="listings")


class TopupStatuses(Base):
    __tablename__ = "topup_statuses"

    status_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    status_name: Mapped[str] = mapped_column(String(50), nullable=False)

    wallet_topups: Mapped[list[WalletTopup]] = relationship("WalletTopup", back_populates="topup_status")


class WalletTopup(Base):
    __tablename__ = "wallet_topups"

    topup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wallet_address: Mapped[str] = mapped_column(
        String(42),
        ForeignKey("users.wallet_address"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    requested_via: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("topup_statuses.status_id"),
        nullable=False,
        index=True,
    )
    tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    user: Mapped[User] = relationship("User", back_populates="wallet_topups")
    topup_status: Mapped[TopupStatuses] = relationship("TopupStatuses", back_populates="wallet_topups")


class TransactionStatuses(Base):
    __tablename__ = "transaction_statuses"

    status_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    status_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="status")


class TransactionTypes(Base):
    __tablename__ = "transaction_types"

    type_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    type_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="transaction_type")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    buyer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    present_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("presents.present_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("transaction_types.type_id"),
        nullable=False,
        index=True,
    )
    status_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("transaction_statuses.status_id"),
        nullable=False,
        default=1,
        index=True,
    )
    transaction_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=Decimal("0.000000"))
    seller_received: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    buyer: Mapped[User] = relationship(
        "User",
        foreign_keys=[buyer_id],
        back_populates="buyer_transactions",
    )
    seller: Mapped[User] = relationship(
        "User",
        foreign_keys=[seller_id],
        back_populates="seller_transactions",
    )
    present: Mapped[Present] = relationship("Present", back_populates="transactions")
    transaction_type: Mapped[TransactionTypes] = relationship("TransactionTypes", back_populates="transactions")
    status: Mapped[TransactionStatuses] = relationship("TransactionStatuses", back_populates="transactions")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    type_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("notification_types.type_id"),
        nullable=False,
    )
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_read: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    user: Mapped[User] = relationship("User", back_populates="notifications")
    notification_type: Mapped[NotificationTypes] = relationship(
        "NotificationTypes",
        back_populates="notifications",
    )


class NotificationTypes(Base):
    __tablename__ = "notification_types"

    type_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    type_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    notifications: Mapped[list[Notification]] = relationship(
        "Notification",
        back_populates="notification_type",
    )


class UserCollectionPurchase(Base):
    __tablename__ = "user_collection_purchases"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    collection_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("collections.collection_id", ondelete="CASCADE"),
        primary_key=True,
    )
    purchase_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user: Mapped[User] = relationship("User", back_populates="collection_purchases")
    collection: Mapped[Collections] = relationship("Collections", back_populates="user_purchases")


class ActiveListingsView(Base):
    __tablename__ = "active_listings_view"

    listing_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    listed_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)

    present_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    present_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    collection_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    collection_name: Mapped[str] = mapped_column(String(255), nullable=False)

    model_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    background_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    symbol_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    seller_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    seller_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seller_wallet: Mapped[str | None] = mapped_column(String(42), nullable=True)


class CollectionAvailability(Base):
    __tablename__ = "collection_availability"

    collection_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    collection_name: Mapped[str] = mapped_column(String(255), nullable=False)
    collection_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    purchase_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    minted_count: Mapped[int] = mapped_column(BigInteger, nullable=False)
    available_count: Mapped[int] = mapped_column(BigInteger, nullable=False)


class CurrentOwner(Base):
    __tablename__ = "current_owners"

    present_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    owned_since: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)


class PresentsWithState(Base):
    __tablename__ = "presents_with_state"

    present_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    collection_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    model_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    background_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    symbol_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    present_num: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    is_burned: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_upgraded: Mapped[int] = mapped_column(SmallInteger, nullable=False)


class ReportType(Base):
    __tablename__ = "report_types"

    report_type_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_type_title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    reports: Mapped[list[Report]] = relationship("Report", back_populates="report_type")


class ReportStatus(Base):
    __tablename__ = "report_statuses"

    report_status_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_status_name: Mapped[str | None] = mapped_column(String(65), nullable=True)

    reports: Mapped[list[Report]] = relationship("Report", back_populates="report_status")


class Report(Base):
    __tablename__ = "reports"

    report_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )
    receiver_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )
    report_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("report_types.report_type_id"),
        nullable=False,
        index=True,
    )
    report_status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("report_statuses.report_status_id"),
        nullable=False,
        default=1,
        index=True,
    )
    moderator_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)

    sender: Mapped[User] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped[User] = relationship("User", foreign_keys=[receiver_id])
    report_type: Mapped[ReportType] = relationship("ReportType", back_populates="reports")
    report_status: Mapped[ReportStatus] = relationship("ReportStatus", back_populates="reports")
    moderator: Mapped[User | None] = relationship("User", foreign_keys=[moderator_id])


class CartItem(Base):
    __tablename__ = "cart_items"

    cart_item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("listings.listing_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)

    user: Mapped[User] = relationship("User", back_populates="cart_items")
    listing: Mapped[Listing] = relationship("Listing")


class TransactionHistory(Base):
    __tablename__ = "transaction_history"

    transaction_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    seller_received: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)

    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    transaction_status: Mapped[str] = mapped_column(String(50), nullable=False)

    present_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)

    collection_name: Mapped[str] = mapped_column(String(255), nullable=False)

    buyer_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    buyer_username: Mapped[str | None] = mapped_column(String(255), nullable=True)

    seller_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    seller_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
