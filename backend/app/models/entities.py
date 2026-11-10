import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(50), default="email")
    privacy_consent_ley1581: Mapped[bool] = mapped_column(Boolean, default=True)
    consented_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    sex: Mapped[str] = mapped_column(String(10), nullable=False)  # 'M' | 'F'
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    current_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    current_body_fat_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    bf_measurement_method: Mapped[str] = mapped_column(String(40), default="BIOIMPEDANCIA")
    target_body_fat_pct: Mapped[float] = mapped_column(Float, nullable=False)
    activity_level: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    target_weekly_loss_pct: Mapped[float] = mapped_column(Float, default=0.5)
    carb_cycling_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    protein_g_per_kg: Mapped[float] = mapped_column(Float, default=2.1)
    calorie_backfill_ratio: Mapped[float] = mapped_column(Float, default=0.60)
    injuries_or_restrictions: Mapped[str] = mapped_column(Text, default="")
    primary_sport_focus: Mapped[str] = mapped_column(String(60), default="HYBRID_GYM_RUNNING")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, onupdate=_utc_now)


class NutritionTarget(Base):
    __tablename__ = "nutrition_targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    formula_used: Mapped[str] = mapped_column(String(40), nullable=False)
    lean_body_mass_kg: Mapped[float] = mapped_column(Float, nullable=False)
    fat_mass_kg: Mapped[float] = mapped_column(Float, nullable=False)
    bmr_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    tdee_base_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    tdee_lower_bound_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    tdee_upper_bound_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    target_daily_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    training_day_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    rest_day_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    min_safe_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_target_g: Mapped[int] = mapped_column(Integer, nullable=False)
    fat_target_g: Mapped[int] = mapped_column(Integer, nullable=False)
    carbs_training_day_g: Mapped[int] = mapped_column(Integer, nullable=False)
    carbs_rest_day_g: Mapped[int] = mapped_column(Integer, nullable=False)
    fiber_target_g: Mapped[int] = mapped_column(Integer, nullable=False)
    water_target_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_steps_target: Mapped[int] = mapped_column(Integer, default=10000)
    warnings_json: Mapped[str] = mapped_column(Text, default="[]")
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    name_es: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    region: Mapped[str] = mapped_column(String(20), default="CO")  # 'CO' | 'GLOBAL'
    source: Mapped[str] = mapped_column(String(40), default="COLOMBIA_CORE")
    barcode_ean13: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    serving_label: Mapped[str] = mapped_column(String(100), default="1 porción (100g)")
    serving_weight_g: Mapped[float] = mapped_column(Float, default=100.0)
    kcal_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g_per_100g: Mapped[float] = mapped_column(Float, default=0.0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    servings: Mapped[int] = mapped_column(Integer, default=1)
    total_weight_g: Mapped[float] = mapped_column(Float, default=100.0)
    kcal_per_serving: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g_per_serving: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g_per_serving: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g_per_serving: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g_per_serving: Mapped[float] = mapped_column(Float, default=0.0)
    ingredients_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    log_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(30), nullable=False)  # DESAYUNO, ALMUERZO, CENA, PRE_ENTRENO, POST_ENTRENO, SNACK
    food_item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    recipe_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    custom_food_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity_g: Mapped[float] = mapped_column(Float, nullable=False)
    portion_description: Mapped[str] = mapped_column(String(100), default="Gramos")
    kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g: Mapped[float] = mapped_column(Float, default=0.0)
    client_mutation_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    modality: Mapped[str] = mapped_column(String(30), nullable=False)  # STRENGTH, RUNNING, HYROX, CYCLING, SWIMMING, MOBILITY
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    session_rpe: Mapped[int] = mapped_column(Integer, default=7)
    internal_load_au: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_kcal_burned: Mapped[int] = mapped_column(Integer, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    avg_pace_sec_per_km: Mapped[int] = mapped_column(Integer, default=0)
    avg_hr_bpm: Mapped[int] = mapped_column(Integer, default=0)
    elevation_gain_m: Mapped[int] = mapped_column(Integer, default=0)
    strength_sets_json: Mapped[str] = mapped_column(Text, default="[]")
    notes: Mapped[str] = mapped_column(Text, default="")
    client_mutation_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    metric_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, default=0)
    steps_count: Mapped[int] = mapped_column(Integer, default=0)
    sleep_hours: Mapped[float] = mapped_column(Float, default=7.5)
    resting_hr_bpm: Mapped[int] = mapped_column(Integer, default=54)
    hrv_ms: Mapped[float] = mapped_column(Float, default=68.0)
    active_kcal_extra: Mapped[int] = mapped_column(Integer, default=0)
    sync_source: Mapped[str] = mapped_column(String(50), default="MANUAL")
    day_type: Mapped[str] = mapped_column(String(20), default="TRAINING")


