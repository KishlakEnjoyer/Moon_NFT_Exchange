from sqlalchemy import BigInteger, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(Integer, default=1)
    user_tg_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    tg_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tg_visibility: Mapped[int] = mapped_column(Integer, default=1)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    profile_pic_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)
    about_me: Mapped[str | None] = mapped_column(String(150), nullable=True)