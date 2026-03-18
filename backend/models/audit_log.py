from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    log_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(BIGINT(unsigned=True), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))

    user = relationship("User", back_populates="audit_logs")