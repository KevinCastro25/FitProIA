from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# --- Auth & Usuario ---
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2, max_length=150)
    privacy_consent_ley1581: bool = True


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str


# --- Perfil y Cálculo Nutricional ---
class UserProfileInput(BaseModel):
    sex: str = Field(pattern="^(M|F)$", description="Sexo biológico: M o F")
    age: int = Field(ge=14, le=100)
    height_cm: float = Field(ge=120, le=230)
    current_weight_kg: float = Field(ge=35, le=250)
    current_body_fat_pct: Optional[float] = Field(default=None, ge=3, le=60)
    bf_measurement_method: str = Field(
        default="BIOIMPEDANCIA",
        description="DEXA | PLIEGUES | BIOIMPEDANCIA | ESTIMACION_VISUAL",
    )
    target_body_fat_pct: float = Field(ge=4, le=45)
    activity_level: str = Field(
        default="ACTIVE",
        description="SEDENTARY | LIGHT | MODERATE | ACTIVE | ATHLETE",
    )
    target_weekly_loss_pct: float = Field(
        default=0.5, ge=0.0, le=1.2, description="% de peso corporal a perder por semana (sugerido 0.5-0.8%)"
    )
    carb_cycling_enabled: bool = True
    protein_g_per_kg: float = Field(default=2.1, ge=1.6, le=2.8)
    calorie_backfill_ratio: float = Field(default=0.60, ge=0.0, le=1.0)
    injuries_or_restrictions: str = ""
    primary_sport_focus: str = "HYBRID_GYM_RUNNING"


class NutritionTargetsResponse(BaseModel):
    formula_used: str
    lean_body_mass_kg: float
    fat_mass_kg: float
    bmr_kcal: int
    tdee_base_kcal: int
    tdee_lower_bound_kcal: int
    tdee_upper_bound_kcal: int
    target_daily_kcal: int
    training_day_kcal: int
    rest_day_kcal: int
    min_safe_kcal: int
    protein_target_g: int
    protein_per_meal_recommended_g: int
    fat_target_g: int
    carbs_training_day_g: int
    carbs_rest_day_g: int
    fiber_target_g: int
    water_target_ml: int
    daily_steps_target: int
    estimated_weeks_to_goal: int
    estimated_goal_date: date
    warnings: list[str]


class ProfileAndTargetsResponse(BaseModel):
    profile: UserProfileInput
    targets: NutritionTargetsResponse


# --- Alimentos y Recetas ---
class FoodItemCreate(BaseModel):
    name_es: str = Field(min_length=2, max_length=200)
    category: str = "Plato Colombiano / Personalizado"
    region: str = "CO"
    barcode_ean13: Optional[str] = None
    serving_label: str = "1 porción (100g)"
    serving_weight_g: float = Field(default=100.0, gt=0)
    kcal_per_100g: float = Field(ge=0)
    protein_g_per_100g: float = Field(ge=0)
    carbs_g_per_100g: float = Field(ge=0)
    fat_g_per_100g: float = Field(ge=0)
    fiber_g_per_100g: float = Field(default=0.0, ge=0)


class FoodItemResponse(FoodItemCreate):
    id: str
    source: str
    is_verified: bool


class RecipeIngredientInput(BaseModel):
    food_name: str
    weight_g: float = Field(gt=0)
    kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float = Field(default=0.0, ge=0)


class RecipeCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    servings: int = Field(default=1, ge=1)
    ingredients: list[RecipeIngredientInput]


class RecipeResponse(BaseModel):
    id: str
    name: str
    servings: int
    total_weight_g: float
    kcal_per_serving: int
    protein_g_per_serving: float
    carbs_g_per_serving: float
    fat_g_per_serving: float
    fiber_g_per_serving: float
    ingredients: list[RecipeIngredientInput]


# --- Registro de Comidas ---
class MealLogCreate(BaseModel):
    log_date: date
    meal_type: str = Field(
        description="DESAYUNO | ALMUERZO | CENA | PRE_ENTRENO | POST_ENTRENO | SNACK"
    )
    food_item_id: Optional[str] = None
    recipe_id: Optional[str] = None
    custom_food_name: str
    quantity_g: float = Field(gt=0)
    portion_description: str = "Gramos"
    kcal: int = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float = Field(default=0.0, ge=0)
    client_mutation_id: Optional[str] = None


class MealLogResponse(MealLogCreate):
    id: str
    logged_at: datetime


