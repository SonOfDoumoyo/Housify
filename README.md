# Housify

Housify by StreixCorp — connect renters with trusted agents and landlords.

## Layout

- `frontend/` — Next.js app (Pages Router + client-side routing).
  Install with `npm install`, build with `npm run build`, run with
  `npm start`. Configure `NEXT_PUBLIC_API_BASE_URL` to end in
  `/api/v1.0/` (see `frontend/.env.example` if present).
- `backend/` — FastAPI + SQLModel/SQLAlchemy (Postgres), Redis token
  store, Cloudflare R2 storage. Install with
  `pip install -r backend/requirements.txt`, copy
  `backend/app/.env.example` to `backend/app/.env` and fill in real
  credentials. Run `alembic upgrade head` BEFORE starting the backend
  for the first time on a new database (the app creates tables on
  startup, which would otherwise clash with the migrations).

No separate user profile page: account settings live under Settings.

## Run everything with Docker Compose

From this directory:

```sh
cp backend/app/.env.example backend/app/.env   # then fill in real secrets
docker compose up --build
```

The site is at http://localhost:3000 and the API at
http://localhost:8000 (`GET /health`). The backend container runs
`alembic upgrade head` before starting, so the database is migrated
automatically. See the comments at the top of `docker-compose.yml`
for the production (Oracle + Vercel) overrides.
