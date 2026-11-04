"""Built frontend routing and filesystem isolation, without a database/server."""
import asyncio
from pathlib import Path
import tempfile
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.static_frontend import install_frontend


def backend_app():
    app = FastAPI()

    @app.get("/")
    def root():
        return {"name": "original API root"}

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.post("/api/echo")
    def echo():
        return {"backend": True}

    return app


class StaticFrontendTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.dist = self.directory / "dist"
        self.dist.mkdir()
        self.index = "<!doctype html><html><title>YangRent frontend fixture</title></html>"
        (self.dist / "index.html").write_text(self.index, encoding="utf-8")
        (self.dist / "assets").mkdir()
        (self.dist / "assets/app.js").write_text("export const fixture = true;", encoding="utf-8")
        (self.dist / "assets/photo.webp").write_bytes(b"RIFF-fixture-WEBP")
        (self.dist / ".env").write_text("private-sentinel", encoding="utf-8")
        (self.dist / ".git").mkdir()
        (self.dist / ".git/config").write_text("private-sentinel", encoding="utf-8")
        (self.dist / "api").mkdir()
        (self.dist / "api/unknown").write_text("must-not-serve-api-file", encoding="utf-8")
        (self.dist / "apifile").write_text("must-not-serve-api-file", encoding="utf-8")
        self.private = self.directory / "dist-private"
        self.private.mkdir()
        (self.private / "secret.txt").write_text("private-sentinel", encoding="utf-8")
        (self.directory / "secret.txt").write_text("private-sentinel", encoding="utf-8")
        self.app = backend_app()
        install_frontend(self.app, self.dist)
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)

    def test_backend_is_unchanged_without_opt_in(self):
        with TestClient(backend_app()) as client:
            self.assertEqual(client.get("/").json(), {"name": "original API root"})
            self.assertEqual(client.get("/rooms").status_code, 404)

    def test_frontend_root_and_head(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, self.index)
        self.assertTrue(response.headers["content-type"].startswith("text/html"))
        self.assertEqual(response.headers["cache-control"], "no-cache")
        self.assertEqual(self.client.head("/").status_code, 200)
        self.assertEqual(self.client.head("/").content, b"")

    def test_all_known_client_routes_reload(self):
        routes = (
            "/photo-credits", "/rooms", "/rooms/123", "/roommates", "/roommates/new",
            "/roommates/42", "/ai-recommend", "/login", "/register", "/favorites",
            "/chat", "/profile", "/post-room", "/dashboard/admin", "/dashboard/landlord",
            "/rooms?city=H%C3%A0+N%E1%BB%99i&q=%2e%2e",
        )
        for path in routes:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.text, self.index)

    def test_api_and_documentation_keep_precedence(self):
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        self.assertEqual(self.client.post("/api/echo").json(), {"backend": True})
        self.assertEqual(self.client.post("/api/health").status_code, 405)
        wrong_method = self.client.get("/api/echo")
        self.assertEqual(wrong_method.status_code, 405)
        self.assertEqual(wrong_method.headers["allow"], "POST")
        for path in ("/docs", "/redoc"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertNotEqual(response.text, self.index)
        schema = self.client.get("/openapi.json").json()
        self.assertIn("/api/health", schema["paths"])
        self.assertNotIn("/{path}", schema["paths"])
        self.assertNotIn("/", schema["paths"])

    def test_existing_backend_slash_redirect_still_works(self):
        response = self.client.get("/api/health/", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers["location"], "http://testserver/api/health")

    def test_existing_assets_and_head(self):
        response = self.client.get("/assets/app.js")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "export const fixture = true;")
        self.assertIn("javascript", response.headers["content-type"])
        self.assertEqual(self.client.head("/assets/app.js").content, b"")
        photo = self.client.get("/assets/photo.webp")
        self.assertEqual(photo.status_code, 200)
        self.assertEqual(photo.headers["content-type"], "image/webp")
        self.assertEqual(photo.content, b"RIFF-fixture-WEBP")

    def test_unknown_api_paths_assets_and_routes_are_not_spa_html(self):
        for path in (
            "/api", "/api/unknown", "/apifile", "/api/assets/app.js", "/assets/missing.js",
            "/images/missing.webp", "/favicon.ico", "/unknown", "/rooms/1/missing", "/dashboard",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers={"Accept": "text/html"})
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("YangRent frontend fixture", response.text)
        for method in ("HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT"):
            with self.subTest(method=method):
                self.assertEqual(self.client.request(method, "/api/unknown").status_code, 404)
        self.assertEqual(self.client.post("/assets/app.js").status_code, 405)
        self.assertEqual(self.client.post("/").status_code, 405)

    def test_hidden_files_are_not_exposed(self):
        for path in ("/.env", "/.git/config", "/assets/.env", "/rooms/.env"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("private-sentinel", response.text)

    def raw_get(self, path, raw_path):
        async def request():
            messages = []

            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}

            async def send(message):
                messages.append(message)

            await self.app({
                "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
                "method": "GET", "scheme": "http", "path": path, "raw_path": raw_path,
                "root_path": "", "query_string": b"", "headers": [],
                "client": ("127.0.0.1", 1234), "server": ("testserver", 80),
            }, receive, send)
            status = next(message["status"] for message in messages if message["type"] == "http.response.start")
            body = b"".join(message.get("body", b"") for message in messages if message["type"] == "http.response.body")
            return status, body

        return asyncio.run(request())

    def test_traversal_and_escaped_paths_are_denied_without_client_normalization(self):
        paths = (
            ("/../secret.txt", b"/../secret.txt"),
            ("/assets/../../secret.txt", b"/assets/../../secret.txt"),
            ("/assets/../index.html", b"/assets/../index.html"),
            ("/../secret.txt", b"/%2e%2e/secret.txt"),
            ("/%2e%2e/secret.txt", b"/%252e%252e/secret.txt"),
            ("/assets/app.js", b"/assets%2fapp.js"),
            ("/rooms/1", b"/rooms/%31"),
            ("/assets\\..\\secret.txt", b"/assets%5c..%5csecret.txt"),
            ("/assets/app.js::$DATA", b"/assets/app.js::$DATA"),
            ("/assets/\x00file", b"/assets/%00file"),
        )
        for path, raw in paths:
            with self.subTest(raw_path=raw):
                status, body = self.raw_get(path, raw)
                self.assertEqual(status, 404)
                self.assertNotIn(b"private-sentinel", body)
                self.assertNotIn(b"YangRent frontend fixture", body)

    def make_symlink(self, link, target, directory=False):
        try:
            link.symlink_to(target, target_is_directory=directory)
        except (OSError, NotImplementedError):
            self.skipTest("This environment cannot create symlinks")

    def test_file_symlink_cannot_escape_dist(self):
        self.make_symlink(self.dist / "assets/leak.txt", self.private / "secret.txt")
        response = self.client.get("/assets/leak.txt")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("private-sentinel", response.text)

    def test_directory_symlink_cannot_escape_to_similarly_named_sibling(self):
        self.make_symlink(self.dist / "leak", self.private, directory=True)
        response = self.client.get("/leak/secret.txt")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("private-sentinel", response.text)

    def test_symlinks_cannot_expose_hidden_targets_inside_dist(self):
        self.make_symlink(self.dist / "assets/public.txt", self.dist / ".env")
        self.make_symlink(self.dist / "public", self.dist / ".git", directory=True)
        for path in ("/assets/public.txt", "/public/config"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("private-sentinel", response.text)

    def test_symlinked_index_cannot_escape_dist(self):
        other_dist = self.directory / "other-dist"
        other_dist.mkdir()
        self.make_symlink(other_dist / "index.html", self.private / "secret.txt")
        with self.assertRaises(ValueError):
            install_frontend(backend_app(), other_dist)

    def test_missing_dist_or_index_fails_before_replacing_api_root(self):
        for directory in (self.directory / "missing", self.private, self.private / "secret.txt"):
            with self.subTest(directory=directory.name):
                app = backend_app()
                with self.assertRaises(ValueError):
                    install_frontend(app, directory)
                with TestClient(app) as client:
                    self.assertEqual(client.get("/").json(), {"name": "original API root"})


if __name__ == "__main__":
    unittest.main()
