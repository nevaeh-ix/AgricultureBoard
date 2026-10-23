# AgricultureBoard 🌱

Crop planning with weather forecasts, editable garden records, and planting estimates.

**Frontend:** JavaScript · HTML/CSS · browser fallback  
**Backend:** Python · FastAPI · SQLAlchemy · PostgreSQL · Docker · Open-Meteo

**Features:** Location search, 12 crop presets, weather forecasts, planting recommendations, and persistent garden records. The frontend continues working locally when no backend is configured.

## Try the existing website

[Open AgricultureBoard](https://nevaeh-ix.github.io/AgricultureBoard/)

The GitHub Pages version works without a deployed API and saves crops in your browser.

## Run the full stack locally

Requires Docker and Python 3.

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

## Tests

```bash
cd backend
python -m pip install -r requirements-dev.txt
pytest -q
```

See [backend documentation](backend/README.md) for deployment, API routes, and security limits. **The backend has not yet been deployed publicly.** This portfolio implementation uses a browser-generated garden ID, not user authentication; do not use it for sensitive information or a public multi-user service without auth, rate limits, and access checks.

Planting dates are estimates, not guarantees. Weather: [Open-Meteo](https://open-meteo.com/). Planting reference: [NC State Extension](https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs).
