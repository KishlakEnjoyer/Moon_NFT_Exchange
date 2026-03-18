from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Collection(Base):
    __tablename__ = "collections"

    collection_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    collection_name = Column(String(255), nullable=False)
    collection_image_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    collection_limit = Column(Integer, nullable=False)
    collection_available_count = Column(Integer, nullable=False)
    purchase_limit = Column(Integer, nullable=True)
    base_price = Column(String(30), nullable=False, default="100.000000")
    blockchain_network = Column(String(50), nullable=False, default="localhost")
    contract_address = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))
    updated_at = Column(DateTime(timezone=False), server_default=func.now(6), onupdate=func.now(6))

    models = relationship("Model", back_populates="collection", cascade="all, delete-orphan")
    presents = relationship("Present", back_populates="collection", cascade="all, delete-orphan")
    user_purchases = relationship("UserCollectionPurchase", back_populates="collection", cascade="all, delete-orphan")