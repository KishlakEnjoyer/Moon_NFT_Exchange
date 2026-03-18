from sqlalchemy import Column, String
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.orm import relationship
from models.base import Base

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    role_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(500), nullable=True)

    users = relationship("User", back_populates="role")