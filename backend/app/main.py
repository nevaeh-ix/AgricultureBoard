"""AgricultureBoard API: CRUD, planning advice, and cached Open-Meteo forecasts."""
import os
import time
from datetime import date, timedelta
from threading import Lock
from uuid import UUID, uuid4

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, model_validator
from sqlalchemy import Date, Float, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agriculture.db")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
Session = sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class CropRow(Base):
    __tablename__ = "crops"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    garden_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(80))
    preset: Mapped[str] = mapped_column(String(80))
    method: Mapped[str] = mapped_column(String(24))
    plant_date: Mapped[date] = mapped_column(Date)
    harvest_date: Mapped[date] = mapped_column(Date)
    yield_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    custom_days: Mapped[int | None] = mapped_column(nullable=True)

Base.metadata.create_all(engine)

class CropIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    preset: str = Field(default="custom", min_length=1, max_length=80)
    method: str = Field(default="seed", max_length=24)
    plantDate: date
    harvestDate: date
    yield_amount: float | None = Field(default=None, ge=0, le=1000000, alias="yield")
    notes: str = Field(default="", max_length=500)
    customDays: int | None = Field(default=None, ge=1, le=1095)
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.harvestDate < self.plantDate:
            raise ValueError("Harvest date must be on or after the planting date")
        return self

class CropOut(CropIn):
    id: str

app = FastAPI(title="AgricultureBoard API", version="1.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000,https://nevaeh-ix.github.io").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins], allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type"])

def to_output(row):
    return CropOut(id=row.id, name=row.name, preset=row.preset, method=row.method,
                   plantDate=row.plant_date, harvestDate=row.harvest_date, yield=row.yield_amount,
                   notes=row.notes, customDays=row.custom_days)

def apply_values(row, crop):
    row.name = crop.name
    row.preset = crop.preset
    row.method = crop.method
    row.plant_date = crop.plantDate
    row.harvest_date = crop.harvestDate
    row.yield_amount = crop.yield_amount
    row.notes = crop.notes
    row.custom_days = crop.customDays

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/gardens/{garden_id}/crops", response_model=list[CropOut], response_model_by_alias=True)
def list_crops(garden_id: UUID):
    with Session() as db:
        rows = db.scalars(select(CropRow).where(CropRow.garden_id == str(garden_id)).order_by(CropRow.plant_date, CropRow.id)).all()
        return [to_output(row) for row in rows]

@app.post("/api/gardens/{garden_id}/crops", response_model=CropOut, status_code=201)
def create_crop(garden_id: UUID, crop: CropIn):
    row = CropRow(id=str(uuid4()), garden_id=str(garden_id))
    apply_values(row, crop)
    with Session.begin() as db:
        db.add(row)
    return to_output(row)

@app.put("/api/gardens/{garden_id}/crops/{crop_id}", response_model=CropOut)
def update_crop(garden_id: UUID, crop_id: UUID, crop: CropIn):
    with Session.begin() as db:
        row = db.get(CropRow, str(crop_id))
        if row is None or row.garden_id != str(garden_id):
            raise HTTPException(404, "Crop not found")
        apply_values(row, crop)
        db.flush()
        return to_output(row)

@app.delete("/api/gardens/{garden_id}/crops/{crop_id}", status_code=204)
def delete_crop(garden_id: UUID, crop_id: UUID):
    with Session.begin() as db:
        row = db.get(CropRow, str(crop_id))
        if row is None or row.garden_id != str(garden_id):
            raise HTTPException(404, "Crop not found")
        db.delete(row)

@app.put("/api/gardens/{garden_id}/crops", response_model=list[CropOut])
def replace_crops(garden_id: UUID, crops: list[CropIn] = []):
    """Atomic replacement used to migrate and sync the original localStorage interface."""
    if len(crops) > 200:
        raise HTTPException(413, "Maximum 200 crops per garden")
    with Session.begin() as db:
        for row in db.scalars(select(CropRow).where(CropRow.garden_id == str(garden_id))).all():
            db.delete(row)
        output = []
        for crop in crops:
            row = CropRow(id=str(uuid4()), garden_id=str(garden_id))
            apply_values(row, crop)
            db.add(row)
            output.append(to_output(row))
        return output

DAYS = {"corn": (60, 100), "tomato": (60, 90), "tomatoes": (60, 90),
        "potato": (70, 120), "potatoes": (70, 120),
        "lettuce": (30, 70), "carrot": (55, 85), "cucumber": (50, 70)}

@app.get("/api/recommendations")
def recommendation(crop: str = Query(min_length=1, max_length=80),
                   plant_date: date = Query(),
                   days_to_harvest: int | None = Query(default=None, ge=1, le=1095)):
    key = crop.strip().lower()
    if days_to_harvest is None and key not in DAYS:
        raise HTTPException(404, "Unknown crop; provide days_to_harvest from your seed packet")
    low, high = DAYS.get(key, (days_to_harvest, days_to_harvest))
    return {"crop": key, "plantDate": plant_date, "earliestHarvest": plant_date + timedelta(days=low),
            "latestHarvest": plant_date + timedelta(days=high),
            "message": "Estimated dates only. Local climate, variety, and growing method affect timing."}

_weather_cache = {}
_weather_lock = Lock()
WEATHER_TTL = 600

@app.get("/api/weather")
async def weather(latitude: float = Query(ge=-90, le=90), longitude: float = Query(ge=-180, le=180)):
    # Rounded location keys avoid duplicate upstream requests from nearby coordinates.
    key = (round(latitude, 3), round(longitude, 3))
    now = time.monotonic()
    with _weather_lock:
        hit = _weather_cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    params = {"latitude": latitude, "longitude": longitude,
              "current": "temperature_2m,weather_code,wind_speed_10m",
              "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max",
              "temperature_unit": "fahrenheit", "wind_speed_unit": "mph",
              "precipitation_unit": "inch", "timezone": "auto", "forecast_days": 7}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Weather provider unavailable")
    with _weather_lock:
        _weather_cache[key] = (time.monotonic() + WEATHER_TTL, data)
        if len(_weather_cache) > 500:
            for old in list(_weather_cache):
                if _weather_cache[old][0] <= time.monotonic():
                    del _weather_cache[old]
    return data