# --- Entrenamientos (Fuerza y Cardio) ---
class StrengthSetSchema(BaseModel):
    exercise_name: str
    muscle_group: str = "PIERNA"
    set_number: int = 1
    reps: int = Field(ge=1)
    weight_kg: float = Field(ge=0)
    rpe: float = Field(default=8.0, ge=1.0, le=10.0)


class WorkoutCreate(BaseModel):
    session_date: date
    title: str
    modality: str = Field(
        description="STRENGTH | RUNNING | HYROX | CYCLING | SWIMMING | MOBILITY"
    )
    duration_minutes: int = Field(gt=0)
    session_rpe: int = Field(default=7, ge=1, le=10)
    distance_km: float = Field(default=0.0, ge=0)
    avg_pace_sec_per_km: int = Field(default=0, ge=0)
    avg_hr_bpm: int = Field(default=0, ge=0)
    elevation_gain_m: int = Field(default=0, ge=0)
    strength_sets: list[StrengthSetSchema] = []
    notes: str = ""
    client_mutation_id: Optional[str] = None


class WorkoutResponse(BaseModel):
    id: str
    session_date: date
    title: str
    modality: str
    duration_minutes: int
    session_rpe: int
    internal_load_au: int
    estimated_kcal_burned: int
    distance_km: float
    avg_pace_sec_per_km: int
    avg_hr_bpm: int
    elevation_gain_m: int
    strength_sets: list[StrengthSetSchema]
    notes: str


# --- Métricas Diarias y Resumen del Día ---
class DailyMetricsUpdate(BaseModel):
    metric_date: date
    water_ml: Optional[int] = Field(default=None, ge=0)
    steps_count: Optional[int] = Field(default=None, ge=0)
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    resting_hr_bpm: Optional[int] = Field(default=None, ge=30, le=200)
    hrv_ms: Optional[float] = Field(default=None, ge=10, le=250)
    day_type: Optional[str] = Field(default=None, description="TRAINING | REST")


# --- Chequeos de Composición Corporal ---
class BodyCheckinCreate(BaseModel):
    checkin_date: date
    weight_kg: float = Field(ge=35, le=250)
    body_fat_pct: float = Field(ge=3, le=60)
    bf_method: str = Field(
        default="BIOIMPEDANCIA",
        description="DEXA | PLIEGUES | BIOIMPEDANCIA | ESTIMACION_VISUAL",
    )
    measurement_conditions: str = Field(
        default="AYUNAS_MANANA",
        description="AYUNAS_MANANA | POST_ENTRENO | TARDE_HIDRATADO",
    )
    waist_cm: float = Field(ge=45, le=180)
    hip_cm: float = Field(default=0.0, ge=0)
    chest_cm: float = Field(default=0.0, ge=0)
    arm_cm: float = Field(default=0.0, ge=0)
    thigh_cm: float = Field(default=0.0, ge=0)
    energy_level: int = Field(default=4, ge=1, le=5)
    sleep_quality: int = Field(default=4, ge=1, le=5)
    strength_performance: int = Field(default=4, ge=1, le=5)
    notes: str = ""


class BodyCheckinResponse(BaseModel):
    id: str
    checkin_date: date
    weight_kg: float
    trend_weight_kg: float
    body_fat_pct: float
    bf_method: str
    measurement_conditions: str
    lean_mass_kg: float
    fat_mass_kg: float
    waist_cm: float
    hip_cm: float
    chest_cm: float
    arm_cm: float
    thigh_cm: float
    energy_level: int
    sleep_quality: int
    strength_performance: int
    notes: str
    assessment_status: str
    assessment_summary: str
    recommended_action: str
    calorie_adjustment_kcal: int
    method_margin_warning: str


# --- Fase 2: Escáner de Código de Barras y Detección de Comida por Foto (IA) ---
class BarcodeLookupResponse(BaseModel):
    found: bool
    lookup_source: str
    barcode_ean13: str
    food: Optional[FoodItemResponse] = None


class AiDetectedFoodItem(BaseModel):
    name_es: str
    estimated_grams: float = Field(gt=0)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    kcal: int = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float = Field(default=0.0, ge=0)
    kcal_per_100g: float = Field(default=150.0, ge=0)
    protein_g_per_100g: float = Field(default=10.0, ge=0)
    carbs_g_per_100g: float = Field(default=15.0, ge=0)
    fat_g_per_100g: float = Field(default=5.0, ge=0)
    fiber_g_per_100g: float = Field(default=2.0, ge=0)


