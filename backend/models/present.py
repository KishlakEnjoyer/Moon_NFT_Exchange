from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Present(Base):
    __tablename__ = "presents"

    present_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    collection_id = Column(BIGINT(unsigned=True), ForeignKey("collections.collection_id", ondelete="CASCADE"), nullable=False)
    model_id = Column(BIGINT(unsigned=True), ForeignKey("models.model_id", ondelete="SET NULL"), nullable=True)
    background_id = Column(BIGINT(unsigned=True), ForeignKey("backgrounds.background_id", ondelete="SET NULL"), nullable=True)
    symbol_id = Column(BIGINT(unsigned=True), ForeignKey("symbols.symbol_id", ondelete="SET NULL"), nullable=True)
    present_num = Column(Integer, nullable=False)
    token_id = Column(String(255), nullable=False)
    metadata_uri = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=False), server_default=func.now(6))
    is_burned = Column(Boolean, nullable=False, default=False)

    collection = relationship("Collection", back_populates="presents")
    model = relationship("Model", back_populates="presents")
    background = relationship("Background", back_populates="presents")
    symbol = relationship("Symbol", back_populates="presents")
    listings = relationship("Listing", back_populates="present", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="present", cascade="all, delete-orphan")
    album_entries = relationship("AlbumPresent", back_populates="present", cascade="all, delete-orphan")

    @property
    def is_upgraded(self) -> bool:
        return all([self.model_id, self.background_id, self.symbol_id])