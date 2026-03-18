from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Model(Base):
    __tablename__ = "models"

    model_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    collection_id = Column(BIGINT(unsigned=True), ForeignKey("collections.collection_id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(255), nullable=False)
    model_description = Column(Text, nullable=True)
    model_image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    collection = relationship("Collection", back_populates="models")
    presents = relationship("Present", back_populates="model")