-- ============================================================================
-- FitProIA - Migración Fase 2 (Supabase PostgreSQL)
-- Detección de Comida por Foto (Google Gemini API + Human-in-the-Loop)
-- y Escáner de Código de Barras (Open Food Facts + Caché Local)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_food_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_data_preview TEXT DEFAULT '',
    model_version VARCHAR(80) NOT NULL DEFAULT 'gemini-2.5-flash-co-v1',
    reference_object VARCHAR(40) NOT NULL DEFAULT 'PLATE_26CM',
    dish_name_detected VARCHAR(200) NOT NULL,
    overall_confidence FLOAT NOT NULL CHECK (overall_confidence BETWEEN 0.0 AND 1.0),
    raw_ai_prediction_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_corrected_items_json JSONB DEFAULT '[]'::jsonb,
    estimation_error_pct FLOAT DEFAULT 0.0,
    is_colombian_dish BOOLEAN NOT NULL DEFAULT TRUE,
    flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    user_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    dataset_split VARCHAR(20) NOT NULL DEFAULT 'TRAIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_user ON ai_food_predictions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode_ean13);
