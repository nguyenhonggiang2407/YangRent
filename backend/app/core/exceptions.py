"""Các exception nghiệp vụ + handler chuẩn hoá response lỗi."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Lỗi nghiệp vụ có status_code + message tiếng Việt rõ ràng."""

    def __init__(self, status_code: int = 400, message: str = "Có lỗi xảy ra", code: str = "ERROR"):
        self.status_code = status_code
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Không tìm thấy dữ liệu"):
        super().__init__(404, message, "NOT_FOUND")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Chưa đăng nhập"):
        super().__init__(401, message, "UNAUTHORIZED")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Bạn không có quyền thực hiện hành động này"):
        super().__init__(403, message, "FORBIDDEN")


class ConflictError(AppError):
    def __init__(self, message: str = "Dữ liệu đã tồn tại"):
        super().__init__(409, message, "CONFLICT")


def register_exception_handlers(app: FastAPI) -> None:
    """Response format thống nhất:
    {"success": false, "message": "...", "code": "..."}
    """

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.message, "code": exc.code},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        # Tránh leak chi tiết lỗi ra client trong production
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Có lỗi xảy ra, vui lòng thử lại", "code": "INTERNAL_ERROR"},
        )
