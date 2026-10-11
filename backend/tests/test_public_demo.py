"""Publication guards using fresh temporary local files; no server/network."""
import os
import secrets
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

import bcrypt

BACKEND = Path(__file__).resolve().parents[1]
SEED = BACKEND / "seed/seed.py"


class PublicDemoSafety(unittest.TestCase):
    def env(self):
        return {**os.environ, "SECRET_KEY": secrets.token_urlsafe(48),
                "JWT_SECRET": secrets.token_urlsafe(48),
                "DATABASE_URL": "postgresql://unused:unused@database.example.test/unused",
                "PYTHONDONTWRITEBYTECODE": "1", "PYTHONUTF8": "1"}

    def run_seed(self, directory, *args):
        return subprocess.run([sys.executable, "-B", str(SEED), *args], cwd=directory,
                              env=self.env(), capture_output=True, text=True, encoding="utf-8", timeout=30)

    def test_no_implicit_seed_reset_or_existing_database_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            for args in ((), ("--reset",)):
                result = self.run_seed(directory, *args)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(list(Path(directory).iterdir()), [])
            database = Path(directory) / "yangrent-demo.db"
            original = b"private-existing-data-sentinel"
            database.write_bytes(original)
            result = self.run_seed(directory, "--local-demo")
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(database.read_bytes(), original)

    def test_fictional_demo_uses_only_new_local_database_and_random_passwords(self):
        passwords = []
        for _ in range(2):
            with tempfile.TemporaryDirectory() as directory:
                result = self.run_seed(directory, "--local-demo")
                self.assertEqual(result.returncode, 0, "Fictional local seed did not complete")
                self.assertEqual([p.name for p in Path(directory).iterdir()], ["yangrent-demo.db"])
                credentials = dict(line.split("\t") for line in result.stdout.splitlines() if "\t" in line)
                self.assertEqual(set(credentials), {"admin@example.test", "landlord@example.test", "tenant@example.test"})
                with closing(sqlite3.connect(Path(directory) / "yangrent-demo.db")) as db:
                    users = db.execute("SELECT email, hashed_password, phone, avatar_url, is_verified FROM users").fetchall()
                    self.assertEqual(len(users), 3)
                    for email, hashed, phone, avatar, verified in users:
                        self.assertTrue(bcrypt.checkpw(credentials[email].encode(), hashed.encode()))
                        self.assertGreaterEqual(len(credentials[email]), 24)
                        self.assertEqual((phone, avatar, verified), ("", "", 0))
                    rooms = db.execute("SELECT title, latitude, longitude, is_verified FROM rooms").fetchall()
                    self.assertEqual(len(rooms), 3)
                    self.assertTrue(all("hư cấu" in row[0] and row[1:] == (None, None, 0) for row in rooms))
                    self.assertEqual(db.execute("SELECT image_url FROM room_images").fetchall(), [("/images/yangrent-placeholder.svg",)] * 3)
                passwords.append(credentials)
        self.assertTrue(all(passwords[0][email] != passwords[1][email] for email in passwords[0]))

    def test_missing_or_short_signing_secrets_fail_before_app_start(self):
        code = "from app.config import Settings; Settings(_env_file=None)"
        for value in (None, "short"):
            environment = self.env()
            for name in ("SECRET_KEY", "JWT_SECRET"):
                if value is None:
                    environment.pop(name, None)
                else:
                    environment[name] = value
            result = subprocess.run([sys.executable, "-B", "-c", code], cwd=BACKEND,
                                    env=environment, capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
        result = subprocess.run([sys.executable, "-B", "-c", code], cwd=BACKEND,
                                env=self.env(), capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
