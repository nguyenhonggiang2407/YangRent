"""API chat: /api/chat (conversation + message)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.chat import Conversation
from app.models.user import User
from app.schemas.chat import ConversationStartRequest, MessageSendRequest
from app.schemas.common import ok
from app.services import chat_service
from app.services.serializers import conversation_to_dict, message_to_dict

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations")
def my_conversations(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    convs = chat_service.get_user_conversations(db, user)
    return ok([conversation_to_dict(c, user.id) for c in convs])


@router.post("/conversations")
def start_conversation(data: ConversationStartRequest, user: User = Depends(require_auth),
                       db: Session = Depends(get_db)):
    conv = chat_service.start_or_get_conversation(db, user, data.user_id, data.room_id)
    if data.initial_message:
        chat_service.send_message(db, conv, user, data.initial_message)
    db.refresh(conv)
    return ok(conversation_to_dict(conv, user.id), "Bắt đầu trò chuyện")


@router.get("/conversations/{conv_id}")
def get_conversation(conv_id: int, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    conv = chat_service.get_conversation_or_404(db, conv_id)
    if conv.user1_id != user.id and conv.user2_id != user.id:
        raise ForbiddenError("Bạn không thuộc cuộc trò chuyện này")
    chat_service.mark_conversation_read(db, conv, user)
    db.refresh(conv)
    return ok(conversation_to_dict(conv, user.id))


@router.post("/conversations/{conv_id}/messages")
def send_message(conv_id: int, data: MessageSendRequest, user: User = Depends(require_auth),
                 db: Session = Depends(get_db)):
    conv = chat_service.get_conversation_or_404(db, conv_id)
    if conv.user1_id != user.id and conv.user2_id != user.id:
        raise ForbiddenError("Bạn không thuộc cuộc trò chuyện này")
    msg = chat_service.send_message(db, conv, user, data.content)
    # Tao notification cho nguoi nhan
    other_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    chat_service.create_notification(db, other_id, "Tin nhan moi",
        f"{user.full_name}: {data.content[:80]}...", "CHAT")
    return ok(message_to_dict(msg), "Đã gửi tin nhắn")
