"""Alembic env - kết nối models YangRent và đọc DATABASE_URL từ môi trường."""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Cho phép import `app.*` khi chạy alembic từ thư mục backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings  # noqa: E402
from app.database import Base  # noqa: E402
from app.models import (  # noqa: E402,F401  (import để nạp toàn bộ models vào metadata)
    Amenity, Contract, Conversation, Favorite, Invoice, InvoiceItem, MaintenanceRequest,
    Message, MeterReading, Notification, Report, Role, Room, RoomImage,
    RoommatePost, User, Payment, RentalRequest, AuditLog,
)

config = context.config

# Ưu tiên DATABASE_URL từ biến môi trường / .env (do pydantic-settings đọc)
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Chạy migration ở chế độ offline (chỉ sinh SQL, không cần kết nối)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Chạy migration ở chế độ online (kết nối database thật)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
