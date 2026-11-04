# Isolated public portfolio demo

`Dockerfile.demo` builds the React application and serves it with the current FastAPI API at the same origin. It is a separate demo deployment; the existing YangRent services and their databases are not changed.

The demo entrypoint requires `PORTFOLIO_DEMO=true`, rejects a preconfigured `DATABASE_URL`, and creates a new temporary SQLite database at each process start. Fictional rooms use the project's bundled housing photos. The seeded landlord has an unknown random password that is never printed or published. Visitors can register their own temporary accounts to try the normal user, tenant or landlord flows; administrative access is not public.

Signing keys are generated inside the process and are not committed to source. No external database, storage service or AI provider is configured. Uploaded images requiring the optional external storage provider are unavailable in this demo. The sample data and visitor changes are ephemeral; do not enter personal or important information.

Only `Dockerfile.demo` opts into this behavior. The existing API-only configuration in `render.yaml`, local seed tool and production migrations remain separate. Static frontend serving is optional through `FRONTEND_DIST_DIR`; existing API routes and missing-asset/API 404s are preserved.

Deploy the repository root with runtime `docker`, Dockerfile `./Dockerfile.demo`, one instance on plan `free`, and no disk or database resource. Do not attach an environment group or copy credentials from another service. Render injects `PORT`; the demo binds to `0.0.0.0` using one worker.

Public demo: **https://yangrent-portfolio-demo.onrender.com/**. Deployment and actual HTTPS functionality were verified on 4 November 2026 before adding the link to README and portfolio metadata. See [hosting verification](hosting-status.md).
