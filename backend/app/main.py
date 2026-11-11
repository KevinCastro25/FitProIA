from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.db.seed_colombia import seed_initial_data
from app.api.v1.router import api_router


def _ensure_phase3_columns():
    alter_stmts = [
        "ALTER TABLE daily_metrics ADD COLUMN resting_hr_bpm INTEGER DEFAULT 54",
        "ALTER TABLE daily_metrics ADD COLUMN hrv_ms FLOAT DEFAULT 68.0",
        "ALTER TABLE daily_metrics ADD COLUMN active_kcal_extra INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN sync_source VARCHAR(50) DEFAULT 'MANUAL'",
    ]
    with engine.connect() as conn:
        for stmt in alter_stmts:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas si no existen y poblar catálogo semilla colombiano
    Base.metadata.create_all(bind=engine)
    _ensure_phase3_columns()
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST de FitProIA: Seguimiento nutricional, recomposición corporal (% grasa y masa magra) "
        "y entrenamiento híbrido (Gym + Running / Hyrox), optimizada para PWA en iOS y Supabase."
    ),
    lifespan=lifespan,
)

_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Con "*" no se permiten credenciales (la auth va por header Bearer, no por cookies).
    allow_credentials=_cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Salud del Sistema"])
@app.head("/", tags=["Salud del Sistema"])
def root_check():
    body = b'{"status":"ok"}'
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Length": str(len(body))},
    )


@app.get("/health", tags=["Salud del Sistema"])
@app.head("/health", tags=["Salud del Sistema"])
def health_check():
    body = b'{"status":"ok","pwa_ios_ready":true}'
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Length": str(len(body))},
    )


@app.get("/ping", tags=["Salud del Sistema"])
@app.head("/ping", tags=["Salud del Sistema"])
def ping():
    """Endpoint ultra liviano (4 bytes) con Content-Length fijo para cron-job.org."""
    body = b"pong"
    return Response(
        content=body,
        media_type="text/plain",
        headers={"Content-Length": str(len(body))},
    )
