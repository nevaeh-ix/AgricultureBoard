# AgricultureBoard 🌱

Crop planning with weather forecasts, editable garden records, and planting estimates.

**Frontend:** JavaScript · HTML/CSS · browser fallback  
**Backend:** Python · FastAPI · SQLAlchemy · PostgreSQL · Docker · Open-Meteo

**Features:** Location search, 12 crop presets, weather forecasts, planting recommendations, and persistent garden records. The frontend continues working locally when no backend is configured.

## Try the existing website

[Open AgricultureBoard](https://nevaeh-ix.github.io/AgricultureBoard/)

The GitHub Pages version works without a deployed API and saves crops in your browser.

## Run the full stack locally

Requires Docker and Python 3. The API runs at http://localhost:8001 and PostgreSQL data stays in a Docker volume. Set `POSTGRES_PASSWORD` in your environment to override the local development default.

```bash
docker compose up --build -d
python -m http.server 8000
```

Open http://localhost:8000. In that page's browser developer console, set the backend URL once:

```js
localStorage.setItem("agricultureApiUrl", "http://localhost:8001");
location.reload();
```

Backend API documentation: http://localhost:8001/docs

The frontend imports existing local crop records when the backend's garden is empty; thereafter, changes sync to PostgreSQL. Browser saving remains available if the backend is down. Don't treat this demo sync as multi-device conflict resolution.

## API and deployment

- `GET /api/health`
- `GET, POST, PUT /api/gardens/{garden_id}/crops` (PUT saves the whole collection in one transaction)
- `PUT, DELETE /api/gardens/{garden_id}/crops/{crop_id}`
- `GET /api/recommendations?crop=corn&plant_date=2026-04-15`
- `GET /api/weather?latitude=36.07&longitude=-79.79` (10-minute cache)

Deploy `backend/Dockerfile` with a managed PostgreSQL database and HTTPS. Set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB` and `CORS_ORIGINS=https://nevaeh-ix.github.io`, then set the browser's `agricultureApiUrl` to the backend's HTTPS origin.

## Tests

Frontend:

```bash
npm ci
npm test
```

Backend:

```bash
cd backend
python -m pip install -r requirements-dev.txt
pytest -q
```

**The backend has not yet been deployed publicly.** This portfolio implementation uses a browser-generated garden ID, not user authentication; do not use it for sensitive information or a public multi-user service without authentication, ownership checks, rate limits, and backups. CORS is not access control. Tables are created on startup; a production deployment needs migrations.

Backend tests use temporary SQLite and mocked weather requests to check crop CRUD, validation, garden separation, caching, and provider failures. PostgreSQL integration testing is still a separate step.

Planting dates are estimates, not guarantees. Weather: [Open-Meteo](https://open-meteo.com/). Planting reference: [NC State Extension](https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs).

