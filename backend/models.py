from sqlalchemy import (
    BigInteger,
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    DECIMAL,
    Enum,
    ForeignKey,
    Table,
    LargeBinary,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Many-to-many association tables
album_presents = Table(
    "album_presents",
    Base.metadata,
    Column("album_id", Integer, ForeignKey("albums.album_id"), primary_key=True),
    Column("present_id", Integer, ForeignKey("presents.present_id"), primary_key=True),
)

collection_models = Table(
    "collection_models",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.collection_id"), primary_key=True),
    Column("model_id", Integer, ForeignKey("models.model_id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    user_tgid = Column(BigInteger, primary_key=True, nullable=False)
    user_username = Column(String(255), nullable=True)
    user_firstname = Column(String(255), nullable=True)
    user_lastname = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    last_seen = Column(DateTime, nullable=True, onupdate=func.now())
    user_pfps = Column(LargeBinary, nullable=True)  # mediumblob

    # Relationships
    albums = relationship("Album", back_populates="owner", foreign_keys="Album.album_owner_id")
    presents_as_creator = relationship("Present", foreign_keys="Present.creator_id", back_populates="creator")
    presents_as_owner = relationship("Present", foreign_keys="Present.owner_id", back_populates="owner")
    listings = relationship("Listing", back_populates="seller")
    transactions_as_buyer = relationship("Transaction", foreign_keys="Transaction.buyer_id", back_populates="buyer")
    transactions_as_seller = relationship("Transaction", foreign_keys="Transaction.seller_id", back_populates="seller")


class Album(Base):
    __tablename__ = "albums"

    album_id = Column(Integer, primary_key=True, autoincrement=True)
    album_owner_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    album_title = Column(String(255), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="albums", foreign_keys=[album_owner_id])
    presents = relationship("Present", secondary=album_presents, back_populates="albums")


class Background(Base):
    __tablename__ = "backgrounds"

    background_id = Column(Integer, primary_key=True, autoincrement=True)
    background_name = Column(String(255), nullable=False)
    background_hex = Column(String(7), nullable=False)  # e.g., "#FF5733"

    # Relationships
    presents = relationship("Present", back_populates="background")


class Collection(Base):
    __tablename__ = "collections"

    collection_id = Column(Integer, primary_key=True, autoincrement=True)
    collection_name = Column(String(255), nullable=False)
    collection_image = Column(LargeBinary, nullable=False)  # mediumblob
    blockchain_network = Column(String(50), default="ton")
    contract_address = Column(String(255), nullable=True)

    # Relationships
    presents = relationship("Present", back_populates="collection")
    models = relationship("Model", secondary=collection_models, back_populates="collections")


class Model(Base):
    __tablename__ = "models"

    model_id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(255), nullable=False)
    model_image = Column(LargeBinary, nullable=False)  # mediumblob

    # Relationships
    presents = relationship("Present", back_populates="model")
    collections = relationship("Collection", secondary=collection_models, back_populates="models")


class Present(Base):
    __tablename__ = "presents"

    present_id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    owner_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.collection_id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.model_id"), nullable=True)
    background_id = Column(Integer, ForeignKey("backgrounds.background_id"), nullable=True)
    present_num = Column(Integer, nullable=True)
    generated_at = Column(DateTime, nullable=True)
    token_id = Column(String(255), nullable=True)
    blockchain_tx_hash = Column(String(255), nullable=True)
    present_image = Column(LargeBinary, nullable=False)  # mediumblob
    blockchain_status = Column(
        Enum("pending_mint", "minted", "transferred", "synced", name="blockchain_status_enum"),
        default="synced"
    )
    metadata_uri = Column(String(512), nullable=True, comment="IPFS или HTTPS ссылка на JSON")

    # Relationships
    creator = relationship("User", back_populates="presents_as_creator", foreign_keys=[creator_id])
    owner = relationship("User", back_populates="presents_as_owner", foreign_keys=[owner_id])
    collection = relationship("Collection", back_populates="presents")
    model = relationship("Model", back_populates="presents")
    background = relationship("Background", back_populates="presents")
    albums = relationship("Album", secondary=album_presents, back_populates="presents")
    listings = relationship("Listing", back_populates="present")
    transactions = relationship("Transaction", back_populates="present")


class Listing(Base):
    __tablename__ = "listings"

    listing_id = Column(Integer, primary_key=True, autoincrement=True)
    present_id = Column(Integer, ForeignKey("presents.present_id"), nullable=False, unique=False)
    seller_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    price = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(10), default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    present = relationship("Present", back_populates="listings")
    seller = relationship("User", back_populates="listings")

    __table_args__ = (
        # UNIQUE (present_id, is_active) — эмулируем через constraint
        # Однако в SQLAlchemy 2.0+ можно оставить как есть, если уже есть в БД
        # FastAPI/SQLAlchemy не проверяет это на уровне ORM, только на уровне БД
    )


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    buyer_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    seller_id = Column(BigInteger, ForeignKey("users.user_tgid"), nullable=False)
    present_id = Column(Integer, ForeignKey("presents.present_id"), nullable=False)
    transaction_price = Column(DECIMAL(18, 6), nullable=False)
    transaction_status = Column(
        Enum("Pending", "Completed", "Failed", name="transaction_status_enum"),
        nullable=True
    )
    transaction_date = Column(DateTime, nullable=True)

    # Relationships
    buyer = relationship("User", back_populates="transactions_as_buyer", foreign_keys=[buyer_id])
    seller = relationship("User", back_populates="transactions_as_seller", foreign_keys=[seller_id])
    present = relationship("Present", back_populates="transactions")


class Rate(Base):
    __tablename__ = "rates"

    rate_id = Column(Integer, primary_key=True, autoincrement=True)
    rate_rating = Column(Integer, nullable=False)  # e.g., 1–5
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"), nullable=False)

    # Relationship (optional, usually not needed in reverse)
    # transaction = relationship("Transaction", back_populates="rates")