class AiPlateAnalysisRequest(BaseModel):
    image_base64: str = Field(
        default="",
        description="Imagen JPEG/WebP comprimida en el cliente (máx 1280px)",
    )
    reference_object: str = Field(
        default="PLATE_26CM",
        description="PLATE_26CM | HAND | CUTLERY | NONE",
    )
    user_hint: str = Field(
        default="",
        description="Pista opcional o descripción rápida del plato (ej. bandeja paisa, ajiaco, desayuno)",
    )


class AiPlateAnalysisResponse(BaseModel):
    prediction_id: str
    model_version: str
    dish_name: str
    reference_object: str
    overall_confidence: float
    is_colombian_dish: bool
    flagged_for_review: bool
    items: list[AiDetectedFoodItem]
    total_kcal: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float
    disclaimer: str
    error_message: Optional[str] = None


class AiPredictionConfirmRequest(BaseModel):
    log_date: date
    meal_type: str = Field(
        default="ALMUERZO",
        description="DESAYUNO | ALMUERZO | CENA | PRE_ENTRENO | POST_ENTRENO | SNACK",
    )
    corrected_items: list[AiDetectedFoodItem]
    client_mutation_id: Optional[str] = None


class AiPredictionConfirmResponse(BaseModel):
    prediction_id: str
    estimation_error_pct: float
    flagged_for_review: bool
    dataset_split: str
    logged_meals_count: int
    total_kcal_logged: int
    total_protein_g_logged: float


# --- Fase 3: Integraciones (Atajos iOS, Strava/Garmin, Archivos), Deloads y Web Push ---
class IosShortcutSyncRequest(BaseModel):
    sync_date: Optional[date] = None
    steps_count: int = Field(default=0, ge=0)
    active_kcal: int = Field(default=0, ge=0)
    sleep_hours: float = Field(default=7.5, ge=0, le=24)
    resting_hr_bpm: int = Field(default=54, ge=30, le=200)
    hrv_ms: float = Field(default=68.0, ge=5, le=250)
    workout_title: Optional[str] = None
    workout_modality: str = "RUNNING"
    workout_duration_min: int = Field(default=0, ge=0)
    workout_distance_km: float = Field(default=0.0, ge=0)


class FileImportJsonRequest(BaseModel):
    filename: str
    content_text: str
    session_date: Optional[date] = None


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    p256dh_key: str = ""
    auth_key: str = ""
    device_platform: str = "IOS_STANDALONE_PWA"
    protein_reminder_enabled: bool = True
    checkin_reminder_enabled: bool = True
    deload_alert_enabled: bool = True
    email_fallback_enabled: bool = True


# --- Fase 4: Competencias (RED-S), Pipeline ML, Recomendaciones Médicas y Extras ---
class CompetitionEventCreateRequest(BaseModel):
    name: str
    event_type: str = Field(
        default="HALF_MARATHON",
        description="HALF_MARATHON | MARATHON | ULTRA | HYROX | TEN_K | TRIATHLON",
    )
    event_date: date
    distance_km: float = Field(default=21.1, gt=0)
    elevation_gain_m: int = Field(default=150, ge=0)
    goal_time_minutes: int = Field(default=105, gt=0)
    priority_level: str = "A"
    notes: str = ""


class CompetitionEventResponse(BaseModel):
    id: str
    name: str
    event_type: str
    event_date: date
    distance_km: float
    elevation_gain_m: int
    goal_time_minutes: int
    priority_level: str
    notes: str
    periodization_plan: dict


class MedicalSafetyEvaluateRequest(BaseModel):
    recent_weekly_weight_loss_kg: float = Field(default=0.35, ge=0.0)
    reported_symptoms: list[str] = Field(default_factory=list)
    ferritin_ng_ml: Optional[float] = 64.0
    vitamin_d_ng_ml: Optional[float] = 36.0


class SmartMealSuggestionRequest(BaseModel):
    remaining_kcal: int = Field(default=600)
    remaining_protein_g: float = Field(default=48.0)
    remaining_carbs_g: float = Field(default=55.0)
    remaining_fat_g: float = Field(default=16.0)


class CoachQuestionRequest(BaseModel):
    question: str
    current_body_fat_pct: Optional[float] = 15.8
    target_body_fat_pct: Optional[float] = 11.5
    lean_body_mass_kg: Optional[float] = 64.3
    current_weight_kg: Optional[float] = 76.4
    protein_target_g: Optional[float] = 168.0
    training_day_kcal: Optional[int] = 2480
    rest_day_kcal: Optional[int] = 2150
    acwr_ratio: Optional[float] = 1.08
    next_competition_name: Optional[str] = "Media Maratón de Bogotá 21K"



