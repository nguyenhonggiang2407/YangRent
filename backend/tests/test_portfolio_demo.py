"""Fresh-process tests for the disposable public demo; no server or external DB."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


BACKEND = Path(__file__).resolve().parents[1]


class PortfolioDemo(unittest.TestCase):
    def environment(self, directory, **overrides):
        ignored = {"DATABASE_URL", "PORTFOLIO_DEMO", "FRONTEND_DIST_DIR", "SECRET_KEY", "JWT_SECRET"}
        result = {key: value for key, value in os.environ.items() if key.upper() not in ignored}
        result.update({"PYTHONPATH": str(BACKEND), "PYTHONUTF8": "1", "PYTHONDONTWRITEBYTECODE": "1",
                       "TEMP": directory, "TMP": directory, "PORTFOLIO_DEMO": "true"})
        result.update(overrides)
        return result

    def run_code(self, code, directory, **overrides):
        return subprocess.run([sys.executable, "-B", "-c", code], cwd=directory,
                              env=self.environment(directory, **overrides), capture_output=True,
                              text=True, encoding="utf-8", timeout=45)

    def test_import_does_not_initialize_application_or_database(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_code(
                "import sys; import app.portfolio_demo; "
                "assert 'app.database' not in sys.modules; assert 'app.config' not in sys.modules",
                directory, DATABASE_URL="postgresql://fixture:private-value@db.example.test/private")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_explicit_flag_is_required_before_creating_any_file(self):
        for flag in ("", "false", "1"):
            with self.subTest(flag=flag), tempfile.TemporaryDirectory() as directory:
                result = self.run_code("from app.portfolio_demo import main; main()", directory,
                                       PORTFOLIO_DEMO=flag)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(list(Path(directory).iterdir()), [])

    def test_configured_database_is_rejected_without_touching_existing_data(self):
        for database_url in ("postgresql://fixture:private-value@db.example.test/private", "sqlite:///existing.db"):
            with self.subTest(database_url=database_url), tempfile.TemporaryDirectory() as directory:
                sentinel = Path(directory) / "existing.db"
                sentinel.write_bytes(b"existing-private-data-sentinel")
                result = self.run_code("from app.portfolio_demo import main; main()", directory,
                                       DATABASE_URL=database_url)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn(database_url, result.stdout + result.stderr)
                self.assertNotIn("private-value", result.stdout + result.stderr)
                self.assertEqual(sentinel.read_bytes(), b"existing-private-data-sentinel")
                self.assertEqual([path.name for path in Path(directory).iterdir()], ["existing.db"])

    def test_dotenv_database_is_also_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            dotenv = Path(directory) / ".env"
            original = 'DATABASE_URL="postgresql://fixture:private-value@db.example.test/private"\n'
            dotenv.write_text(original, encoding="utf-8")
            result = self.run_code("from app.portfolio_demo import main; main()", directory)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("private-value", result.stdout + result.stderr)
            self.assertEqual(dotenv.read_text(encoding="utf-8"), original)
            self.assertEqual([path.name for path in Path(directory).iterdir()], [".env"])

    def test_fictional_seed_is_local_private_and_fresh_per_launch(self):
        names = []
        code = r'''
import contextlib, io, json, os, secrets
from pathlib import Path
from unittest.mock import patch
from app import portfolio_demo
tokens = []
generate = secrets.token_urlsafe
def record(size):
    value = generate(size)
    tokens.append(value)
    return value
output, errors = io.StringIO(), io.StringIO()
with patch('app.portfolio_demo.secrets.token_urlsafe', side_effect=record), contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
    application = portfolio_demo.create_demo_app()
    import bcrypt
    from app.config import get_settings
    from app.database import SessionLocal, engine
    from app.models import Role, Room, RoomImage, User
    from app.services.storage_service import storage_enabled
    from sqlalchemy.pool import NullPool
    assert isinstance(engine.pool, NullPool)
    assert os.environ['PORTFOLIO_DEMO'] == 'true'
    assert engine.url.get_backend_name() == 'sqlite'
    assert Path(engine.url.database).parent == Path(os.environ['TEMP']).resolve()
    assert get_settings().SECRET_KEY != get_settings().JWT_SECRET
    assert len(get_settings().SECRET_KEY) >= 32 and len(get_settings().JWT_SECRET) >= 32
    assert not storage_enabled() and not get_settings().OPENAI_API_KEY
    assert all(os.environ[key] == '' for key in portfolio_demo._DISABLED_SETTINGS)
    with SessionLocal() as session:
        assert {role.name for role in session.query(Role)} == {'ADMIN', 'LANDLORD', 'TENANT', 'USER'}
        users = session.query(User).all()
        assert len(users) == 1
        landlord = users[0]
        assert 'hư cấu' in landlord.full_name
        assert set(landlord.role_names()) == {'LANDLORD', 'USER'}
        assert landlord.email.endswith('@example.test')
        assert landlord.phone == '' and landlord.avatar_url == '' and not landlord.is_verified
        assert any(bcrypt.checkpw(token.encode(), landlord.hashed_password.encode()) for token in tokens)
        rooms = session.query(Room).all()
        assert len(rooms) == 6 and len({room.room_type for room in rooms}) == 6
        assert all('hư cấu' in room.title and room.latitude is None and room.longitude is None and not room.is_verified for room in rooms)
        images = session.query(RoomImage).all()
        assert len(images) == 6
        for image in images:
            assert image.image_url.startswith('/images/housing/') and image.image_url.endswith('-960.webp')
            assert (Path(portfolio_demo.__file__).resolve().parents[2] / 'frontend' / 'public' / image.image_url.lstrip('/')).is_file()
    try:
        portfolio_demo.seed_sample_data()
    except portfolio_demo.DemoSafetyError:
        pass
    else:
        raise AssertionError('Repeated seed must be refused')
assert not any(token in output.getvalue() + errors.getvalue() for token in tokens)
assert output.getvalue() == '' and errors.getvalue() == ''
print(json.dumps({'name': Path(engine.url.database).name, 'rooms': 6, 'credentialsPrinted': False}))
'''
        for flag in ("TRUE", "true"):
            with tempfile.TemporaryDirectory() as directory:
                result = self.run_code(code, directory, OPENAI_API_KEY="unused-provider-fixture",
                                       SUPABASE_URL="https://unused.example.test", SUPABASE_KEY="unused-provider-fixture",
                                       PORTFOLIO_DEMO=flag)
                self.assertEqual(result.returncode, 0, result.stderr)
                summary = json.loads(result.stdout)
                self.assertEqual(summary["rooms"], 6)
                self.assertFalse(summary["credentialsPrinted"])
                self.assertNotIn("unused-provider-fixture", result.stdout + result.stderr)
                self.assertEqual(list(Path(directory).iterdir()), [])
                names.append(summary["name"])
        self.assertNotEqual(names[0], names[1])

    def test_main_uses_one_worker_and_supplied_port_without_running_a_server(self):
        code = '''
from unittest.mock import patch
from app.portfolio_demo import main
with patch('uvicorn.run') as run:
    main()
    assert run.call_count == 1
    assert run.call_args.kwargs == {'host': '0.0.0.0', 'port': 9091, 'workers': 1}
'''
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_code(code, directory, PORT="9091")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
