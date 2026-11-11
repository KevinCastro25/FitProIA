import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.db.seed_colombia import seed_initial_data
from app.api.v1.router import api_router


def _ensure_phase3_columns():
    alter_stmts = [
        # daily_metrics
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS water_ml INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS steps_count INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_hours FLOAT DEFAULT 7.5",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS resting_hr_bpm INTEGER DEFAULT 54",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_ms FLOAT DEFAULT 68.0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS active_kcal_extra INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50) DEFAULT 'MANUAL'",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS day_type VARCHAR(20) DEFAULT 'TRAINING'",
        # user_profiles
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS injuries_or_restrictions TEXT DEFAULT ''",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_sport_focus VARCHAR(60) DEFAULT 'HYBRID_GYM_RUNNING'",
        # nutrition_targets (garantizar compatibilidad de warnings_json como TEXT para SQLite y Postgres)
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS warnings_json TEXT DEFAULT '[]'",
        "ALTER TABLE nutrition_targets ALTER COLUMN warnings_json TYPE TEXT USING warnings_json::text",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS daily_steps_target INTEGER DEFAULT 10000",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ DEFAULT NOW()",
        # food_items
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS barcode_ean13 VARCHAR(32)",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS fiber_g_per_100g FLOAT DEFAULT 0.0",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_label VARCHAR(100) DEFAULT '1 porción (100g)'",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_weight_g FLOAT DEFAULT 100.0",
        # workout_sessions
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(100)",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS strength_sets_json TEXT DEFAULT '[]'",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS distance_km FLOAT DEFAULT 0.0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS avg_pace_sec_per_km INTEGER DEFAULT 0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS avg_hr_bpm INTEGER DEFAULT 0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS elevation_gain_m INTEGER DEFAULT 0",
        # meal_logs
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS portion_description VARCHAR(100) DEFAULT 'Gramos'",
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS fiber_g FLOAT DEFAULT 0.0",
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(100)",
    ]
    with engine.connect() as conn:
        for stmt in alter_stmts:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                # Si una sentencia no aplica (ej. SQLite no soporta ALTER COLUMN), continuar
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"[FitProIA Unhandled Error] {request.method} {request.url}: {tb}", flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}", "traceback": tb.splitlines()[-4:]},
    )


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
