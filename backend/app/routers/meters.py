"""API chỉ số điện/nước: /api/meters"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_landlord
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.meter import MeterReading
from app.models.user import User
from app.schemas.common import ok
from app.schemas.management import MeterReadingCreate
from app.services import invoice_service
from app.services.anomaly_detection_service import analyze
from app.services.ai_service import forecast_cost
from app.services.serializers import meter_to_dict

router = APIRouter(prefix="/meters", tags=["meters"])


@router.get("")
def my_meters(user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    from app.models.room import Room
    room_ids = [r[0] for r in db.query(Room.id).filter(Room.landlord_id == user.id).all()] or [-1]
    meters = db.query(MeterReading).filter(MeterReading.room_id.in_(room_ids))\
        .order_by(MeterReading.period.desc()).all()
    return ok([meter_to_dict(m) for m in meters])


@router.get("/room/{room_id}")
def room_meters(room_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    meters = db.query(MeterReading).filter(MeterReading.room_id == room_id)\
        .order_by(MeterReading.period.asc()).all()
    return ok([meter_to_dict(m) for m in meters])


@router.post("")
def create_meter(data: MeterReadingCreate, user: User = Depends(require_landlord),
                 db: Session = Depends(get_db)):
    from app.models.room import Room
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room or (room.landlord_id != user.id and not user.has_role("ADMIN")):
        raise ForbiddenError("Bạn không quản lý phòng này")
    meter = invoice_service.create_meter_reading(db, data)
    return ok(meter_to_dict(meter), "Nhập chỉ số thành công")


@router.get("/room/{room_id}/analysis")
def meter_analysis(room_id: int, user: User = Depends(require_landlord), db: Session = Depends(get_db)):
    """Phát hiện bất thường + dự báo chi phí cho 1 phòng."""
    from app.models.room import Room
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room or (room.landlord_id != user.id and not user.has_role("ADMIN")):
        raise ForbiddenError("Bạn không quản lý phòng này")

    meters = db.query(MeterReading).filter(MeterReading.room_id == room_id)\
        .order_by(MeterReading.period.asc()).all()

    electricity = [m.consumption for m in meters if m.meter_type == "ELECTRICITY"]
    water = [m.consumption for m in meters if m.meter_type == "WATER"]
    elec_amounts = [m.amount for m in meters if m.meter_type == "ELECTRICITY"]
    water_amounts = [m.amount for m in meters if m.meter_type == "WATER"]

    return ok({
        "electricity_anomaly": analyze(electricity),
        "water_anomaly": analyze(water),
        "electricity_forecast": forecast_cost(elec_amounts),
        "water_forecast": forecast_cost(water_amounts),
        "history": [meter_to_dict(m) for m in meters],
    })
