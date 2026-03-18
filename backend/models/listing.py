from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class ListingStatus(Base):
    __tablename__ = "listing_statuses"

    status_id = Column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    status_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)

    listings = relationship("Listing", back_populates="status")

class Listing(Base):
    __tablename__ = "listings"

    listing_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    present_id = Column(BIGINT(unsigned=True), ForeignKey("presents.present_id", ondelete="CASCADE"), nullable=False)
    seller_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    status_id = Column(TINYINT(unsigned=True), ForeignKey("listing_statuses.status_id"), nullable=False, default=1)
    price = Column(Numeric(18, 6), nullable=False)
    blockchain_tx_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))
    updated_at = Column(DateTime(timezone=False), server_default=func.now(6), onupdate=func.now(6))

    present = relationship("Present", back_populates="listings")
    seller = relationship("User", back_populates="listings")
    status = relationship("ListingStatus", back_populates="listings")