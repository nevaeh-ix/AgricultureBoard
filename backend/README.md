# AgricultureBoard backend

FastAPI + SQLAlchemy + PostgreSQL service for garden records, basic harvest estimates, and cached Open-Meteo weather.

## Local Docker setup

From the repository root, run `docker compose up --build -d`. The backend is at http://localhost:8001/docs and the health endpoint is http://localhost:8001/api/health. PostgreSQL data persists in a Docker volume. Configure `POSTGRES_PASSWORD` via your environment for nonthrowaway setups; don't commit credentials.

Start the existing frontend separately using `python -m http.server 8000`. Set its API URL in the browser with `localStorage.setItem("agricultureApiUrl", "http://localhost:8001")` then reload. A browser-specific UUID identifies the garden; existing local crops are imported on first successful connection. If the API is unreachable, the frontend continues locally and can retry later.

## Deploy

Deploy the `backend/Dockerfile` on a container platform with a managed PostgreSQL database. Set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB` and `CORS_ORIGINS=https://nevaeh-ix.github.io`. Enable HTTPS. Then configure the frontend `agricultureApiUrl` to the HTTPS backend origin.

**Security:** This is a portfolio demo, NOT a multi-user account system. Anyone with a garden UUID can access its records; UUIDs are not authentication. Do not save sensitive information. Before hosting for real users, add authentication, ownership checks, migration tooling, rate limiting, and backups. CORS is not access control. The server creates tables on startup; use Alembic migrations for production.

## Endpoints

- `GET /api/health`
- `GET, POST, PUT /api/gardens/{garden_id}/crops` (PUT replaces the collection atomically)
- `PUT, DELETE /api/gardens/{garden_id}/crops/{crop_id}`
- `GET /api/recommendations?crop=corn&plant_date=2026-04-15`
- `GET /api/weather?latitude=36.07&longitude=-79.79` (10-minute server-side cache)

## Tests

`cd backend && pip install -r requirements-dev.txt && pytest -q`
Tests run against temporary SQLite (the same SQLAlchemy models), mock weather HTTP calls, and exercise CRUD, validation, tenant separation, cached forecasts, and upstream failures. PostgreSQL integration testing is a separate next step.
