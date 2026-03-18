from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class BlockchainEventType(Base):
    __tablename__ = "blockchain_event_types"

    event_type_id = Column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    event_type_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)

    events = relationship("BlockchainEvent", back_populates="event_type")

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"

    event_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    event_type_id = Column(TINYINT(unsigned=True), ForeignKey("blockchain_event_types.event_type_id"), nullable=False)
    blockchain_network = Column(String(50), nullable=False)
    contract_address = Column(String(255), nullable=False)
    tx_hash = Column(String(255), nullable=False, unique=True)
    block_number = Column(BIGINT(unsigned=True), nullable=True)
    event_data = Column(JSON, nullable=False)
    processed_at = Column(DateTime(timezone=False), nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    event_type = relationship("BlockchainEventType", back_populates="events")