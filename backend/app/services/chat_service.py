"""Nghiệp vụ: chat, thông báo, báo cáo vi phạm."""
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.chat import Conversation, Message
from app.models.notification import Notification
from app.models.report import Report
from app.models.user import User


# ---------- Chat ----------
def start_or_get_conversation(db: Session, user: User, other_id: int, room_id=None) -> Conversation:
    if user.id == other_id:
        raise ForbiddenError("Không thể nhắn tin cho chính mình")
    other = db.query(User).filter(User.id == other_id).first()
    if not other:
        raise NotFoundError("Người dùng không tồn tại")

    conv = db.query(Conversation).filter(
        or_(
            (Conversation.user1_id == user.id) & (Conversation.user2_id == other_id),
            (Conversation.user1_id == other_id) & (Conversation.user2_id == user.id),
        )
    ).first()
    if not conv:
        conv = Conversation(user1_id=user.id, user2_id=other_id, room_id=room_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


def get_conversation_or_404(db: Session, conv_id: int) -> Conversation:
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise NotFoundError("Không tìm thấy cuộc trò chuyện")
    return conv


def send_message(db: Session, conv: Conversation, sender: User, content: str) -> Message:
    msg = Message(conversation_id=conv.id, sender_id=sender.id, content=content, is_read=False)
    conv.last_message_at = datetime.utcnow()
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_user_conversations(db: Session, user: User):
    return db.query(Conversation).filter(
        or_(Conversation.user1_id == user.id, Conversation.user2_id == user.id)
    ).order_by(Conversation.last_message_at.desc().nullslast()).all()


def mark_conversation_read(db: Session, conv: Conversation, user: User) -> None:
    for msg in conv.messages:
        if msg.sender_id != user.id and not msg.is_read:
            msg.is_read = True
    db.commit()


# ---------- Notifications ----------
def create_notification(db: Session, user_id: int, title: str, content: str = "",
                        ntype: str = "INFO", link: str = "") -> Notification:
    notif = Notification(user_id=user_id, title=title, content=content, type=ntype, link=link)
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_user_notifications(db: Session, user: User, limit: int = 30):
    return db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).limit(limit).all()


def mark_notifications_read(db: Session, user: User) -> None:
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False  # noqa: E712
    ).update({Notification.is_read: True})
    db.commit()


# ---------- Reports ----------
def create_report(db: Session, user: User, data) -> Report:
    if data.target_type not in ("ROOM", "USER", "ROOMMATE_POST"):
        raise ForbiddenError("Loại báo cáo không hợp lệ")
    report = Report(
        reporter_id=user.id, target_type=data.target_type, target_id=data.target_id,
        reason=data.reason, description=data.description, status="PENDING",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
