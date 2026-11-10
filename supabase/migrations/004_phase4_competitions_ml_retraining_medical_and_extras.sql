-- ============================================================================
-- FitProIA — Migración Fase 4: Planificación por Competencias (RED-S),
-- Pipeline de Reentrenamiento IA (Human-in-the-Loop), Chequeos Médicos
-- y Planificador Semanal con Lista de Compras
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_events (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    event_type VARCHAR(40) NOT NULL DEFAULT 'HALF_MARATHON',
    event_date DATE NOT NULL,
    distance_km NUMERIC(6,2) NOT NULL DEFAULT 21.1,
    elevation_gain_m INTEGER NOT NULL DEFAULT 150,
    goal_time_minutes INTEGER NOT NULL DEFAULT 105,
    priority_level VARCHAR(5) NOT NULL DEFAULT 'A',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_events_user_date
    ON competition_events(user_id, event_date);

CREATE TABLE IF NOT EXISTS ml_retraining_runs (
    id VARCHAR(36) PRIMARY KEY,
    model_version_tag VARCHAR(60) NOT NULL,
    dataset_version_tag VARCHAR(60) NOT NULL,
    total_samples_evaluated INTEGER NOT NULL DEFAULT 0,
    colombian_dishes_count INTEGER NOT NULL DEFAULT 0,
    low_confidence_prioritized_count INTEGER NOT NULL DEFAULT 0,
    overall_gram_mape_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    colombian_dish_accuracy_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    category_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    triggered_by VARCHAR(60) NOT NULL DEFAULT 'SCHEDULED_PIPELINE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_checkup_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkup_type VARCHAR(50) NOT NULL DEFAULT 'ANNUAL_BLOODWORK',
    completed_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    hemograma_ok BOOLEAN NOT NULL DEFAULT TRUE,
    ferritin_ng_ml NUMERIC(6,1) DEFAULT 65.0,
    vitamin_d_ng_ml NUMERIC(5,1) DEFAULT 38.0,
    tsh_uiu_ml NUMERIC(4,2) DEFAULT 1.85,
    fasting_glucose_mg_dl NUMERIC(5,1) DEFAULT 86.0,
    lipid_profile_ok BOOLEAN NOT NULL DEFAULT TRUE,
    ecg_stress_test_ok BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_meal_plans (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    plan_name VARCHAR(160) NOT NULL,
    days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    grocery_list_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_daily_kcal INTEGER NOT NULL DEFAULT 2450,
    target_daily_protein_g NUMERIC(5,1) NOT NULL DEFAULT 168.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
