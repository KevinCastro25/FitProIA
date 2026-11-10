-- ============================================================================
-- FitProIA - Esquema Base para Supabase (PostgreSQL 15/16)
-- Fase 1 (MVP): Usuarios, Perfil, Metas Nutricionales, Alimentos CO, Recetas,
-- Registro de Comidas, Entrenamientos (Fuerza/Cardio), Diario y Chequeos.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Usuarios y Consentimiento Habeas Data (Ley 1581 de Colombia)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    auth_provider VARCHAR(50) DEFAULT 'email',
    privacy_consent_ley1581 BOOLEAN NOT NULL DEFAULT TRUE,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Perfil Antropométrico y de Entrenamiento
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('M', 'F')),
    age INT NOT NULL CHECK (age BETWEEN 14 AND 100),
    height_cm FLOAT NOT NULL CHECK (height_cm BETWEEN 120 AND 230),
    current_weight_kg FLOAT NOT NULL CHECK (current_weight_kg BETWEEN 35 AND 250),
    current_body_fat_pct FLOAT CHECK (current_body_fat_pct BETWEEN 3 AND 60),
    bf_measurement_method VARCHAR(40) DEFAULT 'BIOIMPEDANCIA',
    target_body_fat_pct FLOAT NOT NULL CHECK (target_body_fat_pct BETWEEN 4 AND 45),
    activity_level VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    target_weekly_loss_pct FLOAT NOT NULL DEFAULT 0.5 CHECK (target_weekly_loss_pct BETWEEN 0.0 AND 1.2),
    carb_cycling_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    protein_g_per_kg FLOAT NOT NULL DEFAULT 2.1 CHECK (protein_g_per_kg BETWEEN 1.6 AND 2.8),
    calorie_backfill_ratio FLOAT NOT NULL DEFAULT 0.60 CHECK (calorie_backfill_ratio BETWEEN 0.0 AND 1.0),
    injuries_or_restrictions TEXT DEFAULT '',
    primary_sport_focus VARCHAR(60) DEFAULT 'HYBRID_GYM_RUNNING',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Metas Nutricionales Calculadas (Katch-McArdle / Mifflin-St Jeor)
CREATE TABLE IF NOT EXISTS nutrition_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    formula_used VARCHAR(40) NOT NULL,
    lean_body_mass_kg FLOAT NOT NULL,
    fat_mass_kg FLOAT NOT NULL,
    bmr_kcal INT NOT NULL,
    tdee_base_kcal INT NOT NULL,
    tdee_lower_bound_kcal INT NOT NULL,
    tdee_upper_bound_kcal INT NOT NULL,
    target_daily_kcal INT NOT NULL,
    training_day_kcal INT NOT NULL,
    rest_day_kcal INT NOT NULL,
    min_safe_kcal INT NOT NULL,
    protein_target_g INT NOT NULL,
    fat_target_g INT NOT NULL,
    carbs_training_day_g INT NOT NULL,
    carbs_rest_day_g INT NOT NULL,
    fiber_target_g INT NOT NULL,
    water_target_ml INT NOT NULL,
    daily_steps_target INT NOT NULL DEFAULT 10000,
    warnings_json JSONB DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Catálogo de Alimentos (Gastronomía Colombiana + USDA + Open Food Facts + Custom)
CREATE TABLE IF NOT EXISTS food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_es VARCHAR(200) NOT NULL,
    category VARCHAR(80) NOT NULL,
    region VARCHAR(20) NOT NULL DEFAULT 'CO',
    source VARCHAR(40) NOT NULL DEFAULT 'COLOMBIA_CORE',
    barcode_ean13 VARCHAR(32),
    serving_label VARCHAR(100) NOT NULL DEFAULT '1 porción (100g)',
    serving_weight_g FLOAT NOT NULL DEFAULT 100.0,
    kcal_per_100g FLOAT NOT NULL,
    protein_g_per_100g FLOAT NOT NULL,
    carbs_g_per_100g FLOAT NOT NULL,
    fat_g_per_100g FLOAT NOT NULL,
    fiber_g_per_100g FLOAT NOT NULL DEFAULT 0.0,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm ON food_items USING gin (name_es gin_trgm_ops);

