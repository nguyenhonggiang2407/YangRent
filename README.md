# YangRent

YangRent is a Vietnamese rental housing portfolio project with a React/Vite frontend and a FastAPI/SQLAlchemy backend. It includes JWT authentication and roles for administrators, landlords, tenants and users; property search and favorites; roommate listings; booking requests; conversations and notifications; and landlord tools for contracts, invoices, meters and maintenance. Recommendation and assistant features currently use rule-based/demo logic.

This repository contains reviewed application source and migrations. It contains no live database, accounts, uploaded photos, production configuration or signing credentials. The optional local demo has three clearly fictional users and three fictional listings with an original SVG placeholder. It is not a live rental service or a deployed production backup.

## Local setup

Use Python 3.10+ and Node 20+; the reviewed application was checked with Python 3.12 and Node 24.

```text
cd backend
python -m venv .venv
# Activate .venv for your operating system.
python -m pip install -r requirements-dev.txt
# Copy .env.example to .env.
```

Generate two independent signing keys locally and put them in `SECRET_KEY` and `JWT_SECRET` in the private `.env`. Each must have at least 32 characters; missing or short values prevent startup.

```text
python -c "import secrets; print(secrets.token_urlsafe(48)); print(secrets.token_urlsafe(48))"
```

For local development, create the new fictional database described below, then set `DATABASE_URL=sqlite:///./yangrent-demo.db` in your private environment and start the API. The reviewed Alembic head migration uses PostgreSQL-specific schema queries; do not run it against SQLite.

```text
python -m seed.seed --local-demo
# Set DATABASE_URL=sqlite:///./yangrent-demo.db in the private environment.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```text
cd frontend
npm ci
npm run dev
```

The Vite development server proxies `/api` to `127.0.0.1:8000`. Open the local URL it displays. Register your own local account; self-registration cannot grant administrator roles.

To provision a new administrator in your privately configured and migrated database, run `python provision_admin.py --create-admin` from `backend`. Confirm the explicit prompt, enter your own email/name and a privately generated password through hidden prompts. Existing accounts are refused; their passwords and roles are never overwritten. This command has no preset credentials and prints none.

## Optional fictional local demo

After configuring the private signing keys, run this command from `backend` before starting the API:

```text
python -m seed.seed --local-demo
```

It creates a **new** `yangrent-demo.db` in the current directory with three fictional accounts and three listings. The demo initializer creates its own local schema, ignores any configured remote database, refuses an existing demo file, and has no reset option. It prints newly generated passwords only for that explicit local run. Set `DATABASE_URL=sqlite:///./yangrent-demo.db` in your private environment to use it locally. Do not expose demo accounts on a public host. The demo includes no phone numbers, personal photos, real addresses or map coordinates.

## Checks and current limits

```text
cd frontend
npm test
npm run build
```

```text
cd backend
python -m unittest discover -s tests -v
```

The prior reviewed source passed seven notification stream tests, eight backend route/auth/ownership tests, a Vite production build and local fictional dashboard/detail desktop and mobile checks. The separate publication preparation also tests the local seed safeguards and signing-key requirements. These checks do not establish deployed provider compatibility or external storage/map/media behavior. One original local notification eager-load error was observed; the later restart and final navigation passed, but its cause remains unconfirmed.

## Deployment

See [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md). A frontend build alone does not host the API. Production needs a separately configured ASGI backend, persistent database, private signing keys, exact CORS origin and storage for image uploads. No hosted instance or uptime is claimed by this source preparation.

Original stock property photos and the unrelated bitmap were omitted because supplied provenance did not establish redistribution rights. Static demo imagery uses the included SVG. Fonts, maps, panorama assets and QR generation may contact external providers at runtime; those integrations were not verified during publication preparation. QR generation sends the encoded invoice QR content to that provider.

## Source and licensing

See [SOURCE_NOTICE.md](SOURCE_NOTICE.md). No license grant for the original application was present in the supplied source. This repository does not invent one. Third-party dependencies retain their own licenses and are installed separately; dependency directories are not vendored.
