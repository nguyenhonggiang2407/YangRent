"""Exercise competing booking requests against two independent SQLite connections."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import os
from pathlib import Path
import secrets
from tempfile import TemporaryDirectory
from threading import Event
import unittest

os.environ.setdefault("SECRET_KEY", secrets.token_urlsafe(48))
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.exceptions import register_exception_handlers
from app.core.security import create_access_token
from app.database import Base, get_db
from app.models import Notification, RentalRequest, Role, Room, User
from app.routers.rooms import router


class BookingConcurrencyTest(unittest.TestCase):
    def test_two_seekers_cannot_create_two_pending_bookings(self):
        with TemporaryDirectory() as directory:
            engine = create_engine(
                URL.create("sqlite", database=str(Path(directory) / "booking.db")),
                connect_args={"check_same_thread": False},
                poolclass=NullPool,
            )
            try:
                self.check_booking_race(engine)
            finally:
                engine.dispose()

    def check_booking_race(self, engine):
        Base.metadata.create_all(engine)
        make_session = sessionmaker(bind=engine, autoflush=False)
        original_timestamp = datetime(2024, 1, 1)
        with make_session.begin() as db:
            landlord_role, seeker_role = Role(name="LANDLORD"), Role(name="USER")
            landlord = User(email="owner@example.test", full_name="Owner", hashed_password="unused",
                            roles=[landlord_role])
            seekers = [
                User(email=f"seeker{i}@example.test", full_name=f"Seeker {i}", hashed_password="unused",
                     roles=[seeker_role])
                for i in (1, 2)
            ]
            db.add_all([landlord, *seekers])
            db.flush()
            room = Room(landlord_id=landlord.id, title="Test room", price=1000000, district="Test district",
                        updated_at=original_timestamp)
            db.add(room)
            db.flush()
            room_id, landlord_id = room.id, landlord.id
            seeker_ids = [seeker.id for seeker in seekers]
            db.add(RentalRequest(room_id=room_id, seeker_id=seeker_ids[0], landlord_id=landlord_id,
                                 status="REJECTED"))

        app = FastAPI()
        register_exception_handlers(app)
        app.include_router(router, prefix="/api")

        def test_db():
            with make_session() as db:
                yield db

        app.dependency_overrides[get_db] = test_db

        first_at_insert, second_at_write, release_first = Event(), Event(), Event()
        first_connection = None

        def coordinate_writes(conn, cursor, statement, parameters, context, executemany):
            nonlocal first_connection
            insert_booking = statement.startswith("INSERT INTO rental_requests")
            if insert_booking and first_connection is None:
                first_connection = conn
                first_at_insert.set()
                if not release_first.wait(10):
                    raise AssertionError("Timed out waiting for the competing request")
            elif first_connection is not None and conn is not first_connection:
                if insert_booking or statement.startswith("UPDATE rooms "):
                    second_at_write.set()

        def post_booking(seeker_id):
            with TestClient(app) as client:
                return client.post(
                    f"/api/rooms/{room_id}/book",
                    json={"message": "Test hold"},
                    headers={"Authorization": f"Bearer {create_access_token(seeker_id)}"},
                )

        event.listen(engine, "before_cursor_execute", coordinate_writes)
        try:
            with ThreadPoolExecutor(max_workers=2) as executor:
                first = executor.submit(post_booking, seeker_ids[0])
                try:
                    self.assertTrue(first_at_insert.wait(10), "First request did not reach INSERT")
                    second = executor.submit(post_booking, seeker_ids[1])
                    self.assertTrue(second_at_write.wait(10), "Second request did not reach a booking write")
                finally:
                    release_first.set()
                responses = [first.result(timeout=10), second.result(timeout=10)]
        finally:
            event.remove(engine, "before_cursor_execute", coordinate_writes)

        self.assertEqual(sorted(response.status_code for response in responses), [200, 409])
        conflict = next(response for response in responses if response.status_code == 409)
        self.assertEqual(conflict.json()["code"], "CONFLICT")
        with make_session() as db:
            pending = db.query(RentalRequest).filter_by(room_id=room_id, status="PENDING").one()
            self.assertIn(pending.seeker_id, seeker_ids)
            self.assertEqual(db.query(RentalRequest).filter_by(room_id=room_id, status="REJECTED").count(), 1)
            self.assertEqual(db.query(Notification).filter_by(user_id=landlord_id, type="BOOKING").count(), 1)
            room = db.get(Room, room_id)
            self.assertEqual((room.status, room.updated_at), ("AVAILABLE", original_timestamp))
