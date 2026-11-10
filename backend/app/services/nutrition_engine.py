from datetime import date, timedelta
from app.schemas.api_schemas import UserProfileInput, NutritionTargetsResponse

ACTIVITY_MULTIPLIERS = {
    "SEDENTARY": 1.25,
    "LIGHT": 1.375,
    "MODERATE": 1.55,
    "ACTIVE": 1.725,      # Gym + Running 4-5 días/semana
    "ATHLETE": 1.85,      # Preparación Media Maratón / Hyrox / Doble jornada
}


def calculate_nutrition_plan(profile: UserProfileInput) -> NutritionTargetsResponse:
    """
    Motor fisiológico de recomposición corporal:
    1. Usa Katch-McArdle como método principal cuando existe % grasa corporal.
    2. Usa Mifflin-St Jeor como respaldo cuando no se conoce % grasa.
    3. Calcula el rango de calorías de mantenimiento (±5%).
    4. Establece déficit moderado para conservar masa muscular, proteína alta (1.8-2.4 g/kg)
       y ciclado de carbohidratos entre días de entrenamiento y descanso.
    """
    warnings: list[str] = []
    weight = profile.current_weight_kg

    # 1. Estimación de composición corporal y BMR (TMB)
    if profile.current_body_fat_pct is not None and profile.current_body_fat_pct > 0:
        bf_pct = profile.current_body_fat_pct
        fat_mass_kg = round(weight * (bf_pct / 100.0), 2)
        lean_body_mass_kg = round(weight - fat_mass_kg, 2)
        # Katch-McArdle: BMR = 370 + (21.6 * LBM)
        bmr_kcal = int(round(370 + (21.6 * lean_body_mass_kg)))
        formula_used = "KATCH_MCARDLE"
    else:
        # Estimación antropométrica de respaldo (Cunningham/Mifflin-St Jeor)
        s_factor = 5 if profile.sex == "M" else -161
        bmr_kcal = int(
            round((10 * weight) + (6.25 * profile.height_cm) - (5 * profile.age) + s_factor)
        )
        est_bf = 18.0 if profile.sex == "M" else 26.0
        fat_mass_kg = round(weight * (est_bf / 100.0), 2)
        lean_body_mass_kg = round(weight - fat_mass_kg, 2)
        formula_used = "MIFFLIN_ST_JEOR"
        warnings.append(
            "No ingresaste % de grasa actual: se usó Mifflin-St Jeor como respaldo. "
            "Cuando registres tu % de grasa (pliegues, bioimpedancia o DEXA), el sistema activará Katch-McArdle."
        )

    # 2. TDEE y Rango de Mantenimiento (±5%)
    multiplier = ACTIVITY_MULTIPLIERS.get(profile.activity_level, 1.65)
    tdee_base_kcal = int(round(bmr_kcal * multiplier))
    tdee_lower_bound_kcal = int(round(tdee_base_kcal * 0.95))
    tdee_upper_bound_kcal = int(round(tdee_base_kcal * 1.05))

    # 3. Salvaguardas de ritmo de pérdida semanal (máximo saludable 0.5% - 1.0% peso/semana)
    weekly_loss_pct = profile.target_weekly_loss_pct
    if weekly_loss_pct > 0.85:
        warnings.append(
            f"Ritmo de pérdida solicitado ({weekly_loss_pct:.2f}%/sem) es cercano al límite superior. "
            "Para atletas de gym + running se recomienda 0.4% a 0.7%/semana para evitar perder fuerza y masa magra."
        )
    safe_weekly_loss_pct = min(weekly_loss_pct, 1.0)
    weekly_kg_loss = weight * (safe_weekly_loss_pct / 100.0)
    # 1 kg de tejido adiposo ~ 7700 kcal -> déficit diario moderado
    raw_daily_deficit = int(round((weekly_kg_loss * 7700.0) / 7.0))
    # Tope de déficit moderado para recomposición (máx 22% del TDEE)
    max_recomp_deficit = int(round(tdee_base_kcal * 0.22))
    effective_deficit = min(raw_daily_deficit, max_recomp_deficit)

    # 4. Piso de seguridad energética (EA >= 30 kcal/kg LBM o BMR mínimo)
    min_floor_sex = 1550 if profile.sex == "M" else 1250
    min_safe_kcal = max(bmr_kcal, min_floor_sex, int(round(lean_body_mass_kg * 28.5)))

    target_daily_kcal = max(min_safe_kcal, tdee_base_kcal - effective_deficit)
    if tdee_base_kcal - raw_daily_deficit < min_safe_kcal:
        warnings.append(
            f"Salvaguarda médica activada: La meta calórica se ajustó al piso seguro ({min_safe_kcal} kcal) "
            "para prevenir baja disponibilidad energética (RED-S) y pérdida de masa muscular."
        )

    # 5. Ciclado de calorías según día de entrenamiento vs día de descanso
    if profile.carb_cycling_enabled:
        training_day_kcal = int(round(target_daily_kcal * 1.07))
        rest_day_kcal = max(min_safe_kcal, int(round(target_daily_kcal * 0.91)))
    else:
        training_day_kcal = target_daily_kcal
        rest_day_kcal = target_daily_kcal

    # 6. Distribución de Macronutrientes con prioridad en Proteína Alta
    protein_g_per_kg = max(1.8, min(profile.protein_g_per_kg, 2.5))
    protein_target_g = int(round(weight * protein_g_per_kg))
    protein_kcal = protein_target_g * 4
    # Recomendación por comida (4 tomas al día para optimizar síntesis proteica)
    protein_per_meal_recommended_g = int(round(protein_target_g / 4.0))

    # Grasas con mínimo saludable para perfil hormonal (mínimo 0.8 g/kg o 22% de kcal)
    fat_target_g = max(int(round(weight * 0.85)), int(round((target_daily_kcal * 0.24) / 9.0)))
    fat_kcal = fat_target_g * 9

    # Carbohidratos ajustados al volumen de entrenamiento (día de entreno vs descanso)
    remaining_training_kcal = max(240, training_day_kcal - protein_kcal - fat_kcal)
    remaining_rest_kcal = max(180, rest_day_kcal - protein_kcal - fat_kcal)
    carbs_training_day_g = int(round(remaining_training_kcal / 4.0))
    carbs_rest_day_g = int(round(remaining_rest_kcal / 4.0))

    # 7. Agua y Fibra
    fiber_target_g = max(28, int(round((target_daily_kcal / 1000.0) * 14.0)))
    water_target_ml = int(round(weight * 35.0 + 500))  # Base 35ml/kg + 500ml sudoración base

    # 8. Proyección de semanas hacia el % de grasa objetivo conservando masa magra
    current_bf = profile.current_body_fat_pct or (18.0 if profile.sex == "M" else 26.0)
    if current_bf > profile.target_body_fat_pct:
        # Peso objetivo manteniendo el 100% de la masa magra actual:
        # Peso_meta = LBM / (1 - BF_objetivo/100)
        target_weight_preserving_lbm = lean_body_mass_kg / (
            1.0 - (profile.target_body_fat_pct / 100.0)
        )
        fat_to_lose_kg = max(0.5, weight - target_weight_preserving_lbm)
        weekly_fat_loss_rate = max(0.25, (effective_deficit * 7.0) / 7700.0)
        estimated_weeks = max(2, int(round(fat_to_lose_kg / weekly_fat_loss_rate)))
    else:
        estimated_weeks = 4

    estimated_goal_date = date.today() + timedelta(weeks=estimated_weeks)

    if profile.injuries_or_restrictions.strip():
        warnings.append(
            f"Restricción registrada ({profile.injuries_or_restrictions}): prioriza ejercicios sin dolor "
            "y mantén la ingesta proteica alta para favorecer la recuperación tendinosa y muscular."
        )

    return NutritionTargetsResponse(
        formula_used=formula_used,
        lean_body_mass_kg=lean_body_mass_kg,
        fat_mass_kg=fat_mass_kg,
        bmr_kcal=bmr_kcal,
        tdee_base_kcal=tdee_base_kcal,
        tdee_lower_bound_kcal=tdee_lower_bound_kcal,
        tdee_upper_bound_kcal=tdee_upper_bound_kcal,
        target_daily_kcal=target_daily_kcal,
        training_day_kcal=training_day_kcal,
        rest_day_kcal=rest_day_kcal,
        min_safe_kcal=min_safe_kcal,
        protein_target_g=protein_target_g,
        protein_per_meal_recommended_g=protein_per_meal_recommended_g,
        fat_target_g=fat_target_g,
        carbs_training_day_g=carbs_training_day_g,
        carbs_rest_day_g=carbs_rest_day_g,
        fiber_target_g=fiber_target_g,
        water_target_ml=water_target_ml,
        daily_steps_target=10000,
        estimated_weeks_to_goal=estimated_weeks,
        estimated_goal_date=estimated_goal_date,
        warnings=warnings,
    )


