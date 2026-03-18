from models.base import Base
from models.role import Role
from models.user import User
from models.background import Background
from models.symbol import Symbol
from models.collection import Collection
from models.model import Model
from models.present import Present
from models.listing import ListingStatus, Listing
from models.transaction import TransactionType, TransactionStatus, Transaction
from models.album import Album, AlbumPresent
from models.blockchain_event import BlockchainEventType, BlockchainEvent
from models.audit_log import AuditLog

from models.user import User

from sqlalchemy import Column, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class UserCollectionPurchase(Base):
    __tablename__ = "user_collection_purchases"

    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    collection_id = Column(BIGINT(unsigned=True), ForeignKey("collections.collection_id", ondelete="CASCADE"), primary_key=True)
    purchase_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(6), onupdate=func.now(6))

    user = relationship("User", back_populates="purchases")
    collection = relationship("Collection", back_populates="user_purchases")