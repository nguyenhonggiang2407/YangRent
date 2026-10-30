# Deployment notes

This source has local verification; no provider deployment is claimed. Select and verify hosting appropriate for the Python API, persistent database and uploads separately from the static frontend.

## Frontend

- Vercel project root: `frontend`; build: `npm run build`; output: `dist`.
- `frontend/vercel.json` provides a BrowserRouter fallback that excludes `/api`.
- Set the public `VITE_API_URL` to the deployed backend's full HTTPS API prefix, for example `https://api.example.com/api`, and rebuild. The development proxy is unavailable in a production static build.
- Verify direct navigation and refresh on `/login`, `/rooms` and an existing `/rooms/<id>` after deployment. Provider routing has not been exercised by this publication preparation.
- Keep database passwords, signing secrets and storage service-role keys out of all `VITE_` variables.

## Backend and data

The ASGI entrypoint is `app.main:app` from `backend`. Install `requirements.txt`. Supply private `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET` and `CORS_ORIGINS`. Signing keys have no source defaults and require at least 32 characters; generate independent random values. Use the exact frontend HTTPS origin. SQLite files are for local development, not ephemeral production storage.

For Supabase TLS, add `sslmode=verify-full&sslrootcert=certs/supabase-ca.crt` to the private database URL query (`?` for its first query parameter, `&` when one already exists). Keep the dashboard-provided DNS hostname: `verify-full` checks both the CA chain and hostname. The included `backend/certs/supabase-ca.crt` is the public provider CA downloaded from [Supabase's SSL configuration](https://supabase.com/docs/guides/platform/ssl-enforcement) via [prod-ca-2021.crt](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt), SHA256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`; it contains no private key or project credentials. Replace it with the provider-verified CA when the provider rotates it or before expiry.

The existing Render service uses `rootDir: backend`, so its migration/build and start commands resolve `certs/supabase-ca.crt` inside `backend`. A different working directory needs the corresponding absolute or adjusted path; do not reduce `sslmode` to bypass a missing or mismatched CA. [libpq SSL parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLROOTCERT) accept this filename, and [Render root-relative commands](https://render.com/docs/monorepo-support#root-relative-settings) use the configured service root.

Use a dedicated persistent PostgreSQL database. Review and back up the intended database before running `python -m alembic upgrade head`. The supplied root `render.yaml` is a deployment descriptor, not proof of provider/account availability; its build command runs that migration. No external migration has been performed here.

The Alembic head includes PostgreSQL-specific schema queries and is not a SQLite initializer; use the explicit local-demo initializer for local SQLite. Migrations do not configure row-level security for private application tables such as users/password hashes, contracts and messages. Before loading real data into Supabase, disable the unused Data API for the application schema or review RLS and table grants so anonymous/authenticated Data API roles cannot access those private tables. The backend database connection remains private; application JWT roles are not a substitute for this database access boundary.

The single root Render blueprint also supplies an optional static frontend with the SPA rewrite; do not deploy a second conflicting descriptor. It explicitly requests the free Python service plan, while static services have no plan field. Actual allowances, availability and sleep behavior still require provider verification. The backend `.python-version` pins the previously checked Python 3.12 minor. Use the Supabase session pooler on port 5432 for this long-lived ASGI/SSE deployment; do not select the transaction pooler on port 6543 as its sole connection path. Configure `VITE_API_URL` with the final API HTTPS origin plus `/api` and `CORS_ORIGINS` with the final frontend HTTPS origin.

Image uploads require backend-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (legacy `SUPABASE_KEY` is also recognized). Current storage uses the public `room-images` bucket; changing `STORAGE_BUCKET` alone has no effect. Uploaded bytes fail when storage is unconfigured; ordinary external image URLs remain supported. Provider keys, database contents and upload storage are excluded from this repository.

Notifications use authenticated fetch streaming with a bearer header, never a URL token. Disposal aborts the stream and requests; ended or failed streams fall back to ten-second polling. Verify the chosen backend's stream/runtime limits and fallback after deployment.

The optional seed command is exclusively for a new local fictional demo. It never initializes a hosted database or resets existing files, and its generated local demo accounts must not be exposed as a public service. Production administrator provisioning remains a deliberate private deployment step.

After migrations, `python provision_admin.py --create-admin` privately prompts for new administrator details and a hidden password. It requires explicit confirmation, rejects an existing account and never resets or overwrites users. Generate the password privately and keep it out of repository files/build variables.

External font/map/panorama/QR providers remain runtime dependencies. Actual hosted routing, HTTPS/CORS, auth, database persistence, upload permissions and stream fallback require deployment-owner verification.
