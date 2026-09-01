"""Kết nối database qua SQLAlchemy.

- Mặc định: SQLite (chạy ngay, không cần cấu hình) — dùng cho dev/test nhanh.
- Production / Supabase: đặt DATABASE_URL=postgresql://... trong .env để dùng Supabase PostgreSQL.

Cùng một code chạy được trên cả 2, chỉ khác connection string.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool, SingletonThreadPool

from app.config import get_settings

settings = get_settings()

connect_args = {}
engine_kwargs: dict = {"pool_pre_ping": True}

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite cần check_same_thread=False khi dùng với FastAPI (multi-thread)
    connect_args = {"check_same_thread": False}
    # SQLite không hỗ trợ connection pool đa luồng tốt - dùng SingletonThreadPool
    engine_kwargs["poolclass"] = SingletonThreadPool
else:
    # PostgreSQL / Supabase: pool chuẩn phù hợp với môi trường serverless
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_timeout"] = 30
    # Supabase có proxy pooler; nếu dùng connection pooler (port 6543) thì tắt pool client
    if ".pooler.supabase.com" in settings.DATABASE_URL and ":6543" in settings.DATABASE_URL:
        engine_kwargs["pool_size"] = 1
        engine_kwargs["max_overflow"] = 0
        engine_kwargs["poolclass"] = QueuePool

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class cho tất cả ORM models."""


def get_db():
    """FastAPI dependency: mở session, tự đóng sau request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