-- 5. Recetas Propias del Usuario
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    servings INT NOT NULL DEFAULT 1 CHECK (servings >= 1),
    total_weight_g FLOAT NOT NULL DEFAULT 100.0,
    kcal_per_serving INT NOT NULL,
    protein_g_per_serving FLOAT NOT NULL,
    carbs_g_per_serving FLOAT NOT NULL,
    fat_g_per_serving FLOAT NOT NULL,
    fiber_g_per_serving FLOAT NOT NULL DEFAULT 0.0,
    ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Registro de Comidas Diario
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_type VARCHAR(30) NOT NULL CHECK (meal_type IN ('DESAYUNO', 'ALMUERZO', 'CENA', 'PRE_ENTRENO', 'POST_ENTRENO', 'SNACK')),
    food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    custom_food_name VARCHAR(200) NOT NULL,
    quantity_g FLOAT NOT NULL CHECK (quantity_g > 0),
    portion_description VARCHAR(100) DEFAULT 'Gramos',
    kcal INT NOT NULL,
    protein_g FLOAT NOT NULL,
    carbs_g FLOAT NOT NULL,
    fat_g FLOAT NOT NULL,
    fiber_g FLOAT NOT NULL DEFAULT 0.0,
    client_mutation_id VARCHAR(100) UNIQUE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, log_date);

-- 7. Registro de Entrenamientos (Fuerza y Cardio/Running/Hyrox)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    title VARCHAR(160) NOT NULL,
    modality VARCHAR(30) NOT NULL CHECK (modality IN ('STRENGTH', 'RUNNING', 'HYROX', 'CYCLING', 'SWIMMING', 'MOBILITY')),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    session_rpe INT NOT NULL DEFAULT 7 CHECK (session_rpe BETWEEN 1 AND 10),
    internal_load_au INT NOT NULL,
    estimated_kcal_burned INT NOT NULL,
    distance_km FLOAT DEFAULT 0.0,
    avg_pace_sec_per_km INT DEFAULT 0,
    avg_hr_bpm INT DEFAULT 0,
    elevation_gain_m INT DEFAULT 0,
    strength_sets_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    client_mutation_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workout_sessions(user_id, session_date);

-- 8. Métricas Diarias de Hidratación y Pasos
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    water_ml INT NOT NULL DEFAULT 0,
    steps_count INT NOT NULL DEFAULT 0,
    sleep_hours FLOAT DEFAULT 7.5,
    day_type VARCHAR(20) NOT NULL DEFAULT 'TRAINING',
    UNIQUE(user_id, metric_date)
);

-- 9. Chequeos de Composición Corporal y Valoración Automática
CREATE TABLE IF NOT EXISTS body_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    weight_kg FLOAT NOT NULL,
    trend_weight_kg FLOAT NOT NULL,
    body_fat_pct FLOAT NOT NULL,
    bf_method VARCHAR(40) NOT NULL,
    measurement_conditions VARCHAR(60) NOT NULL DEFAULT 'AYUNAS_MANANA',
    lean_mass_kg FLOAT NOT NULL,
    fat_mass_kg FLOAT NOT NULL,
    waist_cm FLOAT NOT NULL,
    hip_cm FLOAT DEFAULT 0.0,
    chest_cm FLOAT DEFAULT 0.0,
    arm_cm FLOAT DEFAULT 0.0,
    thigh_cm FLOAT DEFAULT 0.0,
    energy_level INT NOT NULL DEFAULT 4 CHECK (energy_level BETWEEN 1 AND 5),
    sleep_quality INT NOT NULL DEFAULT 4 CHECK (sleep_quality BETWEEN 1 AND 5),
    strength_performance INT NOT NULL DEFAULT 4 CHECK (strength_performance BETWEEN 1 AND 5),
    notes TEXT DEFAULT '',
    assessment_status VARCHAR(40) NOT NULL,
    assessment_summary TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    calorie_adjustment_kcal INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
