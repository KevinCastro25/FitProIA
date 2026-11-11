import json
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.entities import (
    User,
    UserProfile,
    NutritionTarget,
    FoodItem,
    Recipe,
    MealLog,
    WorkoutSession,
    DailyMetric,
    BodyCheckin,
    AiFoodPrediction,
    ExternalIntegration,
    PushSubscription,
    CompetitionEvent,
    MlRetrainingRun,
    MedicalCheckupRecord,
    WeeklyMealPlanRecord,
)
from app.schemas.api_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileInput,
    NutritionTargetsResponse,
    ProfileAndTargetsResponse,
    FoodItemCreate,
    FoodItemResponse,
    RecipeCreateRequest,
    RecipeResponse,
    MealLogCreate,
    MealLogResponse,
    WorkoutCreate,
    WorkoutResponse,
    DailyMetricsUpdate,
    BodyCheckinCreate,
    BodyCheckinResponse,
    BarcodeLookupResponse,
    AiDetectedFoodItem,
    AiPlateAnalysisRequest,
    AiPlateAnalysisResponse,
    AiPredictionConfirmRequest,
    AiPredictionConfirmResponse,
    IosShortcutSyncRequest,
    FileImportJsonRequest,
    PushSubscriptionRequest,
    CompetitionEventCreateRequest,
    CompetitionEventResponse,
    MedicalSafetyEvaluateRequest,
    SmartMealSuggestionRequest,
    CoachQuestionRequest,
)
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_supabase_token,
)
from app.services.nutrition_engine import (
    calculate_nutrition_plan,
    estimate_workout_calories,
)
from app.services.checkin_evaluator import evaluate_body_checkin, METHOD_ERROR_WARNINGS
from app.services.barcode_service import lookup_barcode_ean
from app.services.ai_vision_service import analyze_plate_photo, calculate_mape_error
from app.services.activity_integrations import (
    parse_uploaded_sport_file,
    compute_dynamic_calorie_budget,
)
from app.services.recovery_deload_engine import evaluate_training_load_and_deload
from app.services.competition_periodization_engine import (
    build_competition_periodization_plan,
)
from app.services.ml_retraining_pipeline import execute_vision_retraining_pipeline
from app.services.medical_and_coach_service import (
    evaluate_medical_safety_and_checkups,
    generate_smart_meal_suggestions,
    generate_weekly_plan_and_grocery_list,
    answer_coach_question,
)

api_router = APIRouter()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
) -> User:
    """
    Resuelve el usuario autenticado:
    1) Token propio (JWT de /auth/login) o 2) token de Supabase Auth (email/Google/Apple),
    creando el usuario local en el primer ingreso.
    Si REQUIRE_AUTH=false (desarrollo local) y no hay token, usa el perfil demo 'atleta@fitproia.co'.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        payload = decode_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user:
                return user

        sb = verify_supabase_token(token)
        if sb:
            user = db.query(User).filter(User.email == sb["email"]).first()
            if not user:
                user = User(
                    id=sb["id"],
                    email=sb["email"],
                    full_name=sb["full_name"],
                    hashed_password="",  # la contraseña vive en Supabase Auth
                    auth_provider=sb["provider"],
                    privacy_consent_ley1581=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user

    if settings.REQUIRE_AUTH:
        raise HTTPException(
            status_code=401,
            detail="Sesión inválida o expirada. Inicia sesión de nuevo.",
        )

    default_user = db.query(User).filter(User.email == "atleta@fitproia.co").first()
    if not default_user:
        default_user = db.query(User).first()
    if not default_user:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    return default_user


# ============================================================================
# 1. AUTENTICACIÓN Y PRIVACIDAD (LEY 1581 DE COLOMBIA - HABEAS DATA)
# ============================================================================
@api_router.post("/auth/register", response_model=TokenResponse, tags=["Autenticación & Habeas Data"])
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    if not payload.privacy_consent_ley1581:
        raise HTTPException(
            status_code=400,
            detail="Debes aceptar el consentimiento de tratamiento de datos sensibles de salud (Ley 1581 de 2012).",
        )
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado.")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        privacy_consent_ley1581=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Crear perfil inicial por defecto
    default_prof = UserProfileInput(
        sex="M",
        age=29,
        height_cm=175.0,
        current_weight_kg=75.0,
        current_body_fat_pct=16.0,
        bf_measurement_method="BIOIMPEDANCIA",
        target_body_fat_pct=12.0,
        activity_level="ACTIVE",
        target_weekly_loss_pct=0.5,
    )
    _save_profile_and_targets(db, user.id, default_prof)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@api_router.post("/auth/login", response_model=TokenResponse, tags=["Autenticación & Habeas Data"])
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
    )


@api_router.delete("/users/me", tags=["Autenticación & Habeas Data"])
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Derecho de supresión / olvido conforme a la Ley 1581 de 2012."""
    db.delete(current_user)
    db.commit()
    return {"status": "deleted", "message": "Cuenta y datos de salud eliminados permanentemente."}


# ============================================================================
# 2. PERFIL ANTROPOMÉTRICO Y MOTOR DE CÁLCULO NUTRICIONAL
# ============================================================================
def _save_profile_and_targets(
    db: Session, user_id: str, payload: UserProfileInput
) -> ProfileAndTargetsResponse:
    prof = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not prof:
        prof = UserProfile(user_id=user_id, **payload.model_dump())
        db.add(prof)
    else:
        for k, v in payload.model_dump().items():
            setattr(prof, k, v)

    calc = calculate_nutrition_plan(payload)
    target = db.query(NutritionTarget).filter(NutritionTarget.user_id == user_id).first()
    target_data = {
        "formula_used": calc.formula_used,
        "lean_body_mass_kg": calc.lean_body_mass_kg,
        "fat_mass_kg": calc.fat_mass_kg,
        "bmr_kcal": calc.bmr_kcal,
        "tdee_base_kcal": calc.tdee_base_kcal,
        "tdee_lower_bound_kcal": calc.tdee_lower_bound_kcal,
        "tdee_upper_bound_kcal": calc.tdee_upper_bound_kcal,
        "target_daily_kcal": calc.target_daily_kcal,
        "training_day_kcal": calc.training_day_kcal,
        "rest_day_kcal": calc.rest_day_kcal,
        "min_safe_kcal": calc.min_safe_kcal,
        "protein_target_g": calc.protein_target_g,
        "fat_target_g": calc.fat_target_g,
        "carbs_training_day_g": calc.carbs_training_day_g,
        "carbs_rest_day_g": calc.carbs_rest_day_g,
        "fiber_target_g": calc.fiber_target_g,
        "water_target_ml": calc.water_target_ml,
        "daily_steps_target": calc.daily_steps_target,
        "warnings_json": json.dumps(calc.warnings, ensure_ascii=False),
    }
    if not target:
        target = NutritionTarget(user_id=user_id, **target_data)
        db.add(target)
    else:
        for k, v in target_data.items():
            setattr(target, k, v)

    db.commit()
    return ProfileAndTargetsResponse(profile=payload, targets=calc)


