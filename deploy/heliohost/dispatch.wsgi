"""YangRent FastAPI -> WSGI entry point for compatible shared hosts.

Requires `a2wsgi` plus all backend dependencies to already be available in the
Python environment used by mod_wsgi. On HelioHost, installed modules vary by
server/Python version; check the server module list before using this path.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from a2wsgi import ASGIMiddleware  # noqa: E402
from app.main import app  # noqa: E402

application = ASGIMiddleware(app)
