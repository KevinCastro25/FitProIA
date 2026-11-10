"""
FitProIA — Fase 4 (Módulo 8): Motor de Planificación por Competencias,
Periodización Nutricional (Base, Construcción, Pico, Tapering, Recuperación),
Estrategia de Hidratación/Nutrición Intra-Evento y Detección de Riesgo RED-S.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def build_competition_periodization_plan(
    event_name: str,
    event_type: str,
    event_date: date,
    distance_km: float,
    elevation_gain_m: int,
    goal_time_minutes: int,
    user_weight_kg: float,
    lean_body_mass_kg: float,
    tdee_maintenance_kcal: int,
    base_deficit_kcal: int,
    current_daily_intake_kcal: int,
    avg_daily_exercise_burn_kcal: int,
    reference_date: date | None = None,
) -> dict[str, Any]:
    """
    Genera la periodización nutricional automática hacia la competencia objetivo:
    - Prohibe explícitamente el déficit calórico en semanas de máxima carga (Pico) y Tapering.
    - Calcula la estrategia de carbohidratos, hidratación y sodio durante el evento.
    - Evalúa la Disponibilidad Energética (EA) para alertar de riesgo de RED-S.
    """
    today = reference_date or date.today()
    days_until_race = (event_date - today).days
    weeks_until_race = round(days_until_race / 7.0, 1)

    # 1. Determinación de la Fase Actual de Periodización
    if days_until_race < -7:
        current_phase_code = "COMPETENCIA_FINALIZADA"
        current_phase_title = "Ciclo Finalizado — Transición a Nuevo Bloque Base"
        deficit_allowed = True
        recommended_daily_kcal = base_deficit_kcal
        carbs_g_per_kg = 3.5
        protein_g_per_kg = 2.2
        phase_rationale = (
            "La competencia y su semana de regeneración han concluido. "
            "Puedes retomar tu bloque de definición moderada si aún buscas reducir % de grasa."
        )
    elif -7 <= days_until_race < 0:
        current_phase_code = "RECUPERACION_POST_CARRERA"
        current_phase_title = "Recuperación Post-Competencia (Regeneración Muscular y Tendinosa)"
        deficit_allowed = False
        recommended_daily_kcal = tdee_maintenance_kcal + 150
        carbs_g_per_kg = 4.5
        protein_g_per_kg = 2.3
        phase_rationale = (
            "PROHIBIDO EL DÉFICIT ESTA SEMANA: Tras la carrera hay daño miofibrilar e inflamación aguda. "
            "Mantén calorías de mantenimiento o ligero superávit (+150 kcal) y proteína en 2.3 g/kg."
        )
    elif 0 <= days_until_race <= 14:
        current_phase_code = "TAPERING_Y_CARGA_CARBOS"
        current_phase_title = "Tapering y Supercompensación de Glucógeno (Carb Loading)"
        deficit_allowed = False
        recommended_daily_kcal = tdee_maintenance_kcal + 200
        carbs_g_per_kg = 7.5 if days_until_race <= 3 else 5.8
        protein_g_per_kg = 2.0
        phase_rationale = (
            "PROHIBIDO BUSCAR PERDER GRASA EN TAPERING: Faltan menos de 2 semanas para competir. "
            "El volumen de entrenamiento baja (-40% a -60%) pero las calorías se mantienen en TDEE "
            "con carga progresiva de carbohidratos (7-9 g/kg en las últimas 48h) y reducción de fibra/grasa."
        )
    elif 14 < days_until_race <= 28:
        current_phase_code = "PICO_CARGA_MANTENIMIENTO"
        current_phase_title = "Pico de Carga Específica (Mantenimiento / Superávit Leve)"
        deficit_allowed = False
        recommended_daily_kcal = tdee_maintenance_kcal + 100
        carbs_g_per_kg = 5.5
        protein_g_per_kg = 2.2
        phase_rationale = (
            "SEMANAS DE MÁXIMA CARGA — DÉFICIT BLOQUEADO: Estás a 2-4 semanas del evento en pleno pico de volumen e intensidad. "
            "Un déficit ahora dispararía el cortisol, vaciaría el glucógeno y arriesgaría lesión tendinosa. "
            "FitProIA ajusta tu presupuesto a Mantenimiento/Superávit leve."
        )
    elif 28 < days_until_race <= 56:
        current_phase_code = "CONSTRUCCION_ESPECIFICA"
        current_phase_title = "Construcción Específica (Déficit Ciclado Conservador)"
        deficit_allowed = True
        recommended_daily_kcal = int((base_deficit_kcal + tdee_maintenance_kcal) / 2)
        carbs_g_per_kg = 4.6
        protein_g_per_kg = 2.2
        phase_rationale = (
            "Fase de Construcción (4 a 8 semanas antes): Se reduce el déficit a la mitad (-200 kcal promedio) "
            "y los días de fondo largo o simulación Hyrox se comen en estricto mantenimiento calórico."
        )
    else:
        current_phase_code = "BASE_DEFINICION_INTELIGENTE"
        current_phase_title = "Fase Base — Ventana Óptima de Definición Corporal (% Grasa)"
        deficit_allowed = True
        recommended_daily_kcal = base_deficit_kcal
        carbs_g_per_kg = 3.8
        protein_g_per_kg = 2.2
        phase_rationale = (
            "Estás a más de 8 semanas de la competencia: esta es la ventana fisiológica ideal para oxidar grasa "
            "con déficit moderado (-350 a -450 kcal/día) sin comprometer el pico competitivo."
        )

    # 2. Cronograma Completo de los 5 Bloques hacia la Competencia
    periodization_blocks = [
        {
            "block_code": "BASE_DEFINICION",
            "block_name": "1. Fase Base (Definición de % Grasa)",
            "window_description": "Más de 8 semanas antes del evento",
            "start_date": (event_date - timedelta(days=98)).isoformat(),
            "end_date": (event_date - timedelta(days=57)).isoformat(),
            "calorie_strategy": f"Déficit Moderado ({base_deficit_kcal} kcal/día)",
            "carbs_g_per_kg": 3.8,
            "protein_g_per_kg": 2.2,
            "deficit_permitted": True,
            "focus": "Reducir % de grasa corporal lejos de la carrera protegiendo fuerza máxima.",
        },
        {
            "block_code": "CONSTRUCCION",
            "block_name": "2. Construcción Específica",
            "window_description": "Semanas -8 a -4 antes del evento",
            "start_date": (event_date - timedelta(days=56)).isoformat(),
            "end_date": (event_date - timedelta(days=29)).isoformat(),
            "calorie_strategy": f"Transición / Ciclado ({int((base_deficit_kcal + tdee_maintenance_kcal) / 2)} kcal/día)",
            "carbs_g_per_kg": 4.6,
            "protein_g_per_kg": 2.2,
            "deficit_permitted": True,
            "focus": "Subir carbohidratos en días de tirada larga o tempo; déficit mínimo en días suaves.",
        },
        {
            "block_code": "PICO_CARGA",
            "block_name": "3. Pico de Carga (Cero Déficit)",
            "window_description": "Semanas -4 a -2 antes del evento",
            "start_date": (event_date - timedelta(days=28)).isoformat(),
            "end_date": (event_date - timedelta(days=15)).isoformat(),
            "calorie_strategy": f"Mantenimiento / Superávit Leve ({tdee_maintenance_kcal + 100} kcal/día)",
            "carbs_g_per_kg": 5.5,
            "protein_g_per_kg": 2.2,
            "deficit_permitted": False,
            "focus": "Soportar el máximo volumen semanal sin catabolismo ni caída inmunológica.",
        },
        {
            "block_code": "TAPERING_CARB_LOAD",
            "block_name": "4. Tapering y Carga de Carbohidratos",
            "window_description": "Últimos 14 días (Carga 48h previas)",
            "start_date": (event_date - timedelta(days=14)).isoformat(),
            "end_date": event_date.isoformat(),
            "calorie_strategy": f"Supercompensación Glucógeno ({tdee_maintenance_kcal + 200} kcal/día)",
            "carbs_g_per_kg": 7.5,
            "protein_g_per_kg": 2.0,
            "deficit_permitted": False,
            "focus": "Llenar al 100% los depósitos de glucógeno muscular y hepático; bajar fibra 48h antes.",
        },
        {
            "block_code": "RECUPERACION_POST",
            "block_name": "5. Recuperación Post-Competencia",
            "window_description": "7 días posteriores al evento",
            "start_date": (event_date + timedelta(days=1)).isoformat(),
            "end_date": (event_date + timedelta(days=7)).isoformat(),
            "calorie_strategy": f"Regeneración Tisular ({tdee_maintenance_kcal + 150} kcal/día)",
            "carbs_g_per_kg": 4.5,
            "protein_g_per_kg": 2.3,
            "deficit_permitted": False,
            "focus": "Reparar micro-roturas fibrilares, tendones y restaurar balance hidroelectrolítico.",
        },
    ]

    # 3. Estrategia Intra-Competencia (Hidratación, Sodio y Carbohidratos por Hora)
    hours_duration = max(0.5, goal_time_minutes / 60.0)
    ev_upper = event_type.upper()

    if ev_upper in ("MARATHON", "ULTRA") or hours_duration >= 2.5:
        carbs_per_hour_g = 75
        fluid_per_hour_ml = 650
        sodium_per_hour_mg = 650
        fuel_sources_co = (
            "Geles isotónicos 2:1 (glucosa:fructosa) + trozos de bocadillo veleño (25g carbos c/u) "
            "+ bebida isotónica con sales."
        )
    elif ev_upper == "HYROX":
        carbs_per_hour_g = 45
        fluid_per_hour_ml = 550
        sodium_per_hour_mg = 500
        fuel_sources_co = (
            "1 gel con cafeína 25 min antes del Roxzone + sorbos de maltodextrina/electrolitos "
            "en las transiciones tras Sled Push y Burpee Broad Jumps."
        )
    else:  # HALF_MARATHON / 10K
        carbs_per_hour_g = 50 if hours_duration >= 1.2 else 30
        fluid_per_hour_ml = 550
        sodium_per_hour_mg = 450
        fuel_sources_co = (
            "1 gel isotónico o 1 bocadillo veleño cada 35-40 min (km 7, km 14) + "
            "hidratación con sales en cada punto de control."
        )

    total_race_carbs_g = int(round(carbs_per_hour_g * hours_duration))
    total_race_fluid_ml = int(round(fluid_per_hour_ml * hours_duration))
    total_race_sodium_mg = int(round(sodium_per_hour_mg * hours_duration))

    intra_race_strategy = {
        "expected_duration_min": goal_time_minutes,
        "carbs_per_hour_g": carbs_per_hour_g,
        "total_race_carbs_g": total_race_carbs_g,
        "fluid_per_hour_ml": fluid_per_hour_ml,
        "total_race_fluid_ml": total_race_fluid_ml,
        "sodium_per_hour_mg": sodium_per_hour_mg,
        "total_race_sodium_mg": total_race_sodium_mg,
        "pre_race_breakfast_protocol": (
            f"3 horas antes: {int(round(user_weight_kg * 2.0))}g de carbohidratos de fácil digestión "
            "(ej. 2 arepas blancas asadas con miel o arroz blanco + banano maduro + 25g Whey), "
            "bajo en fibra y grasa."
        ),
        "colombian_fuel_options": fuel_sources_co,
        "checkpoints_schedule": [
            "Pre-salida (-20 min): 200 ml de agua con 300 mg de sodio + 20g carbos.",
            "Minuto 35-40: 25-30g de carbohidratos (1 gel o bocadillo veleño) + 180 ml de agua.",
            "Minuto 70-80: 25-30g de carbohidratos con cafeína (50-100 mg) + 200 ml de isotónico.",
            "Post-meta inmediato (ventana 30 min): 40g proteína Whey Isolate + 80g carbohidratos + 600 ml con electrolitos.",
        ],
    }

    # 4. Evaluación Clínica de Disponibilidad Energética (EA) y Alerta RED-S
    safe_ffm_kg = max(35.0, lean_body_mass_kg)
    net_energy_kcal = max(0, current_daily_intake_kcal - avg_daily_exercise_burn_kcal)
    energy_availability_kcal_per_kg_ffm = round(net_energy_kcal / safe_ffm_kg, 1)

    if energy_availability_kcal_per_kg_ffm < 30.0:
        reds_risk_level = "ALTO_RIESGO_REDS"
        reds_alert_message = (
            f"ALERTA CRÍTICA RED-S: Tu Disponibilidad Energética actual es de {energy_availability_kcal_per_kg_ffm} kcal/kg "
            "de Masa Magra (<30 kcal/kg FFM/día). Mantener este déficit con tu carga actual de entrenamiento "
            "compromete la tasa metabólica, función tiroidea/hormonal, densidad ósea y provoca pérdida muscular. "
            f"Sube inmediatamente al menos +{int(round((35.0 - energy_availability_kcal_per_kg_ffm) * safe_ffm_kg))} kcal/día."
        )
    elif energy_availability_kcal_per_kg_ffm < 38.0 and not deficit_allowed:
        reds_risk_level = "PRECAUCION_FASE_PICO"
        reds_alert_message = (
            f"PRECAUCIÓN ENERGÉTICA EN FASE DE CARGA/TAPERING: Tu Disponibilidad Energética es {energy_availability_kcal_per_kg_ffm} kcal/kg FFM. "
            "Para rendir al máximo en la competencia y evitar fatiga central, sube tu ingesta al rango de mantenimiento."
        )
    else:
        reds_risk_level = "OPTIMO_SEGURO"
        reds_alert_message = (
            f"Disponibilidad Energética saludable ({energy_availability_kcal_per_kg_ffm} kcal/kg Masa Magra/día ≥ 30 kcal/kg FFM). "
            "Tu sistema endocrino, masa muscular y recuperación están protegidos."
        )

    return {
        "event_name": event_name,
        "event_type": event_type,
        "event_date": event_date.isoformat(),
        "days_until_race": days_until_race,
        "weeks_until_race": weeks_until_race,
        "current_phase_code": current_phase_code,
        "current_phase_title": current_phase_title,
        "deficit_allowed": deficit_allowed,
        "recommended_daily_kcal": recommended_daily_kcal,
        "recommended_carbs_g": round(user_weight_kg * carbs_g_per_kg, 1),
        "recommended_protein_g": round(user_weight_kg * protein_g_per_kg, 1),
        "phase_rationale": phase_rationale,
        "periodization_blocks": periodization_blocks,
        "intra_race_strategy": intra_race_strategy,
        "reds_evaluation": {
            "energy_availability_kcal_per_kg_ffm": energy_availability_kcal_per_kg_ffm,
            "clinical_threshold_kcal_per_kg_ffm": 30.0,
            "optimal_threshold_kcal_per_kg_ffm": 40.0,
            "risk_level": reds_risk_level,
            "alert_message": reds_alert_message,
        },
    }
