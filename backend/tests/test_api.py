import os
import tempfile
from uuid import uuid4

# Configure DB before importing app.
_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = "sqlite:///" + _db.name
from fastapi.testclient import TestClient
from app.main import app, _weather_cache
import httpx

client = TestClient(app)
garden = str(uuid4())
sample = {"name": "Corn", "preset": "corn", "method": "seed",
          "plantDate": "2026-04-15", "harvestDate": "2026-07-20", "yield": 0,
          "notes": "Sunny bed", "customDays": None}

def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}

def test_crop_crud_and_isolation():
    created = client.post(f"/api/gardens/{garden}/crops", json=sample)
    assert created.status_code == 201, created.text
    crop_id = created.json()["id"]
    assert len(client.get(f"/api/gardens/{garden}/crops").json()) == 1
    assert client.get(f"/api/gardens/{uuid4()}/crops").json() == []
    assert client.put(f"/api/gardens/{uuid4()}/crops/{crop_id}", json=sample).status_code == 404
    modified = {**sample, "notes": "Updated"}
    assert client.put(f"/api/gardens/{garden}/crops/{crop_id}", json=modified).json()["notes"] == "Updated"
    assert client.delete(f"/api/gardens/{garden}/crops/{crop_id}").status_code == 204
    assert client.get(f"/api/gardens/{garden}/crops").json() == []

def test_invalid_crop_and_replacement():
    bad = {**sample, "harvestDate": "2026-01-01"}
    assert client.post(f"/api/gardens/{garden}/crops", json=bad).status_code == 422
    assert client.put(f"/api/gardens/{garden}/crops", json=[sample]).status_code == 200
    assert len(client.get(f"/api/gardens/{garden}/crops").json()) == 1
    assert client.put(f"/api/gardens/{garden}/crops", json=[]).json() == []

def test_recommendations():
    result = client.get("/api/recommendations", params={"crop": "corn", "plant_date": "2026-04-15"})
    assert result.status_code == 200
    assert result.json()["earliestHarvest"] == "2026-06-14"
    assert client.get("/api/recommendations", params={"crop": "unknown", "plant_date": "2026-04-15"}).status_code == 404

def test_weather_validation_and_cache(monkeypatch):
    assert client.get("/api/weather", params={"latitude": 200, "longitude": 10}).status_code == 422
    calls = []
    class FakeResponse:
        def raise_for_status(self): pass
        def json(self): return {"current": {"temperature_2m": 70}, "daily": {"time": []}}
    async def fake_get(self, *a, **kw):
        calls.append(1)
        return FakeResponse()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    _weather_cache.clear()
    for _ in range(2):
        assert client.get("/api/weather", params={"latitude": 36, "longitude": -79}).status_code == 200
    assert len(calls) == 1

def test_weather_upstream_failure(monkeypatch):
    async def failure(self, *a, **kw):
        raise httpx.ConnectError("offline")
    monkeypatch.setattr(httpx.AsyncClient, "get", failure)
    _weather_cache.clear()
    assert client.get("/api/weather", params={"latitude": 37, "longitude": -80}).status_code == 503
