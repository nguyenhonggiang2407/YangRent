"""Opt-in serving of the built React frontend from the API's origin."""
from pathlib import Path
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.routing import APIRoute
from starlette.datastructures import URL
from starlette.routing import Match


_CLIENT_ROUTES = re.compile(
    r"(?:|photo-credits|rooms(?:/[^/.]+)?|roommates(?:/[^/.]+)?|"
    r"ai-recommend|login|register|favorites|chat|profile|post-room|dashboard/[^/.]+)"
)
_MEDIA_TYPES = {
    ".html": "text/html", ".webp": "image/webp", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
    ".gif": "image/gif", ".avif": "image/avif", ".ico": "image/vnd.microsoft.icon",
    ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff",
}


def _file_inside(directory: Path, path: str) -> Path | None:
    """Resolve symlinks/junctions before checking the filesystem boundary."""
    try:
        candidate = (directory / path).resolve()
        relative = candidate.relative_to(directory)
        if any(part.startswith(".") for part in relative.parts):
            raise ValueError
        return candidate if candidate.is_file() else None
    except (OSError, RuntimeError, ValueError):
        raise HTTPException(status_code=404) from None


def install_frontend(app: FastAPI, directory: str | Path) -> None:
    """Install after the backend routes, only when FRONTEND_DIST_DIR is set.

    The existing JSON root named ``root`` is replaced only for GET. All other
    backend routes retain precedence; frontend endpoints are omitted from OpenAPI.
    """
    try:
        root = Path(directory).resolve(strict=True)
        index = _file_inside(root, "index.html")
        if not root.is_dir() or index is None:
            raise ValueError
    except (OSError, RuntimeError, ValueError, HTTPException):
        raise ValueError("FRONTEND_DIST_DIR must contain index.html inside its directory") from None

    app.router.routes[:] = [
        route for route in app.router.routes
        if not (
            isinstance(route, APIRoute)
            and route.path == "/"
            and route.name == "root"
            and route.methods == {"GET"}
        )
    ]
    backend_routes = tuple(app.router.routes)

    def frontend(request: Request, path: str = ""):
        # ASGI has already decoded the URL. Reject escapes as well as any decoded
        # traversal, Windows separators/streams, NULs, or accidental dotfiles.
        raw_path = request.scope.get("raw_path", b"")
        if (
            b"%" in raw_path
            or any(character in path for character in ("%", "\\", ":", "\x00"))
            or any(part.startswith(".") for part in path.split("/"))
        ):
            raise HTTPException(status_code=404)

        # A GET/HEAD catch-all must not hide a backend route's 405 response.
        for route in backend_routes:
            if route.matches(request.scope)[0] == Match.PARTIAL:
                allowed = getattr(route, "methods", None)
                if allowed:
                    raise HTTPException(status_code=405, headers={"Allow": ", ".join(sorted(allowed))})

        # A catch-all normally hides Starlette's automatic slash redirects.
        # Retain that behavior for already registered backend routes.
        if app.router.redirect_slashes and request.scope["path"] != "/":
            redirect_scope = dict(request.scope)
            original = redirect_scope["path"]
            redirect_scope["path"] = original.rstrip("/") if original.endswith("/") else original + "/"
            if any(route.matches(redirect_scope)[0] != Match.NONE for route in backend_routes):
                return RedirectResponse(URL(scope=redirect_scope), status_code=307)

        # Never serve API-looking files from dist, even if accidentally bundled.
        if path.startswith("api"):
            raise HTTPException(status_code=404)

        file = _file_inside(root, path)
        client_route = _CLIENT_ROUTES.fullmatch(path.rstrip("/"))
        if (file is not None or client_route) and request.method not in {"GET", "HEAD"}:
            raise HTTPException(status_code=405, headers={"Allow": "GET, HEAD"})
        if file is not None:
            if file == index:
                return FileResponse(index, media_type="text/html", headers={"Cache-Control": "no-cache"})
            return FileResponse(file, media_type=_MEDIA_TYPES.get(file.suffix.lower()))
        if client_route:
            return FileResponse(index, media_type="text/html", headers={"Cache-Control": "no-cache"})
        raise HTTPException(status_code=404)

    # Dispatch standard HTTP methods so missing API endpoints retain 404 instead
    # of the catch-all turning unknown POST/PUT/etc. requests into a 405.
    methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT"]
    app.add_api_route("/", frontend, methods=methods, include_in_schema=False, name="frontend_root")
    app.add_api_route("/{path:path}", frontend, methods=methods, include_in_schema=False, name="frontend")