@api_router.get("/profile", response_model=ProfileAndTargetsResponse, tags=["Perfil & Nutrición"])
def get_profile_and_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not prof:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    prof_input = UserProfileInput(
        sex=prof.sex,
        age=prof.age,
        height_cm=prof.height_cm,
        current_weight_kg=prof.current_weight_kg,
        current_body_fat_pct=prof.current_body_fat_pct,
        bf_measurement_method=prof.bf_measurement_method,
        target_body_fat_pct=prof.target_body_fat_pct,
        activity_level=prof.activity_level,
        target_weekly_loss_pct=prof.target_weekly_loss_pct,
        carb_cycling_enabled=prof.carb_cycling_enabled,
        protein_g_per_kg=prof.protein_g_per_kg,
        calorie_backfill_ratio=prof.calorie_backfill_ratio,
        injuries_or_restrictions=prof.injuries_or_restrictions or "",
        primary_sport_focus=prof.primary_sport_focus or "HYBRID_GYM_RUNNING",
    )
    calc = calculate_nutrition_plan(prof_input)
    return ProfileAndTargetsResponse(profile=prof_input, targets=calc)


@api_router.put("/profile", response_model=ProfileAndTargetsResponse, tags=["Perfil & Nutrición"])
def update_profile_and_recalculate(
    payload: UserProfileInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _save_profile_and_targets(db, current_user.id, payload)


@api_router.post(
    "/nutrition-targets/calculate",
    response_model=NutritionTargetsResponse,
    tags=["Perfil & Nutrición"],
)
def preview_nutrition_calculation(payload: UserProfileInput):
    """Simulador directo de Katch-McArdle / Mifflin-St Jeor sin persistir cambios."""
    return calculate_nutrition_plan(payload)


# ============================================================================
# 3. CATÁLOGO DE ALIMENTOS (COLOMBIA + USDA + OPEN FOOD FACTS) Y RECETAS
# ============================================================================
@api_router.get("/foods", response_model=list[FoodItemResponse], tags=["Alimentos & Recetas"])
def search_foods(
    q: str = Query(default="", description="Texto a buscar (ej. arepa, bandeja, pollo)"),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(FoodItem)
    if q.strip():
        query = query.filter(FoodItem.name_es.ilike(f"%{q.strip()}%"))
    if category:
        query = query.filter(FoodItem.category == category)

    items = query.order_by(FoodItem.name_es.asc()).limit(60).all()
    return [
        FoodItemResponse(
            id=f.id,
            name_es=f.name_es,
            category=f.category,
            region=f.region,
            source=f.source,
            barcode_ean13=f.barcode_ean13,
            serving_label=f.serving_label,
            serving_weight_g=f.serving_weight_g,
            kcal_per_100g=f.kcal_per_100g,
            protein_g_per_100g=f.protein_g_per_100g,
            carbs_g_per_100g=f.carbs_g_per_100g,
            fat_g_per_100g=f.fat_g_per_100g,
            fiber_g_per_100g=f.fiber_g_per_100g,
            is_verified=f.is_verified,
        )
        for f in items
    ]


@api_router.post("/foods", response_model=FoodItemResponse, tags=["Alimentos & Recetas"])
def create_custom_food(
    payload: FoodItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = FoodItem(
        **payload.model_dump(),
        source="USER_CUSTOM",
        is_verified=True,
        created_by_user_id=current_user.id,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return FoodItemResponse(
        id=food.id,
        source=food.source,
        is_verified=food.is_verified,
        **payload.model_dump(),
    )


@api_router.get("/recipes", response_model=list[RecipeResponse], tags=["Alimentos & Recetas"])
def list_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipes = db.query(Recipe).filter(Recipe.user_id == current_user.id).all()
    result = []
    for r in recipes:
        result.append(
            RecipeResponse(
                id=r.id,
                name=r.name,
                servings=r.servings,
                total_weight_g=r.total_weight_g,
                kcal_per_serving=r.kcal_per_serving,
                protein_g_per_serving=r.protein_g_per_serving,
                carbs_g_per_serving=r.carbs_g_per_serving,
                fat_g_per_serving=r.fat_g_per_serving,
                fiber_g_per_serving=r.fiber_g_per_serving,
                ingredients=json.loads(r.ingredients_json or "[]"),
            )
        )
    return result


@api_router.post("/recipes", response_model=RecipeResponse, tags=["Alimentos & Recetas"])
def create_recipe(
    payload: RecipeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    servings = max(1, payload.servings)
    total_weight = sum(i.weight_g for i in payload.ingredients)
    total_kcal = sum(i.kcal for i in payload.ingredients)
    total_p = sum(i.protein_g for i in payload.ingredients)
    total_c = sum(i.carbs_g for i in payload.ingredients)
    total_f = sum(i.fat_g for i in payload.ingredients)
    total_fib = sum(i.fiber_g for i in payload.ingredients)

    recipe = Recipe(
        user_id=current_user.id,
        name=payload.name,
        servings=servings,
        total_weight_g=round(total_weight, 1),
        kcal_per_serving=int(round(total_kcal / servings)),
        protein_g_per_serving=round(total_p / servings, 1),
        carbs_g_per_serving=round(total_c / servings, 1),
        fat_g_per_serving=round(total_f / servings, 1),
        fiber_g_per_serving=round(total_fib / servings, 1),
        ingredients_json=json.dumps([i.model_dump() for i in payload.ingredients], ensure_ascii=False),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        servings=recipe.servings,
        total_weight_g=recipe.total_weight_g,
        kcal_per_serving=recipe.kcal_per_serving,
        protein_g_per_serving=recipe.protein_g_per_serving,
        carbs_g_per_serving=recipe.carbs_g_per_serving,
        fat_g_per_serving=recipe.fat_g_per_serving,
        fiber_g_per_serving=recipe.fiber_g_per_serving,
        ingredients=payload.ingredients,
    )


# ============================================================================
# 4. REGISTRO DE COMIDAS Y SINCRONIZACIÓN OFFLINE
# ============================================================================
@api_router.get("/meals", response_model=list[MealLogResponse], tags=["Registro de Comidas"])
def get_meals_by_date(
    log_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = log_date or date.today()
    meals = (
        db.query(MealLog)
        .filter(MealLog.user_id == current_user.id, MealLog.log_date == target_date)
        .order_by(MealLog.logged_at.asc())
        .all()
    )
    return [
        MealLogResponse(
            id=m.id,
            log_date=m.log_date,
            meal_type=m.meal_type,
            food_item_id=m.food_item_id,
            recipe_id=m.recipe_id,
            custom_food_name=m.custom_food_name,
            quantity_g=m.quantity_g,
            portion_description=m.portion_description,
            kcal=m.kcal,
            protein_g=m.protein_g,
            carbs_g=m.carbs_g,
            fat_g=m.fat_g,
            fiber_g=m.fiber_g,
            client_mutation_id=m.client_mutation_id,
            logged_at=m.logged_at,
        )
        for m in meals
    ]


@api_router.post("/meals", response_model=MealLogResponse, tags=["Registro de Comidas"])
def log_meal(
    payload: MealLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Idempotencia para cola offline de la PWA
    if payload.client_mutation_id:
        existing = (
            db.query(MealLog)
            .filter(MealLog.client_mutation_id == payload.client_mutation_id)
            .first()
        )
        if existing:
            return MealLogResponse(
                id=existing.id,
                log_date=existing.log_date,
                meal_type=existing.meal_type,
                food_item_id=existing.food_item_id,
                recipe_id=existing.recipe_id,
                custom_food_name=existing.custom_food_name,
                quantity_g=existing.quantity_g,
                portion_description=existing.portion_description,
                kcal=existing.kcal,
                protein_g=existing.protein_g,
                carbs_g=existing.carbs_g,
                fat_g=existing.fat_g,
                fiber_g=existing.fiber_g,
                client_mutation_id=existing.client_mutation_id,
                logged_at=existing.logged_at,
            )

    meal = MealLog(user_id=current_user.id, **payload.model_dump())
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return MealLogResponse(
        id=meal.id,
        logged_at=meal.logged_at,
        **payload.model_dump(),
    )


@api_router.delete("/meals/{meal_id}", tags=["Registro de Comidas"])
def delete_meal(
    meal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal = (
        db.query(MealLog)
        .filter(MealLog.id == meal_id, MealLog.user_id == current_user.id)
        .first()
    )
    if not meal:
        raise HTTPException(status_code=404, detail="Registro de comida no encontrado")
    db.delete(meal)
    db.commit()
    return {"status": "deleted", "id": meal_id}


# ============================================================================
# 5. ENTRENAMIENTOS (FUERZA, RUNNING, HYROX, CARDIO)
# ============================================================================
@api_router.get("/workouts", response_model=list[WorkoutResponse], tags=["Entrenamiento & Actividad"])
def list_workouts(
    days: int = Query(default=14, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.session_date >= since,
        )
        .order_by(WorkoutSession.session_date.desc())
        .all()
    )
    return [
        WorkoutResponse(
            id=w.id,
            session_date=w.session_date,
            title=w.title,
            modality=w.modality,
            duration_minutes=w.duration_minutes,
            session_rpe=w.session_rpe,
            internal_load_au=w.internal_load_au,
            estimated_kcal_burned=w.estimated_kcal_burned,
            distance_km=w.distance_km,
            avg_pace_sec_per_km=w.avg_pace_sec_per_km,
            avg_hr_bpm=w.avg_hr_bpm,
            elevation_gain_m=w.elevation_gain_m,
            strength_sets=json.loads(w.strength_sets_json or "[]"),
            notes=w.notes,
        )
        for w in sessions
    ]


@api_router.post("/workouts", response_model=WorkoutResponse, tags=["Entrenamiento & Actividad"])
def create_workout(
    payload: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    weight_kg = prof.current_weight_kg if prof else 75.0

    internal_load_au = payload.duration_minutes * (payload.session_rpe or 7)
    if payload.estimated_kcal_burned is not None and payload.estimated_kcal_burned > 0:
        final_kcal = payload.estimated_kcal_burned
    else:
        final_kcal = estimate_workout_calories(
            modality=payload.modality,
            duration_minutes=payload.duration_minutes,
            weight_kg=weight_kg,
            session_rpe=payload.session_rpe or 7,
            distance_km=payload.distance_km,
            avg_hr_bpm=payload.avg_hr_bpm,
        )

    workout = WorkoutSession(
        user_id=current_user.id,
        session_date=payload.session_date,
        title=payload.title,
        modality=payload.modality,
        duration_minutes=payload.duration_minutes,
        session_rpe=payload.session_rpe or 7,
        internal_load_au=internal_load_au,
        estimated_kcal_burned=final_kcal,
        distance_km=payload.distance_km,
        avg_pace_sec_per_km=payload.avg_pace_sec_per_km,
        avg_hr_bpm=payload.avg_hr_bpm,
        elevation_gain_m=payload.elevation_gain_m,
        strength_sets_json=json.dumps(
            [s.model_dump() for s in payload.strength_sets], ensure_ascii=False
        ),
        notes=payload.notes,
        client_mutation_id=payload.client_mutation_id,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)

    return WorkoutResponse(
        id=workout.id,
        session_date=workout.session_date,
        title=workout.title,
        modality=workout.modality,
        duration_minutes=workout.duration_minutes,
        session_rpe=workout.session_rpe,
        internal_load_au=workout.internal_load_au,
        estimated_kcal_burned=workout.estimated_kcal_burned,
        distance_km=workout.distance_km,
        avg_pace_sec_per_km=workout.avg_pace_sec_per_km,
        avg_hr_bpm=workout.avg_hr_bpm,
        elevation_gain_m=workout.elevation_gain_m,
        strength_sets=payload.strength_sets,
        notes=workout.notes,
    )


# ============================================================================
# 6. RESUMEN DIARIO DEL DIARIO (MACROS, ALERTAS DE PROTEÍNA, AGUA Y EJERCICIO)
# ============================================================================
@api_router.get("/daily-summary", tags=["Diario & Progreso"])
def get_daily_summary(
    target_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    day = target_date or date.today()
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    targets = db.query(NutritionTarget).filter(NutritionTarget.user_id == current_user.id).first()

    meals = (
        db.query(MealLog)
        .filter(MealLog.user_id == current_user.id, MealLog.log_date == day)
        .all()
    )
    workouts = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.session_date == day)
        .all()
    )
    metric = (
        db.query(DailyMetric)
        .filter(DailyMetric.user_id == current_user.id, DailyMetric.metric_date == day)
        .first()
    )

    consumed_kcal = sum(m.kcal for m in meals)
    consumed_protein_g = round(sum(m.protein_g for m in meals), 1)
    consumed_carbs_g = round(sum(m.carbs_g for m in meals), 1)
    consumed_fat_g = round(sum(m.fat_g for m in meals), 1)
    consumed_fiber_g = round(sum(m.fiber_g for m in meals), 1)

    workout_kcal = sum(w.estimated_kcal_burned for w in workouts)
    is_training_day = (len(workouts) > 0) or (metric and metric.day_type == "TRAINING")

    base_kcal_goal = (
        (targets.training_day_kcal if is_training_day else targets.rest_day_kcal)
        if targets
        else 2300
    )
    carbs_goal_g = (
        (targets.carbs_training_day_g if is_training_day else targets.carbs_rest_day_g)
        if targets
        else 220
    )
    protein_goal_g = targets.protein_target_g if targets else 165
    fat_goal_g = targets.fat_target_g if targets else 65
    fiber_goal_g = targets.fiber_target_g if targets else 32
    water_goal_ml = targets.water_target_ml if targets else 3000

    # Recálculo dinámico conservador según calorías activas quemadas
    backfill_ratio = prof.calorie_backfill_ratio if prof else 0.60
    dynamic_bonus_kcal = int(round(workout_kcal * backfill_ratio)) if workout_kcal > 250 else 0
    effective_kcal_budget = base_kcal_goal + dynamic_bonus_kcal

    # Alertas inteligentes de proteína y distribución por comida
    protein_alerts: list[str] = []
    remaining_protein = round(protein_goal_g - consumed_protein_g, 1)
    high_protein_meals_count = sum(1 for m in meals if m.protein_g >= 28.0)

    if remaining_protein > 35:
        protein_alerts.append(
            f"Te faltan {remaining_protein:.0f} g de proteína hoy para proteger tu masa muscular en déficit. "
            "Sugerencia rápida: 180g de pechuga a la plancha (+55g P) o 1 vaso de yogur griego + 1 scoop de Whey (+40g P)."
        )
    if len(meals) >= 2 and high_protein_meals_count < 2:
        protein_alerts.append(
            "Distribución de síntesis proteica: procura que cada comida principal supere los 30-40 g de proteína (umbral de leucina)."
        )

    return {
        "date": day.isoformat(),
        "is_training_day": is_training_day,
        "calories": {
            "consumed": consumed_kcal,
            "base_target": base_kcal_goal,
            "workout_burned": workout_kcal,
            "dynamic_bonus": dynamic_bonus_kcal,
            "effective_target": effective_kcal_budget,
            "remaining": effective_kcal_budget - consumed_kcal,
            "maintenance_range": [
                targets.tdee_lower_bound_kcal if targets else 2450,
                targets.tdee_upper_bound_kcal if targets else 2700,
            ],
        },
        "macros": {
            "protein": {"consumed_g": consumed_protein_g, "target_g": protein_goal_g},
            "carbs": {"consumed_g": consumed_carbs_g, "target_g": carbs_goal_g},
            "fat": {"consumed_g": consumed_fat_g, "target_g": fat_goal_g},
            "fiber": {"consumed_g": consumed_fiber_g, "target_g": fiber_goal_g},
        },
        "hydration_and_steps": {
            "water_ml": metric.water_ml if metric else 0,
            "water_target_ml": water_goal_ml,
            "steps_count": metric.steps_count if metric else 0,
            "steps_target": targets.daily_steps_target if targets else 10000,
            "sleep_hours": metric.sleep_hours if metric else 7.5,
        },
        "protein_alerts": protein_alerts,
        "high_protein_meals_count": high_protein_meals_count,
    }


@api_router.put("/daily-metrics", tags=["Diario & Progreso"])
def update_daily_metrics(
    payload: DailyMetricsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metric = (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.metric_date == payload.metric_date,
        )
        .first()
    )
    if not metric:
        metric = DailyMetric(
            user_id=current_user.id,
            metric_date=payload.metric_date,
            water_ml=payload.water_ml or 0,
            steps_count=payload.steps_count or 0,
            sleep_hours=payload.sleep_hours or 7.5,
            day_type=payload.day_type or "TRAINING",
        )
        db.add(metric)
    else:
        if payload.water_ml is not None:
            metric.water_ml = payload.water_ml
        if payload.steps_count is not None:
            metric.steps_count = payload.steps_count
        if payload.sleep_hours is not None:
            metric.sleep_hours = payload.sleep_hours
        if payload.resting_hr_bpm is not None:
            metric.resting_hr_bpm = payload.resting_hr_bpm
        if payload.hrv_ms is not None:
            metric.hrv_ms = payload.hrv_ms
        if payload.day_type is not None:
            metric.day_type = payload.day_type

    db.commit()
    db.refresh(metric)
    return {
        "metric_date": metric.metric_date.isoformat(),
        "water_ml": metric.water_ml,
        "steps_count": metric.steps_count,
        "sleep_hours": metric.sleep_hours,
        "resting_hr_bpm": getattr(metric, "resting_hr_bpm", 54),
        "hrv_ms": getattr(metric, "hrv_ms", 68.0),
        "day_type": metric.day_type,
    }


# ============================================================================
# 7. CHEQUEOS CORPORALES Y VALORACIÓN AUTOMÁTICA DE RECOMPOSICIÓN
# ============================================================================
@api_router.get("/checkins", response_model=list[BodyCheckinResponse], tags=["Chequeos & Composición Corporal"])
def list_body_checkins(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkins = (
        db.query(BodyCheckin)
        .filter(BodyCheckin.user_id == current_user.id)
        .order_by(BodyCheckin.checkin_date.asc())
        .all()
    )
    return [
        BodyCheckinResponse(
            id=c.id,
            checkin_date=c.checkin_date,
            weight_kg=c.weight_kg,
            trend_weight_kg=c.trend_weight_kg,
            body_fat_pct=c.body_fat_pct,
            bf_method=c.bf_method,
            measurement_conditions=c.measurement_conditions,
            lean_mass_kg=c.lean_mass_kg,
            fat_mass_kg=c.fat_mass_kg,
            waist_cm=c.waist_cm,
            hip_cm=c.hip_cm,
            chest_cm=c.chest_cm,
            arm_cm=c.arm_cm,
            thigh_cm=c.thigh_cm,
            energy_level=c.energy_level,
            sleep_quality=c.sleep_quality,
            strength_performance=c.strength_performance,
            notes=c.notes,
            assessment_status=c.assessment_status,
            assessment_summary=c.assessment_summary,
            recommended_action=c.recommended_action,
            calorie_adjustment_kcal=c.calorie_adjustment_kcal,
            method_margin_warning=METHOD_ERROR_WARNINGS.get(
                c.bf_method, METHOD_ERROR_WARNINGS["BIOIMPEDANCIA"]
            ),
        )
        for c in checkins
    ]


@api_router.post("/checkins", response_model=BodyCheckinResponse, tags=["Chequeos & Composición Corporal"])
def create_body_checkin(
    payload: BodyCheckinCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Si ya había un chequeo en la misma fecha exacta, reemplazarlo y comparar contra fechas previas
    db.query(BodyCheckin).filter(
        BodyCheckin.user_id == current_user.id,
        BodyCheckin.checkin_date == payload.checkin_date,
    ).delete()

    prev_checkins = (
        db.query(BodyCheckin)
        .filter(
            BodyCheckin.user_id == current_user.id,
            BodyCheckin.checkin_date < payload.checkin_date,
        )
        .order_by(BodyCheckin.checkin_date.asc())
        .all()
    )

    evaluation = evaluate_body_checkin(payload, prev_checkins)

    checkin = BodyCheckin(
        user_id=current_user.id,
        checkin_date=payload.checkin_date,
        weight_kg=payload.weight_kg,
        trend_weight_kg=evaluation["trend_weight_kg"],
        body_fat_pct=payload.body_fat_pct,
        bf_method=payload.bf_method,
        measurement_conditions=payload.measurement_conditions,
        lean_mass_kg=evaluation["lean_mass_kg"],
        fat_mass_kg=evaluation["fat_mass_kg"],
        waist_cm=payload.waist_cm,
        hip_cm=payload.hip_cm,
        chest_cm=payload.chest_cm,
        arm_cm=payload.arm_cm,
        thigh_cm=payload.thigh_cm,
        energy_level=payload.energy_level,
        sleep_quality=payload.sleep_quality,
        strength_performance=payload.strength_performance,
        notes=payload.notes,
        assessment_status=evaluation["assessment_status"],
        assessment_summary=evaluation["assessment_summary"],
        recommended_action=evaluation["recommended_action"],
        calorie_adjustment_kcal=evaluation["calorie_adjustment_kcal"],
    )
    db.add(checkin)

    # Actualizar el peso y % grasa actuales en el perfil del usuario
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if prof:
        prof.current_weight_kg = payload.weight_kg
        prof.current_body_fat_pct = payload.body_fat_pct
        prof.bf_measurement_method = payload.bf_method

    db.commit()
    db.refresh(checkin)

    return BodyCheckinResponse(
        id=checkin.id,
        checkin_date=checkin.checkin_date,
        weight_kg=checkin.weight_kg,
        trend_weight_kg=checkin.trend_weight_kg,
        body_fat_pct=checkin.body_fat_pct,
        bf_method=checkin.bf_method,
        measurement_conditions=checkin.measurement_conditions,
        lean_mass_kg=checkin.lean_mass_kg,
        fat_mass_kg=checkin.fat_mass_kg,
        waist_cm=checkin.waist_cm,
        hip_cm=checkin.hip_cm,
        chest_cm=checkin.chest_cm,
        arm_cm=checkin.arm_cm,
        thigh_cm=checkin.thigh_cm,
        energy_level=checkin.energy_level,
        sleep_quality=checkin.sleep_quality,
        strength_performance=checkin.strength_performance,
        notes=checkin.notes,
        assessment_status=checkin.assessment_status,
        assessment_summary=checkin.assessment_summary,
        recommended_action=checkin.recommended_action,
        calorie_adjustment_kcal=checkin.calorie_adjustment_kcal,
        method_margin_warning=evaluation["method_margin_warning"],
    )


# ============================================================================
# 8. FASE 2: ESCÁNER DE CÓDIGO DE BARRAS (OPEN FOOD FACTS + CACHÉ LOCAL)
# ============================================================================
@api_router.get(
    "/foods/barcode/{ean}",
    response_model=BarcodeLookupResponse,
    tags=["Fase 2: Escáner & Visión IA"],
)
def get_food_by_barcode(
    ean: str,
    db: Session = Depends(get_db),
):
    food, source = lookup_barcode_ean(ean, db)
    return BarcodeLookupResponse(
        found=food is not None,
        lookup_source=source,
        barcode_ean13=ean,
        food=food,
    )


# ============================================================================
# 9. FASE 2: DETECCIÓN DE COMIDA POR FOTO (GEMINI API + HUMAN-IN-THE-LOOP)
# ============================================================================
@api_router.post(
    "/ai-vision/analyze-plate",
    response_model=AiPlateAnalysisResponse,
    tags=["Fase 2: Escáner & Visión IA"],
)
def analyze_plate_endpoint(
    payload: AiPlateAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = analyze_plate_photo(
        image_base64=payload.image_base64,
        reference_object=payload.reference_object,
        user_hint=payload.user_hint,
        db=db,
    )

    items_models = [AiDetectedFoodItem(**it) for it in result["items"]]
    total_kcal = sum(i.kcal for i in items_models)
    total_p = round(sum(i.protein_g for i in items_models), 1)
    total_c = round(sum(i.carbs_g for i in items_models), 1)
    total_f = round(sum(i.fat_g for i in items_models), 1)
    total_fib = round(sum(i.fiber_g for i in items_models), 1)

    overall_conf = float(result["overall_confidence"])
    is_co = bool(result["is_colombian_dish"])
    flagged = overall_conf < 0.78 or is_co

    # Guardar predicción inicial en base de datos para el pipeline Human-in-the-Loop
    pred = AiFoodPrediction(
        user_id=current_user.id,
        image_data_preview=(payload.image_base64[:160] if payload.image_base64 else ""),
        model_version=result["model_version"],
        reference_object=payload.reference_object,
        dish_name_detected=result["dish_name"],
        overall_confidence=overall_conf,
        raw_ai_prediction_json=json.dumps(
            [i.model_dump() for i in items_models], ensure_ascii=False
        ),
        user_corrected_items_json="[]",
        estimation_error_pct=0.0,
        is_colombian_dish=is_co,
        flagged_for_review=flagged,
        user_confirmed=False,
        dataset_split="TRAIN",
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)

    return AiPlateAnalysisResponse(
        prediction_id=pred.id,
        model_version=pred.model_version,
        dish_name=pred.dish_name_detected,
        reference_object=pred.reference_object,
        overall_confidence=pred.overall_confidence,
        is_colombian_dish=pred.is_colombian_dish,
        flagged_for_review=pred.flagged_for_review,
        items=items_models,
        total_kcal=total_kcal,
        total_protein_g=total_p,
        total_carbs_g=total_c,
        total_fat_g=total_f,
        total_fiber_g=total_fib,
        disclaimer="Estimación visual por IA. Puedes ajustar los gramos si lo deseas antes de registrar.",
        error_message=result.get("error_message"),
    )


@api_router.post(
    "/ai-vision/predictions/{prediction_id}/confirm",
    response_model=AiPredictionConfirmResponse,
    tags=["Fase 2: Escáner & Visión IA"],
)
def confirm_plate_prediction(
    prediction_id: str,
    payload: AiPredictionConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pred = (
        db.query(AiFoodPrediction)
        .filter(
            AiFoodPrediction.id == prediction_id,
            AiFoodPrediction.user_id == current_user.id,
        )
        .first()
    )
    raw_items = json.loads(pred.raw_ai_prediction_json) if pred else []
    corrected_dicts = [i.model_dump() for i in payload.corrected_items]
    mape = calculate_mape_error(raw_items, corrected_dicts)

    flagged = (mape > 18.0) or (pred.overall_confidence < 0.78 if pred else True)
    if pred:
        pred.user_corrected_items_json = json.dumps(
            corrected_dicts, ensure_ascii=False
        )
        pred.estimation_error_pct = mape
        pred.flagged_for_review = flagged or pred.is_colombian_dish
        pred.user_confirmed = True

    # Registrar los ingredientes confirmados en el diario de comidas del usuario
    total_kcal_logged = 0
    total_protein_logged = 0.0
    for idx, item in enumerate(payload.corrected_items):
        mut_id = (
            f"{payload.client_mutation_id}-{prediction_id[:8]}-{idx}"
            if payload.client_mutation_id
            else None
        )
        if mut_id:
            existing_m = db.query(MealLog).filter(MealLog.client_mutation_id == mut_id).first()
            if existing_m:
                total_kcal_logged += existing_m.kcal
                total_protein_logged += existing_m.protein_g
                continue
        meal = MealLog(
            user_id=current_user.id,
            log_date=payload.log_date,
            meal_type=payload.meal_type,
            custom_food_name=f"[IA Foto] {item.name_es}",
            quantity_g=item.estimated_grams,
            portion_description=f"Foto IA ({int(item.estimated_grams)}g)",
            kcal=item.kcal,
            protein_g=item.protein_g,
            carbs_g=item.carbs_g,
            fat_g=item.fat_g,
            fiber_g=item.fiber_g,
            client_mutation_id=mut_id,
        )
        db.add(meal)
        total_kcal_logged += item.kcal
        total_protein_logged += item.protein_g

    db.commit()

    return AiPredictionConfirmResponse(
        prediction_id=prediction_id,
        estimation_error_pct=mape,
        flagged_for_review=flagged,
        dataset_split=pred.dataset_split if pred else "TRAIN",
        logged_meals_count=len(payload.corrected_items),
        total_kcal_logged=total_kcal_logged,
        total_protein_g_logged=round(total_protein_logged, 1),
    )


@api_router.get(
    "/ai-vision/predictions",
    tags=["Fase 2: Escáner & Visión IA"],
)
def get_ai_predictions_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preds = (
        db.query(AiFoodPrediction)
        .filter(AiFoodPrediction.user_id == current_user.id)
        .order_by(AiFoodPrediction.created_at.desc())
        .limit(20)
        .all()
    )
    confirmed = [p for p in preds if p.user_confirmed]
    avg_mape = (
        round(sum(p.estimation_error_pct for p in confirmed) / len(confirmed), 2)
        if confirmed
        else 0.0
    )
    return {
        "total_predictions": len(preds),
        "confirmed_count": len(confirmed),
        "avg_mape_error_pct": avg_mape,
        "colombian_priority_samples": sum(1 for p in preds if p.is_colombian_dish),
        "flagged_for_review_count": sum(1 for p in preds if p.flagged_for_review),
        "recent": [
            {
                "id": p.id,
                "dish_name": p.dish_name_detected,
                "model_version": p.model_version,
                "overall_confidence": p.overall_confidence,
                "estimation_error_pct": p.estimation_error_pct,
                "is_colombian_dish": p.is_colombian_dish,
                "flagged_for_review": p.flagged_for_review,
                "user_confirmed": p.user_confirmed,
                "created_at": p.created_at.isoformat(),
            }
            for p in preds
        ],
    }


# ============================================================================
# 10. FASE 3: RECÁLCULO DINÁMICO DE CALORÍAS POR ACTIVIDAD (EJERCICIO + PASOS)
# ============================================================================
@api_router.get(
    "/activity/dynamic-budget",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def get_dynamic_calorie_budget_endpoint(
    target_date: Optional[date] = Query(default=None),
    backfill_override: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    day = target_date or date.today()
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    targets = db.query(NutritionTarget).filter(NutritionTarget.user_id == current_user.id).first()
    workouts = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id, WorkoutSession.session_date == day)
        .all()
    )
    metric = (
        db.query(DailyMetric)
        .filter(DailyMetric.user_id == current_user.id, DailyMetric.metric_date == day)
        .first()
    )

    workout_kcal = sum(w.estimated_kcal_burned for w in workouts)
    steps = metric.steps_count if metric else 0
    is_training = len(workouts) > 0 or (metric and metric.day_type == "TRAINING")

    base_target = (
        (targets.training_day_kcal if is_training else targets.rest_day_kcal)
        if targets
        else 2300
    )
    min_safe = targets.min_safe_kcal if targets else 1600
    ratio = (
        backfill_override
        if backfill_override is not None
        else (prof.calorie_backfill_ratio if prof else 0.60)
    )

    return compute_dynamic_calorie_budget(
        base_target_kcal=base_target,
        workout_burned_kcal=workout_kcal,
        steps_count=steps,
        backfill_ratio=ratio,
        min_safe_kcal=min_safe,
    )


# ============================================================================
# 11. FASE 3: INTEGRACIONES DE ACTIVIDAD (ATAJOS DE iOS, ARCHIVOS, STRAVA/GARMIN)
# ============================================================================
@api_router.post(
    "/integrations/ios-shortcut",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def sync_from_ios_shortcut(
    payload: IosShortcutSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint receptor para un Atajo de iOS (Apple Shortcuts) que lee Apple Health
    en el iPhone y sincroniza pasos, sueño, FC en reposo, VFC (HRV) y entrenos.
    """
    sync_day = payload.sync_date or date.today()
    metric = (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.metric_date == sync_day,
        )
        .first()
    )
    if not metric:
        metric = DailyMetric(
            user_id=current_user.id,
            metric_date=sync_day,
            water_ml=2000,
            steps_count=payload.steps_count,
            sleep_hours=payload.sleep_hours,
            resting_hr_bpm=payload.resting_hr_bpm,
            hrv_ms=payload.hrv_ms,
            active_kcal_extra=payload.active_kcal,
            sync_source="IOS_SHORTCUT",
            day_type="TRAINING",
        )
        db.add(metric)
    else:
        metric.steps_count = max(metric.steps_count, payload.steps_count)
        metric.sleep_hours = payload.sleep_hours
        metric.resting_hr_bpm = payload.resting_hr_bpm
        metric.hrv_ms = payload.hrv_ms
        metric.active_kcal_extra = payload.active_kcal
        metric.sync_source = "IOS_SHORTCUT"

    workout_created = None
    if payload.workout_duration_min > 0:
        prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        weight_kg = prof.current_weight_kg if prof else 76.0
        est_kcal = (
            payload.active_kcal
            if payload.active_kcal > 100
            else estimate_workout_calories(
                modality=payload.workout_modality,
                duration_minutes=payload.workout_duration_min,
                weight_kg=weight_kg,
                session_rpe=7,
                distance_km=payload.workout_distance_km,
            )
        )
        pace_sec = (
            int(round((payload.workout_duration_min * 60) / payload.workout_distance_km))
            if payload.workout_distance_km > 0
            else 0
        )
        w = WorkoutSession(
            user_id=current_user.id,
            session_date=sync_day,
            title=payload.workout_title or "Entreno Sincronizado vía Atajo de iOS (Apple Health)",
            modality=payload.workout_modality,
            duration_minutes=payload.workout_duration_min,
            session_rpe=7,
            internal_load_au=payload.workout_duration_min * 7,
            estimated_kcal_burned=est_kcal,
            distance_km=payload.workout_distance_km,
            avg_pace_sec_per_km=pace_sec,
            avg_hr_bpm=152,
            elevation_gain_m=30,
            strength_sets_json="[]",
            notes="Importado automáticamente desde Atajos de iOS (Shortcuts).",
        )
        db.add(w)
        workout_created = w.title

    integ = (
        db.query(ExternalIntegration)
        .filter(
            ExternalIntegration.user_id == current_user.id,
            ExternalIntegration.provider == "IOS_SHORTCUT",
        )
        .first()
    )
    if not integ:
        integ = ExternalIntegration(
            user_id=current_user.id,
            provider="IOS_SHORTCUT",
            status="CONNECTED",
            shortcut_api_key="fpi_ios_live_shortcut_2026",
            synced_activities_count=1,
        )
        db.add(integ)
    else:
        integ.synced_activities_count += 1

    db.commit()
    return {
        "status": "synced",
        "source": "IOS_SHORTCUT_APPLE_HEALTH",
        "sync_date": sync_day.isoformat(),
        "steps_count": metric.steps_count,
        "sleep_hours": metric.sleep_hours,
        "resting_hr_bpm": metric.resting_hr_bpm,
        "hrv_ms": metric.hrv_ms,
        "workout_created": workout_created,
    }


@api_router.post(
    "/integrations/import-file",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def import_sport_file_endpoint(
    payload: FileImportJsonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Importa archivos deportivos (.gpx, .tcx, .csv, Apple Health .xml o .fit),
    extrae entrenamientos, distancia Haversine, desnivel, FC, VFC y pasos.
    """
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    weight_kg = prof.current_weight_kg if prof else 76.0
    parsed = parse_uploaded_sport_file(
        filename=payload.filename,
        raw_bytes=payload.content_text.encode("utf-8"),
        user_weight_kg=weight_kg,
    )

    target_day = payload.session_date or date.today()
    w = WorkoutSession(
        user_id=current_user.id,
        session_date=target_day,
        title=parsed["title"],
        modality=parsed["modality"],
        duration_minutes=parsed["duration_minutes"],
        session_rpe=8,
        internal_load_au=parsed["duration_minutes"] * 8,
        estimated_kcal_burned=parsed["estimated_kcal_burned"],
        distance_km=parsed["distance_km"],
        avg_pace_sec_per_km=parsed["avg_pace_sec_per_km"],
        avg_hr_bpm=parsed["avg_hr_bpm"],
        elevation_gain_m=parsed["elevation_gain_m"],
        strength_sets_json="[]",
        notes=f"Importado desde archivo {parsed['file_type']}: {payload.filename}",
    )
    db.add(w)

    # Si el archivo incluye pasos o métricas de Apple Health XML, actualizarlas también
    metric = (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.metric_date == target_day,
        )
        .first()
    )
    if metric and parsed.get("steps_imported"):
        metric.steps_count = max(metric.steps_count, int(parsed["steps_imported"]))
        if "resting_hr_bpm" in parsed:
            metric.resting_hr_bpm = int(parsed["resting_hr_bpm"])
        if "hrv_ms" in parsed:
            metric.hrv_ms = float(parsed["hrv_ms"])

    db.commit()
    db.refresh(w)
    return {
        "status": "imported",
        "workout_id": w.id,
        "parsed_summary": parsed,
    }


@api_router.get(
    "/integrations/providers",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def list_integration_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    connected = (
        db.query(ExternalIntegration)
        .filter(ExternalIntegration.user_id == current_user.id)
        .all()
    )
    by_name = {c.provider: c for c in connected}
    catalog = [
        {
            "provider": "STRAVA",
            "display_name": "Strava (Running, Ciclismo & Rutas GPS)",
            "connected": "STRAVA" in by_name,
            "synced_count": by_name["STRAVA"].synced_activities_count if "STRAVA" in by_name else 0,
        },
        {
            "provider": "GARMIN",
            "display_name": "Garmin Connect (Entrenos, Pasos, VFC & Sueño)",
            "connected": "GARMIN" in by_name,
            "synced_count": by_name["GARMIN"].synced_activities_count if "GARMIN" in by_name else 0,
        },
        {
            "provider": "IOS_SHORTCUT",
            "display_name": "Atajo de iOS -> Apple Health (Pasos, FC, VFC & Sueño)",
            "connected": True,
            "synced_count": by_name["IOS_SHORTCUT"].synced_activities_count if "IOS_SHORTCUT" in by_name else 1,
        },
        {
            "provider": "OURA_WHOOP",
            "display_name": "Oura Ring / Whoop (Recuperación, Sueño & VFC)",
            "connected": "OURA_WHOOP" in by_name,
            "synced_count": by_name["OURA_WHOOP"].synced_activities_count if "OURA_WHOOP" in by_name else 0,
        },
    ]
    return {"providers": catalog, "capacitor_bridge_ready": True}


@api_router.post(
    "/integrations/oauth/{provider}/sync",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def trigger_oauth_provider_sync(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prov_upper = provider.upper()
    integ = (
        db.query(ExternalIntegration)
        .filter(
            ExternalIntegration.user_id == current_user.id,
            ExternalIntegration.provider == prov_upper,
        )
        .first()
    )
    if not integ:
        integ = ExternalIntegration(
            user_id=current_user.id,
            provider=prov_upper,
            status="CONNECTED",
            synced_activities_count=1,
        )
        db.add(integ)
    else:
        integ.synced_activities_count += 1

    # Importar sesión reciente simulada del proveedor conectado
    today = date.today()
    title_map = {
        "STRAVA": "Strava Sync: Fondo Aeróbico 12K Zona 2",
        "GARMIN": "Garmin Connect: Series en Pista 6x800m + VFC",
        "OURA_WHOOP": "Whoop/Oura Sync: Movilidad & Recuperación Autonómica",
    }
    w = WorkoutSession(
        user_id=current_user.id,
        session_date=today,
        title=title_map.get(prov_upper, f"Sincronización {prov_upper}"),
        modality="RUNNING" if prov_upper in ("STRAVA", "GARMIN") else "MOBILITY",
        duration_minutes=54 if prov_upper in ("STRAVA", "GARMIN") else 30,
        session_rpe=7,
        internal_load_au=378 if prov_upper in ("STRAVA", "GARMIN") else 120,
        estimated_kcal_burned=610 if prov_upper in ("STRAVA", "GARMIN") else 140,
        distance_km=11.2 if prov_upper in ("STRAVA", "GARMIN") else 0.0,
        avg_pace_sec_per_km=289 if prov_upper in ("STRAVA", "GARMIN") else 0,
        avg_hr_bpm=156,
        elevation_gain_m=75,
        strength_sets_json="[]",
        notes=f"Sincronizado vía OAuth API ({prov_upper}).",
    )
    db.add(w)
    db.commit()
    return {
        "status": "synced",
        "provider": prov_upper,
        "synced_activities_count": integ.synced_activities_count,
        "imported_workout_title": w.title,
    }


# ============================================================================
# 12. FASE 3: MOTOR DE CARGA (ACWR) Y RECOMENDACIONES DE DESCARGA (DELOAD)
# ============================================================================
@api_router.get(
    "/recovery/status",
    tags=["Fase 3: Actividad Dinámica, Integraciones & Deloads"],
)
def get_recovery_and_deload_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workouts = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.session_date.desc())
        .all()
    )
    recent_metric = (
        db.query(DailyMetric)
        .filter(DailyMetric.user_id == current_user.id)
        .order_by(DailyMetric.metric_date.desc())
        .first()
    )
    return evaluate_training_load_and_deload(
        workouts=workouts,
        recent_metric=recent_metric,
    )


# ============================================================================
# 13. FASE 3: NOTIFICACIONES WEB PUSH (iOS 16.4+ STANDALONE + RESPALDO)
# ============================================================================
@api_router.post(
    "/notifications/subscribe",
    tags=["Fase 3: Notificaciones Web Push iOS"],
)
def subscribe_web_push(
    payload: PushSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        sub = PushSubscription(
            user_id=current_user.id,
            **payload.model_dump(),
        )
        db.add(sub)
    else:
        for k, v in payload.model_dump().items():
            setattr(sub, k, v)

    db.commit()
    db.refresh(sub)
    return {
        "status": "subscribed",
        "subscription_id": sub.id,
        "device_platform": sub.device_platform,
        "protein_reminder_enabled": sub.protein_reminder_enabled,
        "checkin_reminder_enabled": sub.checkin_reminder_enabled,
        "deload_alert_enabled": sub.deload_alert_enabled,
        "email_fallback_enabled": sub.email_fallback_enabled,
    }


@api_router.post(
    "/notifications/test-push",
    tags=["Fase 3: Notificaciones Web Push iOS"],
)
def send_test_web_push(
    current_user: User = Depends(get_current_user),
):
    return {
        "status": "sent",
        "title": "FitProIA — Alerta de Síntesis Proteica",
        "body": "Recuerda completar tu toma post-entreno (35-40g de proteína) para proteger tu masa magra.",
        "ios_standalone_requirement": "iOS 16.4+ con app instalada en Pantalla de Inicio",
    }


# ============================================================================
# 14. FASE 4: PLANIFICACIÓN POR COMPETENCIAS, PERIODIZACIÓN Y PREVENCIÓN RED-S
# ============================================================================
def _compute_competition_response(
    ev: CompetitionEvent,
    prof: UserProfile | None,
    targets: NutritionTarget | None,
    avg_burn_kcal: int = 520,
    current_intake_kcal: int | None = None,
) -> CompetitionEventResponse:
    weight_kg = prof.current_weight_kg if prof else 76.4
    bf_pct = (prof.current_body_fat_pct if prof and prof.current_body_fat_pct else 15.8)
    lbm_kg = round(weight_kg * (1.0 - bf_pct / 100.0), 2)
    tdee_kcal = targets.tdee_base_kcal if targets else 2780
    base_deficit_kcal = targets.target_daily_kcal if targets else 2350
    intake_kcal = current_intake_kcal if current_intake_kcal is not None else base_deficit_kcal

    plan = build_competition_periodization_plan(
        event_name=ev.name,
        event_type=ev.event_type,
        event_date=ev.event_date,
        distance_km=ev.distance_km,
        elevation_gain_m=ev.elevation_gain_m,
        goal_time_minutes=ev.goal_time_minutes,
        user_weight_kg=weight_kg,
        lean_body_mass_kg=lbm_kg,
        tdee_maintenance_kcal=tdee_kcal,
        base_deficit_kcal=base_deficit_kcal,
        current_daily_intake_kcal=intake_kcal,
        avg_daily_exercise_burn_kcal=avg_burn_kcal,
    )
    return CompetitionEventResponse(
        id=ev.id,
        name=ev.name,
        event_type=ev.event_type,
        event_date=ev.event_date,
        distance_km=ev.distance_km,
        elevation_gain_m=ev.elevation_gain_m,
        goal_time_minutes=ev.goal_time_minutes,
        priority_level=ev.priority_level,
        notes=ev.notes,
        periodization_plan=plan,
    )


@api_router.get(
    "/competitions",
    response_model=list[CompetitionEventResponse],
    tags=["Fase 4: Competencias, Periodización & RED-S"],
)
def list_competitions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = (
        db.query(CompetitionEvent)
        .filter(CompetitionEvent.user_id == current_user.id)
        .order_by(CompetitionEvent.event_date.asc())
        .all()
    )
    if not events:
        return []

    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    targets = db.query(NutritionTarget).filter(NutritionTarget.user_id == current_user.id).first()
    return [_compute_competition_response(ev, prof, targets) for ev in events]


@api_router.post(
    "/competitions",
    response_model=CompetitionEventResponse,
    tags=["Fase 4: Competencias, Periodización & RED-S"],
)
def create_competition(
    payload: CompetitionEventCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ev = CompetitionEvent(
        user_id=current_user.id,
        name=payload.name,
        event_type=payload.event_type.upper(),
        event_date=payload.event_date,
        distance_km=payload.distance_km,
        elevation_gain_m=payload.elevation_gain_m,
        goal_time_minutes=payload.goal_time_minutes,
        priority_level=payload.priority_level,
        notes=payload.notes,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    targets = db.query(NutritionTarget).filter(NutritionTarget.user_id == current_user.id).first()
    return _compute_competition_response(ev, prof, targets)


# ============================================================================
# 15. FASE 4: PIPELINE PROGRAMADO DE EVALUACIÓN Y REENTRENAMIENTO IA (HITL)
# ============================================================================
@api_router.post(
    "/vision/retraining/run",
    tags=["Fase 4: Pipeline Reentrenamiento Visión IA"],
)
def trigger_vision_retraining_pipeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    predictions = db.query(AiFoodPrediction).all()
    prev_runs = db.query(MlRetrainingRun).count()
    result = execute_vision_retraining_pipeline(
        dataset_records=predictions,
        previous_runs_count=prev_runs,
        triggered_by="MANUAL_OR_CRON_TRIGGER",
    )
    run_row = MlRetrainingRun(
        model_version_tag=result["model_version_tag"],
        dataset_version_tag=result["dataset_version_tag"],
        total_samples_evaluated=result["total_samples_evaluated"],
        colombian_dishes_count=result["colombian_dishes_count"],
        low_confidence_prioritized_count=result["low_confidence_prioritized_count"],
        overall_gram_mape_pct=result["overall_gram_mape_pct"],
        colombian_dish_accuracy_pct=result["colombian_dish_accuracy_pct"],
        category_metrics_json=json.dumps(result["category_metrics"], ensure_ascii=False),
        status=result["status"],
        triggered_by=result["triggered_by"],
    )
    db.add(run_row)
    db.commit()
    db.refresh(run_row)
    return result


@api_router.get(
    "/vision/retraining/runs",
    tags=["Fase 4: Pipeline Reentrenamiento Visión IA"],
)
def list_vision_retraining_runs(
    db: Session = Depends(get_db),
):
    runs = db.query(MlRetrainingRun).order_by(MlRetrainingRun.created_at.desc()).limit(10).all()
    return [
        {
            "id": r.id,
            "model_version_tag": r.model_version_tag,
            "dataset_version_tag": r.dataset_version_tag,
            "total_samples_evaluated": r.total_samples_evaluated,
            "colombian_dishes_count": r.colombian_dishes_count,
            "low_confidence_prioritized_count": r.low_confidence_prioritized_count,
            "overall_gram_mape_pct": r.overall_gram_mape_pct,
            "colombian_dish_accuracy_pct": r.colombian_dish_accuracy_pct,
            "category_metrics": json.loads(r.category_metrics_json or "{}"),
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]


# ============================================================================
# 16. FASE 4: RECOMENDACIONES MÉDICAS, CHEQUEOS Y SEÑALES DE ALARMA
# ============================================================================
@api_router.post(
    "/medical/evaluate",
    tags=["Fase 4: Salud Médica, Laboratorios & Coach IA"],
)
def evaluate_medical_safety(
    payload: MedicalSafetyEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    return evaluate_medical_safety_and_checkups(
        age=prof.age if prof else 29,
        sex=prof.sex if prof else "M",
        current_weight_kg=prof.current_weight_kg if prof else 76.4,
        recent_weekly_weight_loss_kg=payload.recent_weekly_weight_loss_kg,
        reported_symptoms=payload.reported_symptoms,
        has_high_intensity_competition=True,
        ferritin_ng_ml=payload.ferritin_ng_ml,
        vitamin_d_ng_ml=payload.vitamin_d_ng_ml,
    )


# ============================================================================
# 17. FASE 4: SUGERENCIAS DE COMIDAS, PLANIFICADOR SEMANAL Y COACH IA
# ============================================================================
@api_router.post(
    "/meals/smart-suggestions",
    tags=["Fase 4: Salud Médica, Laboratorios & Coach IA"],
)
def get_smart_meal_suggestions(
    payload: SmartMealSuggestionRequest,
):
    return generate_smart_meal_suggestions(
        remaining_kcal=payload.remaining_kcal,
        remaining_protein_g=payload.remaining_protein_g,
        remaining_carbs_g=payload.remaining_carbs_g,
        remaining_fat_g=payload.remaining_fat_g,
    )


@api_router.get(
    "/meals/weekly-plan",
    tags=["Fase 4: Salud Médica, Laboratorios & Coach IA"],
)
def get_weekly_meal_plan_and_grocery_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    targets = db.query(NutritionTarget).filter(NutritionTarget.user_id == current_user.id).first()
    return generate_weekly_plan_and_grocery_list(
        training_day_kcal=targets.training_day_kcal if targets else 2480,
        rest_day_kcal=targets.rest_day_kcal if targets else 2150,
        protein_target_g=targets.protein_target_g if targets else 168.0,
        carbs_training_g=targets.carbs_training_day_g if targets else 260.0,
        carbs_rest_g=targets.carbs_rest_day_g if targets else 185.0,
        fat_target_g=targets.fat_target_g if targets else 65.0,
    )


@api_router.post(
    "/coach/ask",
    tags=["Fase 4: Salud Médica, Laboratorios & Coach IA"],
)
def ask_fitproia_coach(
    payload: CoachQuestionRequest,
):
    return answer_coach_question(
        question=payload.question,
        user_context=payload.model_dump(),
    )