class BodyCheckin(Base):
    __tablename__ = "body_checkins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    checkin_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    trend_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_pct: Mapped[float] = mapped_column(Float, nullable=False)
    bf_method: Mapped[str] = mapped_column(String(40), nullable=False)  # DEXA, PLIEGUES, BIOIMPEDANCIA, VISUAL
    measurement_conditions: Mapped[str] = mapped_column(String(60), default="AYUNAS_MANANA")
    lean_mass_kg: Mapped[float] = mapped_column(Float, nullable=False)
    fat_mass_kg: Mapped[float] = mapped_column(Float, nullable=False)
    waist_cm: Mapped[float] = mapped_column(Float, nullable=False)
    hip_cm: Mapped[float] = mapped_column(Float, default=0.0)
    chest_cm: Mapped[float] = mapped_column(Float, default=0.0)
    arm_cm: Mapped[float] = mapped_column(Float, default=0.0)
    thigh_cm: Mapped[float] = mapped_column(Float, default=0.0)
    energy_level: Mapped[int] = mapped_column(Integer, default=4)
    sleep_quality: Mapped[int] = mapped_column(Integer, default=4)
    strength_performance: Mapped[int] = mapped_column(Integer, default=4)
    notes: Mapped[str] = mapped_column(Text, default="")
    assessment_status: Mapped[str] = mapped_column(String(40), nullable=False)
    assessment_summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    calorie_adjustment_kcal: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class AiFoodPrediction(Base):
    __tablename__ = "ai_food_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    image_data_preview: Mapped[str] = mapped_column(Text, default="")
    model_version: Mapped[str] = mapped_column(String(80), default="gemini-2.5-flash-co-v1")
    reference_object: Mapped[str] = mapped_column(String(40), default="PLATE_26CM")
    dish_name_detected: Mapped[str] = mapped_column(String(200), nullable=False)
    overall_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    raw_ai_prediction_json: Mapped[str] = mapped_column(Text, default="[]")
    user_corrected_items_json: Mapped[str] = mapped_column(Text, default="[]")
    estimation_error_pct: Mapped[float] = mapped_column(Float, default=0.0)
    is_colombian_dish: Mapped[bool] = mapped_column(Boolean, default=True)
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    user_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    dataset_split: Mapped[str] = mapped_column(String(20), default="TRAIN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class ExternalIntegration(Base):
    __tablename__ = "external_integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="CONNECTED")
    shortcut_api_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)
    synced_activities_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh_key: Mapped[str] = mapped_column(String(255), default="")
    auth_key: Mapped[str] = mapped_column(String(255), default="")
    device_platform: Mapped[str] = mapped_column(String(50), default="IOS_STANDALONE_PWA")
    protein_reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    checkin_reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    deload_alert_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_fallback_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class CompetitionEvent(Base):
    __tablename__ = "competition_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), default="HALF_MARATHON")
    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    distance_km: Mapped[float] = mapped_column(Float, default=21.1)
    elevation_gain_m: Mapped[int] = mapped_column(Integer, default=150)
    goal_time_minutes: Mapped[int] = mapped_column(Integer, default=105)
    priority_level: Mapped[str] = mapped_column(String(5), default="A")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class MlRetrainingRun(Base):
    __tablename__ = "ml_retraining_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    model_version_tag: Mapped[str] = mapped_column(String(60), nullable=False)
    dataset_version_tag: Mapped[str] = mapped_column(String(60), nullable=False)
    total_samples_evaluated: Mapped[int] = mapped_column(Integer, default=0)
    colombian_dishes_count: Mapped[int] = mapped_column(Integer, default=0)
    low_confidence_prioritized_count: Mapped[int] = mapped_column(Integer, default=0)
    overall_gram_mape_pct: Mapped[float] = mapped_column(Float, default=0.0)
    colombian_dish_accuracy_pct: Mapped[float] = mapped_column(Float, default=0.0)
    category_metrics_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED")
    triggered_by: Mapped[str] = mapped_column(String(60), default="SCHEDULED_PIPELINE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class MedicalCheckupRecord(Base):
    __tablename__ = "medical_checkup_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    checkup_type: Mapped[str] = mapped_column(String(50), default="ANNUAL_BLOODWORK")
    completed_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    hemograma_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    ferritin_ng_ml: Mapped[float | None] = mapped_column(Float, nullable=True, default=65.0)
    vitamin_d_ng_ml: Mapped[float | None] = mapped_column(Float, nullable=True, default=38.0)
    tsh_uiu_ml: Mapped[float | None] = mapped_column(Float, nullable=True, default=1.85)
    fasting_glucose_mg_dl: Mapped[float | None] = mapped_column(Float, nullable=True, default=86.0)
    lipid_profile_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    ecg_stress_test_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)


class WeeklyMealPlanRecord(Base):
    __tablename__ = "weekly_meal_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    plan_name: Mapped[str] = mapped_column(String(160), nullable=False)
    days_json: Mapped[str] = mapped_column(Text, default="[]")
    grocery_list_json: Mapped[str] = mapped_column(Text, default="[]")
    target_daily_kcal: Mapped[int] = mapped_column(Integer, default=2450)
    target_daily_protein_g: Mapped[float] = mapped_column(Float, default=168.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now)