def estimate_workout_calories(
    modality: str,
    duration_minutes: int,
    weight_kg: float,
    session_rpe: int,
    distance_km: float = 0.0,
    avg_hr_bpm: int = 0,
) -> int:
    """
    Calcula calorías quemadas combinando METs ajustados por RPE, distancia (en running)
    y frecuencia cardíaca cuando está disponible.
    """
    base_mets = {
        "STRENGTH": 5.2,
        "RUNNING": 9.8,
        "HYROX": 10.5,
        "CYCLING": 8.0,
        "SWIMMING": 8.5,
        "MOBILITY": 3.0,
    }
    met = base_mets.get(modality, 6.0)
    # Ajuste por intensidad percibida (RPE 1-10)
    rpe_factor = 0.80 + (session_rpe * 0.04)
    effective_met = met * rpe_factor

    # Si es running y tiene distancia, el costo energético neto ~ 1.03 kcal/kg/km es muy preciso
    if modality == "RUNNING" and distance_km > 0:
        running_kcal = distance_km * weight_kg * 1.03
        met_kcal = (effective_met * 3.5 * weight_kg / 200.0) * duration_minutes
        return int(round((running_kcal * 0.65) + (met_kcal * 0.35)))

    kcal = (effective_met * 3.5 * weight_kg / 200.0) * duration_minutes
    if avg_hr_bpm > 155:
        kcal *= 1.08
    return int(round(kcal))
