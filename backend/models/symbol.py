from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Symbol(Base):
    __tablename__ = "symbols"

    symbol_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    symbol_name = Column(String(255), nullable=False)
    symbol_image_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    presents = relationship("Present", back_populates="symbol")