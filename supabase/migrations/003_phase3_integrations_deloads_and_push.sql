-- ============================================================================
-- FitProIA - Migración Fase 3 (Supabase PostgreSQL)
-- Recálculo Dinámico por Actividad, Integraciones (Strava, Garmin, Archivos
-- .FIT/.GPX/.TCX/.XML, Atajos de iOS), Carga/Deloads (ACWR, HRV) y Web Push.
-- ============================================================================

-- 1. Ampliar daily_metrics con marcadores de recuperación (FC reposo, VFC/HRV, kcal activas)
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS resting_hr_bpm INT DEFAULT 54;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hrv_ms FLOAT DEFAULT 68.0;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS active_kcal_extra INT DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50) DEFAULT 'MANUAL';

-- 2. Conexiones de Proveedores Externos (Strava, Garmin, Polar, Oura, iOS Shortcuts)
CREATE TABLE IF NOT EXISTS external_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(40) NOT NULL, -- STRAVA | GARMIN | POLAR | OURA | IOS_SHORTCUT | APPLE_HEALTH_FILE
    status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
    shortcut_api_key VARCHAR(120),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    synced_activities_count INT NOT NULL DEFAULT 0,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, provider)
);

-- 3. Suscripciones Web Push (iOS 16.4+ Standalone & Android/Desktop) y Respaldo
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) DEFAULT '',
    auth_key VARCHAR(255) DEFAULT '',
    device_platform VARCHAR(50) DEFAULT 'IOS_STANDALONE_PWA',
    protein_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    checkin_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    deload_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
