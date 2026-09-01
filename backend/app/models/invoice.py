"""Invoice (hoá đơn) + InvoiceItem (chi tiết) + Payment (thanh toán)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

INVOICE_STATUS = ("PENDING", "PAID", "FAILED", "EXPIRED")
PAYMENT_METHODS = ("QR", "TRANSFER", "CASH")


class InvoiceItem(Base):
    """Chi tiết hoá đơn: tiền phòng, điện, nước, internet, dịch vụ..."""
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(100))  # Tiền phòng / Tiền điện / Internet...
    quantity: Mapped[float] = mapped_column(Float, default=0)  # số kWh, m³, tháng...
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float] = mapped_column(Float, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    invoice = relationship("Invoice", back_populates="items")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    period: Mapped[str] = mapped_column(String(10), index=True)  # "2026-07"
    due_date: Mapped[str] = mapped_column(String(20), default="")

    rent_amount: Mapped[float] = mapped_column(Float, default=0)
    electricity_amount: Mapped[float] = mapped_column(Float, default=0)
    water_amount: Mapped[float] = mapped_column(Float, default=0)
    internet_amount: Mapped[float] = mapped_column(Float, default=0)
    service_amount: Mapped[float] = mapped_column(Float, default=0)
    other_amount: Mapped[float] = mapped_column(Float, default=0)

    total_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    qr_content: Mapped[str] = mapped_column(String(500), default="")  # nội dung QR thanh toán
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    room = relationship("Room", lazy="selectin")
    tenant = relationship("User", foreign_keys=[tenant_id], lazy="selectin")
    landlord = relationship("User", foreign_keys=[landlord_id], lazy="selectin")
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan",
        order_by="InvoiceItem.sort_order", lazy="selectin",
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    method: Mapped[str] = mapped_column(String(20), default="QR")
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING/PAID/FAILED/EXPIRED
    transaction_ref: Mapped[str] = mapped_column(String(100), default="")
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", lazy="selectin")
    user = relationship("User", lazy="selectin")
