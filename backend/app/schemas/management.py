"""Schemas cho hop dong / hoa don / dien nuoc / sua chua."""
from typing import Optional


from pydantic import BaseModel, Field


class ContractCreateRequest(BaseModel):
    room_id: int
    tenant_id: int
    start_date: str
    end_date: str
    monthly_rent: int
    deposit_amount: int = 0
    terms: str = ""


class ContractStatusUpdate(BaseModel):
    status: str  # see CONTRACT_STATUS in model


class ContractSignRequest(BaseModel):
    signature_name: str = Field(min_length=2, max_length=120)


class BookingCreateRequest(BaseModel):
    room_id: Optional[int] = None  # room_id lay tu URL path
    message: str = ""
    move_in_date: str = ""
    lease_duration: Optional[int] = None  # tháng
    deposit_amount: int = 0


class RentalRequestStatusUpdate(BaseModel):
    status: str  # ACCEPTED / REJECTED / CANCELLED


class MeterReadingCreate(BaseModel):
    room_id: int
    period: str = ""  # YYYY-MM, mặc định là tháng hiện tại nếu để trống
    meter_type: str  # ELECTRICITY / WATER
    previous_value: float = 0
    current_value: float = Field(ge=0)
    image_url: str = ""


class InvoiceCreateRequest(BaseModel):
    room_id: int
    tenant_id: int
    period: str
    due_date: str = ""
    rent_amount: float = 0
    electricity_amount: float = 0
    water_amount: float = 0
    internet_amount: float = 0
    service_amount: float = 0
    other_amount: float = 0


class PaymentCreateRequest(BaseModel):
    invoice_id: int = 0  # Không bắt buộc vì invoice_id đã có trong URL path
    method: str = "QR"


class MaintenanceCreateRequest(BaseModel):
    room_id: int
    title: str = Field(min_length=5, max_length=200)
    description: str = ""
    priority: str = "MEDIUM"


class MaintenanceStatusUpdate(BaseModel):
    status: str  # PENDING/IN_PROGRESS/RESOLVED/REJECTED
