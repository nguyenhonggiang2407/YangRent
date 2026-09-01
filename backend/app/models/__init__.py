"""Import tất cả models để SQLAlchemy metadata biết đủ bảng."""
from app.models.user import Role, User, user_roles
from app.models.room import Amenity, Favorite, Room, RoomImage, room_amenities
from app.models.room_video import RoomVideo
from app.models.roommate import RoommatePost
from app.models.contract import Contract
from app.models.invoice import Invoice, InvoiceItem, Payment
from app.models.meter import MeterReading
from app.models.maintenance import MaintenanceRequest
from app.models.report import Report
from app.models.chat import Conversation, Message
from app.models.notification import Notification
from app.models.rental import RentalRequest
from app.models.audit import AuditLog

__all__ = [
    "Role", "User", "user_roles",
    "Amenity", "Favorite", "Room", "RoomImage", "room_amenities",
    "RoomVideo", "RoommatePost", "Contract", "Invoice", "InvoiceItem", "Payment", "MeterReading",
    "MaintenanceRequest", "Report", "Conversation", "Message", "Notification",
    "RentalRequest", "AuditLog",
]
