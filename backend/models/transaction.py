from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class TransactionType(Base):
    __tablename__ = "transaction_types"

    type_id = Column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    type_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)

    transactions = relationship("Transaction", back_populates="type")

class TransactionStatus(Base):
    __tablename__ = "transaction_statuses"

    status_id = Column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    status_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)

    transactions = relationship("Transaction", back_populates="status")

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    buyer_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    seller_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    present_id = Column(BIGINT(unsigned=True), ForeignKey("presents.present_id", ondelete="CASCADE"), nullable=False)
    type_id = Column(TINYINT(unsigned=True), ForeignKey("transaction_types.type_id"), nullable=False)
    status_id = Column(TINYINT(unsigned=True), ForeignKey("transaction_statuses.status_id"), nullable=False, default=1)
    transaction_price = Column(Numeric(18, 6), nullable=False)
    platform_fee = Column(Numeric(18, 6), nullable=False, default=0)
    seller_received = Column(Numeric(18, 6), nullable=False)
    currency = Column(String(10), nullable=False, default="TON")
    blockchain_network = Column(String(50), nullable=False, default="localhost")
    blockchain_tx_hash = Column(String(255), nullable=False, unique=True)
    block_number = Column(BIGINT(unsigned=True), nullable=True)
    transaction_date = Column(DateTime(timezone=False), server_default=func.now(6))
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    present = relationship("Present", back_populates="transactions")
    type = relationship("TransactionType", back_populates="transactions")
    status = relationship("TransactionStatus", back_populates="transactions")