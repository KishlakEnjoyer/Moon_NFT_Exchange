from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.mysql import TINYINT, BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    role_id = Column(TINYINT(unsigned=True), ForeignKey("roles.role_id"), nullable=False, default=1)
    user_tg_id = Column(BigInteger, nullable=True, unique=True)
    username = Column(String(255), nullable=False, unique=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    profile_pic_url = Column(Text, nullable=True)
    wallet_address = Column(String(42), nullable=True, unique=True)
    wallet_private_key = Column(String(66), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))
    last_seen = Column(DateTime(timezone=False), server_default=func.now(6))

    role = relationship("Role", back_populates="users")
    albums = relationship("Album", back_populates="owner", cascade="all, delete-orphan")
    listings = relationship("Listing", back_populates="seller", cascade="all, delete-orphan")
    purchases = relationship("UserCollectionPurchase", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")