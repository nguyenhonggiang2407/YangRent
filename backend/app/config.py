"""Cấu hình ứng dụng - đọc từ biến môi trường (.env)."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Tập trung toàn bộ cấu hình. Không hard-code secret trong code."""

    # App
    APP_NAME: str = "YangRent"
    API_PREFIX: str = "/api"

    # Security
    SECRET_KEY: str = "yangrent-dev-secret-key-change-me-in-production"
    JWT_SECRET: str = "yangrent-dev-jwt-secret-change-me-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 ngày

    # Database
    # Mặc định SQLite local; đặt DATABASE_URL=postgresql://... để dùng Supabase PostgreSQL
    DATABASE_URL: str = "sqlite:///./troflow.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Supabase (tuỳ chọn - cho Auth/Storage sau này)
    SUPABASE_URL: str = ""
    # service-role key, chỉ dùng ở backend, KHÔNG đưa ra frontend.
    # Chấp nhận cả SUPABASE_SERVICE_ROLE_KEY (khuyến nghị) và SUPABASE_KEY (tương thích cũ).
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_KEY: str = ""
    STORAGE_BUCKET: str = "room-images"  # bucket public cho ảnh phòng

    @property
    def supabase_key(self) -> str:
        """Ưu tiên SUPABASE_SERVICE_ROLE_KEY, fallback SUPABASE_KEY."""
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY

    # AI (tuỳ chọn)
    OPENAI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
