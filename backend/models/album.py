from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base

class Album(Base):
    __tablename__ = "albums"

    album_id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    album_owner_id = Column(BIGINT(unsigned=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    album_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(6))
    updated_at = Column(DateTime(timezone=False), server_default=func.now(6), onupdate=func.now(6))

    owner = relationship("User", back_populates="albums")
    album_presents = relationship("AlbumPresent", back_populates="album", cascade="all, delete-orphan")

class AlbumPresent(Base):
    __tablename__ = "album_presents"

    album_id = Column(BIGINT(unsigned=True), ForeignKey("albums.album_id", ondelete="CASCADE"), primary_key=True)
    present_id = Column(BIGINT(unsigned=True), ForeignKey("presents.present_id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime(timezone=False), server_default=func.now(6))

    album = relationship("Album", back_populates="album_presents")
    present = relationship("Present", back_populates="album_entries")