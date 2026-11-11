# Isolated public portfolio demo

`Dockerfile.demo` builds the React application and serves it with the current FastAPI API at the same origin. It is a separate demo deployment; the existing YangRent services and their databases are not changed.

The demo entrypoint requires `PORTFOLIO_DEMO=true`, rejects a preconfigured `DATABASE_URL`, and creates a new temporary SQLite database at each process start. Fictional rooms use the project's bundled housing photos. The seeded landlord has an unknown random password that is never printed or published. Visitors can register their own temporary accounts to try the normal user, tenant or landlord flows; administrative access is not public.

Signing keys are generated inside the process and are not committed to source. No external database, storage service or AI provider is configured. Uploaded images requiring the optional external storage provider are unavailable in this demo. The sample data and visitor changes are ephemeral; do not enter personal or important information.

Only `Dockerfile.demo` opts into this behavior. The existing API-only configuration in `render.yaml`, local seed tool and production migrations remain separate. Static frontend serving is optional through `FRONTEND_DIST_DIR`; existing API routes and missing-asset/API 404s are preserved.

Deploy the repository root with runtime `docker`, Dockerfile `./Dockerfile.demo`, one instance on plan `free`, and no disk or database resource. Do not attach an environment group or copy credentials from another service. Render injects `PORT`; the demo binds to `0.0.0.0` using one worker.

Public demo: **https://yangrent-portfolio-demo.onrender.com/**. Deployment and actual HTTPS functionality were verified on 4 November 2026 before adding the link to README and portfolio metadata. See [hosting verification](hosting-status.md).

## Optional shared login for a local walkthrough

From a fresh process in `backend`, set `PORTFOLIO_DEMO=true` and
`DEMO_LOGIN_ENABLED=1`. Supply `DEMO_LOGIN_EMAIL` and
`DEMO_LOGIN_PASSWORD` through your local environment or secret manager. Leave
`DATABASE_URL` unset in both the environment and `.env`. Run
`python -m app.portfolio_demo` and open `http://127.0.0.1:10000`, or use the port
set in `PORT`. Build the frontend and point `FRONTEND_DIST_DIR` at its output to
use the full interface at that address.

The launcher binds to loopback in this mode. It creates one `USER` with a
bcrypt password hash and one fictional favorite. Visitors can browse and use
the regular renter flows. The shared account's profile and password edits are
disabled, and the local login endpoint allows 12 submissions per minute. The
launcher creates a fresh disposable database on each run. Restart it to reset
all sample data. Keep this option disabled on public hosting.
