"""Nghiệp vụ: hợp đồng, hoá đơn, thanh toán, chỉ số điện/nước, sửa chữa."""
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.contract import Contract
from app.models.invoice import Invoice, Payment
from app.models.maintenance import MaintenanceRequest
from app.models.meter import MeterReading
from app.models.room import Room
from app.models.user import User


# ---------- Contract ----------
def get_contract_or_404(db: Session, contract_id: int) -> Contract:
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise NotFoundError("Không tìm thấy hợp đồng")
    return c


def create_contract(db: Session, data) -> Contract:
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")
    count = db.query(Contract).count() + 1
    code = f"TF-{datetime.now().year}-{count:03d}"
    contract = Contract(
        room_id=data.room_id, landlord_id=room.landlord_id, tenant_id=data.tenant_id,
        code=code, start_date=data.start_date, end_date=data.end_date,
        monthly_rent=data.monthly_rent, deposit_amount=data.deposit_amount, terms=data.terms,
        status="SENT",
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


def update_contract_status(db: Session, contract: Contract, status: str) -> Contract:
    if status not in ("DRAFT", "SENT", "ACTIVE", "COMPLETED", "TERMINATED"):
        raise ForbiddenError("Trạng thái hợp đồng không hợp lệ")
    contract.status = status
    if status == "ACTIVE":
        # Đánh dấu phòng đã cho thuê
        room = db.query(Room).filter(Room.id == contract.room_id).first()
        if room:
            room.status = "RENTED"
    db.commit()
    db.refresh(contract)
    return contract


# ---------- Meter ----------
def get_meter_or_404(db: Session, meter_id: int) -> MeterReading:
    m = db.query(MeterReading).filter(MeterReading.id == meter_id).first()
    if not m:
        raise NotFoundError("Không tìm thấy chỉ số")
    return m


def create_meter_reading(db: Session, data) -> MeterReading:
    """Nhập chỉ số mới, tự tính tiêu thụ + thành tiền theo giá của phòng."""
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")

    contract = db.query(Contract).filter(
        Contract.room_id == data.room_id, Contract.status == "ACTIVE"
    ).first()

    period = data.period or datetime.now().strftime("%Y-%m")
    consumption = max(data.current_value - data.previous_value, 0)
    unit_price = room.electricity_price if data.meter_type == "ELECTRICITY" else room.water_price
    amount = round(consumption * unit_price)

    meter = MeterReading(
        room_id=data.room_id,
        contract_id=contract.id if contract else 0,
        period=period, meter_type=data.meter_type,
        previous_value=data.previous_value, current_value=data.current_value,
        consumption=consumption, unit_price=unit_price, amount=amount,
        image_url=data.image_url, status="CONFIRMED",
    )
    db.add(meter)
    db.commit()
    db.refresh(meter)
    return meter


# ---------- Invoice ----------
def get_invoice_or_404(db: Session, invoice_id: int) -> Invoice:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise NotFoundError("Không tìm thấy hoá đơn")
    return inv


def create_invoice(db: Session, data) -> Invoice:
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")

    total = (data.rent_amount + data.electricity_amount + data.water_amount
             + data.internet_amount + data.service_amount + data.other_amount)

    invoice = Invoice(
        room_id=data.room_id, tenant_id=data.tenant_id, landlord_id=room.landlord_id,
        period=data.period, due_date=data.due_date,
        rent_amount=data.rent_amount, electricity_amount=data.electricity_amount,
        water_amount=data.water_amount, internet_amount=data.internet_amount,
        service_amount=data.service_amount, other_amount=data.other_amount,
        total_amount=total, status="PENDING",
        qr_content=f"TF{data.room_id:04d}-{data.period}",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def pay_invoice(db: Session, invoice: Invoice, user: User, method: str = "QR") -> dict:
    """Thanh toán hoá đơn.

    KHÔNG giả vờ giao dịch thật: tạo bản ghi payment + đánh dấu PAID
    như một mô phỏng rõ ràng. Khi tích hợp cổng thanh toán thật, thay
    logic này bằng payment gateway.
    """
    if invoice.status == "PAID":
        raise ForbiddenError("Hoá đơn này đã được thanh toán")

    payment = Payment(
        invoice_id=invoice.id, user_id=user.id, amount=invoice.total_amount,
        method=method, status="PAID",
        transaction_ref=f"MOCK-{invoice.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        paid_at=datetime.utcnow(),
    )
    invoice.status = "PAID"
    invoice.paid_at = datetime.utcnow()
    db.add(payment)
    db.commit()
    return {"payment_id": payment.id, "status": "PAID", "message": "Thanh toán thành công (mô phỏng)"}


# ---------- Maintenance ----------
def get_maintenance_or_404(db: Session, mid: int) -> MaintenanceRequest:
    m = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == mid).first()
    if not m:
        raise NotFoundError("Không tìm thấy yêu cầu sửa chữa")
    return m


def create_maintenance(db: Session, user: User, data) -> MaintenanceRequest:
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise NotFoundError("Không tìm thấy phòng")
    req = MaintenanceRequest(
        room_id=data.room_id, tenant_id=user.id, landlord_id=room.landlord_id,
        title=data.title, description=data.description, priority=data.priority,
        status="PENDING",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def update_maintenance_status(db: Session, req: MaintenanceRequest, status: str) -> MaintenanceRequest:
    if status not in ("PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"):
        raise ForbiddenError("Trạng thái không hợp lệ")
    req.status = status
    if status == "RESOLVED":
        req.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return req
