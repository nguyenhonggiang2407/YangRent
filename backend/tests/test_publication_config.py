"""Changed publication behavior: actual Alembic ConfigParser and local admin ORM."""
import os
import runpy
import secrets
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)

from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.database import Base
from app.models import User
from app.core.security import verify_password
from provision_admin import create_admin

BACKEND = Path(__file__).resolve().parents[1]


class PublicationConfig(unittest.TestCase):
    def test_encoded_database_password_survives_actual_alembic_configparser(self):
        url = "postgresql://fixture:fictional%40password%25value@db.example.test:5432/fixture"
        config = Config()
        with patch.dict(os.environ, {"DATABASE_URL": url}), patch("alembic.context.config", config, create=True), \
             patch("alembic.context.is_offline_mode", return_value=True, create=True), \
             patch("alembic.context.configure", create=True) as configure, \
             patch("alembic.context.begin_transaction", create=True), \
             patch("alembic.context.run_migrations", create=True):
            get_settings.cache_clear()
            try:
                runpy.run_path(str(BACKEND / "migrations/env.py"))
                self.assertEqual(config.get_main_option("sqlalchemy.url"), url)
                self.assertEqual(configure.call_args.kwargs["url"], url)
            finally:
                get_settings.cache_clear()

    def test_private_admin_creation_never_overwrites_existing_account(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        try:
            with sessionmaker(bind=engine)() as db:
                password = secrets.token_urlsafe(24)
                user = create_admin(db, "admin@example.com", password, "Fictional administrator")
                self.assertTrue(verify_password(password, user.hashed_password))
                self.assertEqual(set(user.role_names()), {"ADMIN", "USER"})
                original = user.hashed_password
                with self.assertRaises(ValueError):
                    create_admin(db, "ADMIN@example.com", secrets.token_urlsafe(24))
                self.assertEqual(db.query(User).count(), 1)
                self.assertEqual(user.hashed_password, original)
                self.assertEqual(set(user.role_names()), {"ADMIN", "USER"})
                with self.assertRaises(ValueError):
                    create_admin(db, "other@example.com", "short")
                self.assertEqual(db.query(User).count(), 1)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
