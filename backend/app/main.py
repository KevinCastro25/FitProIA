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
        # users
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent_ley1581 BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
        # user_profiles
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sex VARCHAR(10) DEFAULT 'M'",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 25",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS height_cm FLOAT DEFAULT 175.0",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_weight_kg FLOAT DEFAULT 70.0",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_body_fat_pct FLOAT DEFAULT 18.0",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bf_measurement_method VARCHAR(40) DEFAULT 'BIOIMPEDANCIA'",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_body_fat_pct FLOAT DEFAULT 12.0",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_level VARCHAR(30) DEFAULT 'ACTIVE'",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_weekly_loss_pct FLOAT DEFAULT 0.5",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS carb_cycling_enabled BOOLEAN DEFAULT TRUE",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS protein_g_per_kg FLOAT DEFAULT 2.1",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS calorie_backfill_ratio FLOAT DEFAULT 0.60",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS injuries_or_restrictions TEXT DEFAULT ''",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_sport_focus VARCHAR(60) DEFAULT 'HYBRID_GYM_RUNNING'",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        # nutrition_targets (todas las columnas de cálculo metabólico)
        "ALTER TABLE nutrition_targets ALTER COLUMN protein_grams DROP NOT NULL",
        "ALTER TABLE nutrition_targets ALTER COLUMN fat_grams DROP NOT NULL",
        "ALTER TABLE nutrition_targets ALTER COLUMN carbs_grams DROP NOT NULL",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS formula_used VARCHAR(40) DEFAULT 'KATCH_MCARDLE'",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS lean_body_mass_kg FLOAT DEFAULT 60.0",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS fat_mass_kg FLOAT DEFAULT 15.0",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS bmr_kcal INTEGER DEFAULT 1600",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS tdee_base_kcal INTEGER DEFAULT 2200",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS tdee_lower_bound_kcal INTEGER DEFAULT 2000",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS tdee_upper_bound_kcal INTEGER DEFAULT 2500",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS target_daily_kcal INTEGER DEFAULT 2000",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS training_day_kcal INTEGER DEFAULT 2200",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS rest_day_kcal INTEGER DEFAULT 1900",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS min_safe_kcal INTEGER DEFAULT 1500",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS protein_target_g INTEGER DEFAULT 150",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS fat_target_g INTEGER DEFAULT 60",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS carbs_training_day_g INTEGER DEFAULT 200",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS carbs_rest_day_g INTEGER DEFAULT 150",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS fiber_target_g INTEGER DEFAULT 30",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS water_target_ml INTEGER DEFAULT 2500",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS daily_steps_target INTEGER DEFAULT 10000",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS warnings_json TEXT DEFAULT '[]'",
        "ALTER TABLE nutrition_targets ALTER COLUMN warnings_json TYPE TEXT USING warnings_json::text",
        "ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ DEFAULT NOW()",
        # daily_metrics
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS water_ml INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS steps_count INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_hours FLOAT DEFAULT 7.5",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS resting_hr_bpm INTEGER DEFAULT 54",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_ms FLOAT DEFAULT 68.0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS active_kcal_extra INTEGER DEFAULT 0",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50) DEFAULT 'MANUAL'",
        "ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS day_type VARCHAR(20) DEFAULT 'TRAINING'",
        # food_items
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS region VARCHAR(20) DEFAULT 'CO'",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'COLOMBIA_CORE'",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS barcode_ean13 VARCHAR(32)",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_label VARCHAR(100) DEFAULT '1 porción (100g)'",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_weight_g FLOAT DEFAULT 100.0",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS fiber_g_per_100g FLOAT DEFAULT 0.0",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE",
        "ALTER TABLE food_items ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(36)",
        # workout_sessions
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS session_rpe INTEGER DEFAULT 7",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS internal_load_au INTEGER DEFAULT 315",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS distance_km FLOAT DEFAULT 0.0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS avg_pace_sec_per_km INTEGER DEFAULT 0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS avg_hr_bpm INTEGER DEFAULT 0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS elevation_gain_m INTEGER DEFAULT 0",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS strength_sets_json TEXT DEFAULT '[]'",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
        "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(100)",
        # meal_logs
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS portion_description VARCHAR(100) DEFAULT 'Gramos'",
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS fiber_g FLOAT DEFAULT 0.0",
        "ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(100)",
        # body_checkins
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS hip_cm FLOAT DEFAULT 0.0",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS chest_cm FLOAT DEFAULT 0.0",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS arm_cm FLOAT DEFAULT 0.0",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS thigh_cm FLOAT DEFAULT 0.0",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS energy_level INTEGER DEFAULT 4",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS sleep_quality INTEGER DEFAULT 4",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS strength_performance INTEGER DEFAULT 4",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
        "ALTER TABLE body_checkins ADD COLUMN IF NOT EXISTS calorie_adjustment_kcal INTEGER DEFAULT 0",
    ]
    with engine.connect() as conn:
        for stmt in alter_stmts:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                # Si una sentencia no aplica (ej. SQLite no soporta ALTER COLUMN), continuar
                pass

        if engine.dialect.name == "postgresql":
            pg_cleanup = """
            DO $$
            DECLARE
                t text;
                c text;
            BEGIN
                FOR t, c IN
                    SELECT table_name, column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name IN ('nutrition_targets', 'user_profiles', 'daily_metrics', 'workout_sessions', 'body_checkins', 'meal_logs', 'food_items')
                      AND column_name NOT IN ('id', 'user_id', 'metric_date', 'session_date', 'checkin_date', 'log_date', 'name_es', 'category', 'kcal_per_100g', 'protein_g_per_100g', 'carbs_g_per_100g', 'fat_g_per_100g', 'title', 'modality', 'duration_minutes', 'internal_load_au', 'estimated_kcal_burned', 'weight_kg', 'trend_weight_kg', 'body_fat_pct', 'bf_method', 'lean_mass_kg', 'fat_mass_kg', 'waist_cm', 'assessment_status', 'assessment_summary', 'recommended_action', 'meal_type', 'custom_food_name', 'quantity_g', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'sex', 'age', 'height_cm', 'current_weight_kg', 'target_body_fat_pct', 'formula_used', 'bmr_kcal', 'target_daily_kcal')
                      AND is_nullable = 'NO'
                LOOP
                    BEGIN
                        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', t, c);
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END LOOP;
            END $$;
            """
            try:
                conn.execute(text(pg_cleanup))
                conn.commit()
            except Exception as err:
                print(f"[FitProIA DB Cleanup Warning] {err}", flush=True)


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
