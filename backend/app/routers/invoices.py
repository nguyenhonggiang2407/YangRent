"""API hoá đơn + thanh toán: /api/invoices, /api/payments"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_landlord
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.common import ok
from app.schemas.management import InvoiceCreateRequest, PaymentCreateRequest
from app.services import invoice_service
from app.services.serializers import invoice_to_dict

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _check_invoice_access(inv: Invoice, user: User):
    if not (user.has_role("ADMIN") or inv.landlord_id == user.id or inv.tenant_id == user.id):
        raise ForbiddenError("Bạn không có quyền truy cập hoá đơn này")


@router.get("")
def my_invoices(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(
        (Invoice.landlord_id == user.id) | (Invoice.tenant_id == user.id)
    ).order_by(Invoice.period.desc()).all()
    return ok([invoice_to_dict(inv) for inv in invoices])


@router.post("")
def create_invoice(data: InvoiceCreateRequest, user: User = Depends(require_landlord),
                   db: Session = Depends(get_db)):
    """Ownership check: chỉ chủ nhà của phòng mới được tạo hoá đơn cho phòng đó."""
    from app.models.room import Room
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise ForbiddenError("Không tìm thấy phòng")
    if room.landlord_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Bạn không sở hữu phòng này")
    invoice = invoice_service.create_invoice(db, data)
    return ok(invoice_to_dict(invoice), "Tạo hoá đơn thành công")


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    inv = invoice_service.get_invoice_or_404(db, invoice_id)
    _check_invoice_access(inv, user)
    return ok(invoice_to_dict(inv))


@router.post("/{invoice_id}/pay")
def pay_invoice(invoice_id: int, data: PaymentCreateRequest,
                user: User = Depends(require_auth), db: Session = Depends(get_db)):
    inv = invoice_service.get_invoice_or_404(db, invoice_id)
    if inv.tenant_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Chỉ người thuê được thanh toán hoá đơn này")
    result = invoice_service.pay_invoice(db, inv, user, data.method)
    return ok(result, result["message"])


# ---------- Payments ----------
payments_router = APIRouter(prefix="/payments", tags=["payments"])


@payments_router.get("")
def my_payments(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    from app.models.invoice import Payment
    payments = db.query(Payment).filter(Payment.user_id == user.id)\
        .order_by(Payment.created_at.desc()).all()
    return ok([{
        "id": p.id, "invoice_id": p.invoice_id, "amount": p.amount, "method": p.method,
        "status": p.status, "transaction_ref": p.transaction_ref,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "period": p.invoice.period if p.invoice else None,
    } for p in payments])
