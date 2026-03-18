from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Background(Base):
    __tablename__ = "backgrounds"

    background_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    background_name = Column(String(255), nullable=False)
    background_hex = Column(String(7), nullable=True)
    background_image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    presents = relationship("Present", back_populates="background")