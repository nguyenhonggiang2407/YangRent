"""Chuyển ORM model -> dict JSON cho frontend."""
from datetime import datetime

from app.models.room import Room


def user_public(u) -> dict:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "avatar_url": u.avatar_url,
        "phone": u.phone,
        "gender": u.gender,
        "is_verified": u.is_verified,
        "roles": u.role_names(),
    }


def room_to_dict(room: Room) -> dict:
    """Room + images + amenities -> dict đầy đủ cho card / detail."""
    return {
        "id": room.id,
        "landlord_id": room.landlord_id,
        "title": room.title,
        "description": room.description,
        "price": room.price,
        "area": room.area,
        "address": room.address,
        "city": room.city,
        "district": room.district,
        "ward": room.ward,
        "latitude": room.latitude,
        "longitude": room.longitude,
        "room_type": room.room_type,
        "bathroom_type": room.bathroom_type,
        "furnished": room.furnished,
        "max_occupants": room.max_occupants,
        "electricity_price": room.electricity_price,
        "water_price": room.water_price,
        "internet_price": room.internet_price,
        "status": room.status,
        "is_featured": room.is_featured,
        "is_verified": room.is_verified,
        "moderation_status": room.moderation_status,
        "view_count": room.view_count,
        "view_3d_url": room.view_3d_url,
        "view_360_enabled": room.view_360_enabled,
        "video_url": room.video_url,
        "videos": [
            {"id": v.id, "video_url": v.video_url, "title": v.title, "sort_order": v.sort_order}
            for v in room.videos
        ] if hasattr(room, 'videos') and room.videos else [],
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "images": [
            {"id": img.id, "image_url": img.image_url, "is_primary": img.is_primary, "sort_order": img.sort_order}
            for img in room.images
        ],
        "amenities": [a.name for a in room.amenities],
        "landlord": user_public(room.landlord) if room.landlord else None,
    }


def roommate_post_to_dict(post) -> dict:
    return {
        "id": post.id,
        "user_id": post.user_id,
        "post_type": post.post_type,
        "title": post.title,
        "description": post.description,
        "city": post.city,
        "district": post.district,
        "budget_min": post.budget_min,
        "budget_max": post.budget_max,
        "gender_pref": post.gender_pref,
        "num_people": post.num_people,
        "move_in_date": post.move_in_date,
        "school": post.school,
        "workplace": post.workplace,
        "desired_amenities": post.desired_amenities or [],
        "room_price": post.room_price,
        "current_people": post.current_people,
        "needed_people": post.needed_people,
        "cost_per_person": post.cost_per_person,
        "room_area": post.room_area,
        "room_address": post.room_address,
        "images": post.images or [],
        "status": post.status,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "user": user_public(post.user) if post.user else None,
    }


def contract_to_dict(c) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "room_id": c.room_id,
        "landlord_id": c.landlord_id,
        "tenant_id": c.tenant_id,
        "start_date": c.start_date,
        "end_date": c.end_date,
        "monthly_rent": c.monthly_rent,
        "deposit_amount": c.deposit_amount,
        "terms": c.terms,
        "status": c.status,
        "tenant_signed_at": c.tenant_signed_at.isoformat() if c.tenant_signed_at else None,
        "landlord_signed_at": c.landlord_signed_at.isoformat() if c.landlord_signed_at else None,
        "tenant_signature_name": c.tenant_signature_name,
        "landlord_signature_name": c.landlord_signature_name,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "room": room_to_dict(c.room) if c.room else None,
        "landlord": user_public(c.landlord) if c.landlord else None,
        "tenant": user_public(c.tenant) if c.tenant else None,
    }


def invoice_to_dict(inv) -> dict:
    return {
        "id": inv.id,
        "room_id": inv.room_id,
        "tenant_id": inv.tenant_id,
        "landlord_id": inv.landlord_id,
        "period": inv.period,
        "due_date": inv.due_date,
        "rent_amount": inv.rent_amount,
        "electricity_amount": inv.electricity_amount,
        "water_amount": inv.water_amount,
        "internet_amount": inv.internet_amount,
        "service_amount": inv.service_amount,
        "other_amount": inv.other_amount,
        "total_amount": inv.total_amount,
        "status": inv.status,
        "qr_content": inv.qr_content,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "room": room_to_dict(inv.room) if inv.room else None,
        "tenant": user_public(inv.tenant) if inv.tenant else None,
        "landlord": user_public(inv.landlord) if inv.landlord else None,
    }


def meter_to_dict(m) -> dict:
    return {
        "id": m.id,
        "room_id": m.room_id,
        "contract_id": m.contract_id,
        "period": m.period,
        "meter_type": m.meter_type,
        "previous_value": m.previous_value,
        "current_value": m.current_value,
        "consumption": m.consumption,
        "unit_price": m.unit_price,
        "amount": m.amount,
        "image_url": m.image_url,
        "ocr_raw": m.ocr_raw,
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def maintenance_to_dict(m) -> dict:
    return {
        "id": m.id,
        "room_id": m.room_id,
        "tenant_id": m.tenant_id,
        "landlord_id": m.landlord_id,
        "title": m.title,
        "description": m.description,
        "priority": m.priority,
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "resolved_at": m.resolved_at.isoformat() if m.resolved_at else None,
        "room": room_to_dict(m.room) if m.room else None,
        "tenant": user_public(m.tenant) if m.tenant else None,
        "landlord": user_public(m.landlord) if m.landlord else None,
    }


def report_to_dict(r) -> dict:
    return {
        "id": r.id,
        "reporter_id": r.reporter_id,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "reason": r.reason,
        "description": r.description,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "reporter": user_public(r.reporter) if r.reporter else None,
    }


def conversation_to_dict(c, current_user_id: int) -> dict:
    other = c.user2 if c.user1_id == current_user_id else c.user1
    unread = sum(1 for msg in c.messages if not msg.is_read and msg.sender_id != current_user_id)
    return {
        "id": c.id,
        "room_id": c.room_id,
        "other_user": user_public(other) if other else None,
        "room_title": c.room.title if c.room else None,
        "room_image": (c.room.images[0].image_url if c.room and c.room.images else ""),
        "last_message": c.messages[-1].content if c.messages else "",
        "last_message_at": c.messages[-1].created_at.isoformat() if c.messages else None,
        "unread_count": unread,
        "messages": [message_to_dict(msg) for msg in c.messages],
    }


def message_to_dict(m) -> dict:
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "sender": user_public(m.sender) if m.sender else None,
    }
