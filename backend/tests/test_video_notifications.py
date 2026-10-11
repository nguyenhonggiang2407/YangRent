"""Real ASGI routes/auth/ORM; only a fresh in-memory fictional database."""
import asyncio
import os
import secrets
import unittest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.requests import Request

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import Role, Room, RoomVideo, User
from app.routers.notifications import notification_stream


class VideoNotificationRoutes(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        roles = {name: Role(name=name) for name in ["LANDLORD", "TENANT", "ADMIN"]}
        self.session.add_all(roles.values())
        self.users = {}
        for name, role in [("owner", "LANDLORD"), ("other", "LANDLORD"), ("tenant", "TENANT"), ("admin", "ADMIN")]:
            user = User(email=f"{name}@example.test", hashed_password="unused", full_name=f"Fictional {name}", roles=[roles[role]])
            self.session.add(user)
            self.users[name] = user
        self.session.flush()
        self.room = Room(landlord_id=self.users["owner"].id, title="Fictional test room", price=1000000, district="Test district")
        self.session.add(self.room)
        self.session.commit()
        app.dependency_overrides[get_db] = lambda: self.session
        self.client = TestClient(app)
        self.payload = {"room_id": self.room.id, "video_url": "https://video.example.test/room.webm", "title": " Tour "}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.session.close()
        self.engine.dispose()

    def auth(self, name="owner"):
        return {"Authorization": "Bearer " + create_access_token(self.users[name].id)}

    def test_header_auth_and_landlord_role_required(self):
        for path in ["/api/uploads/video", "/api/uploads/room-videos"]:
            self.assertEqual(self.client.post(path, json=self.payload).status_code, 401)
            self.assertEqual(self.client.post(path, json=self.payload, headers=self.auth("tenant")).status_code, 403)

    def test_owner_preview_and_persist_json_without_request_query_parameter(self):
        preview = self.client.post("/api/uploads/video", json=self.payload, headers=self.auth())
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.json()["data"], {"url": self.payload["video_url"], "title": "Tour"})
        self.assertEqual(self.session.query(RoomVideo).count(), 0)
        saved = self.client.post("/api/uploads/room-videos", json=self.payload, headers=self.auth())
        self.assertEqual(saved.status_code, 200)
        row = self.session.query(RoomVideo).one()
        self.assertEqual((row.room_id, row.video_url, row.title), (self.room.id, self.payload["video_url"], "Tour"))
        self.assertEqual(self.client.delete(f"/api/uploads/room-videos/{row.id}", headers=self.auth()).status_code, 200)
        self.assertEqual(self.session.query(RoomVideo).count(), 0)

    def test_other_landlord_cannot_preview_add_or_delete_owned_room_video(self):
        for path in ["/api/uploads/video", "/api/uploads/room-videos"]:
            self.assertEqual(self.client.post(path, json=self.payload, headers=self.auth("other")).status_code, 403)
        row = RoomVideo(room_id=self.room.id, video_url=self.payload["video_url"])
        self.session.add(row); self.session.commit()
        self.assertEqual(self.client.delete(f"/api/uploads/room-videos/{row.id}", headers=self.auth("other")).status_code, 403)
        self.assertEqual(self.session.query(RoomVideo).count(), 1)

    def test_admin_keeps_authorized_access(self):
        self.assertEqual(self.client.post("/api/uploads/room-videos", json=self.payload, headers=self.auth("admin")).status_code, 200)

    def test_invalid_urls_types_lengths_and_room_ids_do_not_write(self):
        invalid = [{"video_url": v} for v in ["", "javascript:alert(1)", "data:video/mp4;base64,AA", "//video.example.test/x", "https://", "https://user:pass@video.example.test/x", "https://video.example.test:bad/x", "https://video.example.test/\nx", "https://video.example.test/" + "x" * 500, 42]]
        invalid += [{"title": "x" * 201}, {"room_id": 0}, {"room_id": -1}]
        for change in invalid:
            with self.subTest(field=list(change)):
                response = self.client.post("/api/uploads/room-videos", json={**self.payload, **change}, headers=self.auth())
                self.assertEqual(response.status_code, 422)
        self.assertEqual(self.session.query(RoomVideo).count(), 0)

    def test_missing_room_and_malformed_json_fail_cleanly(self):
        self.assertEqual(self.client.post("/api/uploads/room-videos", json={"video_url": self.payload["video_url"]}, headers=self.auth()).status_code, 422)
        self.assertEqual(self.client.post("/api/uploads/room-videos", json={**self.payload, "room_id": 999999}, headers=self.auth()).status_code, 404)
        self.assertEqual(self.client.post("/api/uploads/room-videos", content="{", headers={**self.auth(), "Content-Type": "application/json"}).status_code, 422)

    def test_video_preview_can_remain_unattached(self):
        response = self.client.post("/api/uploads/video", json={"video_url": self.payload["video_url"]}, headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.session.query(RoomVideo).count(), 0)

    def test_notifications_use_header_auth_and_sse_response_still_streams(self):
        # URL tokens stay rejected: fetch supplies the normal Authorization header.
        token = create_access_token(self.users["owner"].id)
        self.assertEqual(self.client.get("/api/notifications/stream", params={"token": token}).status_code, 401)
        self.assertEqual(self.client.get("/api/notifications", headers=self.auth()).status_code, 200)
        async def first_frame():
            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}
            request = Request({"type": "http", "method": "GET", "path": "/api/notifications/stream", "headers": []}, receive)
            response = notification_stream(request, self.users["owner"], self.session)
            self.assertEqual(response.media_type, "text/event-stream")
            frame = await response.body_iterator.__anext__()
            self.assertIn("keepalive", frame)
            await response.body_iterator.aclose()
        asyncio.run(first_frame())


if __name__ == "__main__":
    unittest.main()
