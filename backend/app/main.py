"""YangRent Backend - FastAPI application.

Khởi tạo app, CORS, exception handlers và đăng ký toàn bộ routers.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.routers import (admin, ai, auth, chat, contracts, dashboard, invoices,
                         maintenance, meters, notifications, roommates, rooms, uploads, users)

settings = get_settings()

app = FastAPI(
    title="YangRent API - Rental Housing Platform",
    description="Backend cho nền tảng tìm kiếm và quản lý nhà, phòng và căn hộ cho thuê.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - chỉ cho phép các origin cấu hình trong .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Đăng ký routers
api_prefix = settings.API_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(rooms.router, prefix=api_prefix)
app.include_router(roommates.router, prefix=api_prefix)
app.include_router(contracts.router, prefix=api_prefix)
app.include_router(invoices.router, prefix=api_prefix)
app.include_router(invoices.payments_router, prefix=api_prefix)
app.include_router(meters.router, prefix=api_prefix)
app.include_router(maintenance.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(uploads.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)


@app.get("/")
def root():
    return {"success": True, "data": {"name": settings.APP_NAME, "docs": "/docs"}, "message": "Welcome"}


@app.get("/api/health")
def health():
    data = {"status": "ok"}
    if os.environ.get("PORTFOLIO_DEMO") == "true":
        from sqlalchemy import text
        from app.database import SessionLocal
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        data.update(database="ok", mode="ephemeral-demo",
                    revision=os.environ.get("RENDER_GIT_COMMIT", "local"))
    return {"success": True, "data": data, "message": "Healthy"}


# Optional same-origin frontend for the separately configured portfolio demo.
# API-only deployments keep their existing routes and root JSON response.
if os.environ.get("FRONTEND_DIST_DIR"):
    from app.static_frontend import install_frontend
    install_frontend(app, os.environ["FRONTEND_DIST_DIR"])
