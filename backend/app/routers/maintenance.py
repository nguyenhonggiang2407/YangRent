"""API yêu cầu sửa chữa: /api/maintenance"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_landlord
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.models.user import User
from app.schemas.common import ok
from app.schemas.management import MaintenanceCreateRequest, MaintenanceStatusUpdate
from app.services import invoice_service
from app.services.serializers import maintenance_to_dict

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("")
def my_maintenance(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    requests = db.query(MaintenanceRequest).filter(
        (MaintenanceRequest.tenant_id == user.id) | (MaintenanceRequest.landlord_id == user.id)
    ).order_by(MaintenanceRequest.created_at.desc()).all()
    return ok([maintenance_to_dict(r) for r in requests])


@router.post("")
def create_request(data: MaintenanceCreateRequest, user: User = Depends(require_auth),
                   db: Session = Depends(get_db)):
    req = invoice_service.create_maintenance(db, user, data)
    return ok(maintenance_to_dict(req), "Đã gửi yêu cầu sửa chữa")


@router.put("/{req_id}/status")
def update_status(req_id: int, data: MaintenanceStatusUpdate,
                  user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    req = invoice_service.get_maintenance_or_404(db, req_id)
    if req.landlord_id != user.id and not user.has_role("ADMIN"):
        raise ForbiddenError("Chỉ chủ nhà hoặc admin được cập nhật trạng thái")
    req = invoice_service.update_maintenance_status(db, req, data.status)
    return ok(maintenance_to_dict(req), "Cập nhật trạng thái thành công")
