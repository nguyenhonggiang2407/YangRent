"""API hợp đồng: /api/contracts (Landlord tạo, Tenant xem)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from datetime import datetime

from app.core.deps import require_auth, require_landlord
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.database import get_db
from app.models.contract import Contract
from app.models.user import User
from app.schemas.common import ok
from app.schemas.management import ContractCreateRequest, ContractSignRequest, ContractStatusUpdate
from app.services import invoice_service
from app.services.chat_service import create_notification
from app.services.serializers import contract_to_dict

router = APIRouter(prefix="/contracts", tags=["contracts"])


def _check_contract_access(contract: Contract, user: User):
    """Chỉ landlord (chủ hợp đồng), tenant (bên thuê) hoặc admin được xem/sửa."""
    if not (user.has_role("ADMIN") or contract.landlord_id == user.id or contract.tenant_id == user.id):
        raise ForbiddenError("Bạn không có quyền truy cập hợp đồng này")


@router.get("")
def my_contracts(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    contracts = db.query(Contract).filter(
        (Contract.landlord_id == user.id) | (Contract.tenant_id == user.id)
    ).order_by(Contract.created_at.desc()).all()
    return ok([contract_to_dict(c) for c in contracts])


@router.post("")
def create_contract(data: ContractCreateRequest, user: User = Depends(require_landlord),
                    db: Session = Depends(get_db)):
    """Ownership check: chỉ chủ nhà của phòng mới được tạo hợp đồng cho phòng đó."""
    from app.models.room import Room
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise ForbiddenError("Không tìm thấy phòng")
    if room.landlord_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Bạn không sở hữu phòng này")
    contract = invoice_service.create_contract(db, data)
    return ok(contract_to_dict(contract), "Tạo hợp đồng thành công")


@router.get("/{contract_id}")
def get_contract(contract_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    contract = invoice_service.get_contract_or_404(db, contract_id)
    _check_contract_access(contract, user)
    return ok(contract_to_dict(contract))


@router.put("/{contract_id}/status")
def update_status(contract_id: int, data: ContractStatusUpdate,
                  user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    contract = invoice_service.get_contract_or_404(db, contract_id)
    if contract.landlord_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Chỉ chủ nhà hoặc admin được cập nhật hợp đồng")
    contract = invoice_service.update_contract_status(db, contract, data.status)
    return ok(contract_to_dict(contract), "Cập nhật hợp đồng thành công")


# ---------- Contract Signing ----------
@router.post("/{contract_id}/send")
def send_contract(contract_id: int, user: User = Depends(require_landlord),
                  db: Session = Depends(get_db)):
    """Landlord gui hop dong cho tenant xem."""
    contract = invoice_service.get_contract_or_404(db, contract_id)
    if contract.landlord_id != user.id:
        raise ForbiddenError("Chi chu nha duoc gui hop dong")
    if contract.status != "DRAFT":
        raise ConflictError("Chi gui hop dong o trang thai DRAFT")
    contract.status = "PENDING_TENANT"
    db.commit()
    create_notification(db, contract.tenant_id, "Hop dong moi",
        f"Chu nha da gui hop dong cho ban xem. Vui long xac nhan.", "CONTRACT")
    return ok(contract_to_dict(contract), "Da gui hop dong")


@router.post("/{contract_id}/sign")
def sign_contract(contract_id: int, data: ContractSignRequest,
                  user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Tenant hoac Landlord ky hop dong."""
    contract = invoice_service.get_contract_or_404(db, contract_id)
    _check_contract_access(contract, user)
    now = datetime.utcnow()
    if user.id == contract.tenant_id:
        if contract.status not in ("PENDING_TENANT", "DRAFT"):
            raise ConflictError("Khong the ky hop dong o trang thai hien tai")
        contract.tenant_signed_at = now
        contract.tenant_signature_name = data.signature_name
        contract.status = "PENDING_LANDLORD"
    elif user.id == contract.landlord_id:
        if contract.status not in ("PENDING_LANDLORD", "DRAFT"):
            raise ConflictError("Khong the ky hop dong o trang thai hien tai")
        contract.landlord_signed_at = now
        contract.landlord_signature_name = data.signature_name
        if contract.tenant_signed_at:
            contract.status = "SIGNED"
            # Cap nhat phong -> RENTED
            from app.models.room import Room
            room = db.query(Room).filter(Room.id == contract.room_id).first()
            if room:
                room.status = "RENTED"
            create_notification(db, contract.tenant_id, "Hop dong da hoan tat",
                "Hai ben da ky xac nhan hop dong. Hop dong hieu luc.", "CONTRACT")
        else:
            contract.status = "PENDING_TENANT"
    else:
        raise ForbiddenError("Ban khong thuoc hop dong nay")
    db.commit()
    return ok(contract_to_dict(contract), "Da ky xac nhan hop dong")


@router.post("/{contract_id}/reject-contract")
def reject_contract(contract_id: int, user: User = Depends(require_auth),
                    db: Session = Depends(get_db)):
    """Tu choi hop dong."""
    contract = invoice_service.get_contract_or_404(db, contract_id)
    _check_contract_access(contract, user)
    if contract.status in ("SIGNED", "ACTIVE", "COMPLETED"):
        raise ConflictError("Khong the tu choi hop dong da hieu luc")
    contract.status = "REJECTED"
    db.commit()
    return ok(contract_to_dict(contract), "Da tu choi hop dong")
