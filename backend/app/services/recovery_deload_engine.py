import json
import math
from datetime import date, timedelta
from app.models.entities import WorkoutSession, DailyMetric


LOWER_BODY_GROUPS = {"PIERNA", "QUADS", "HAMSTRINGS", "GLUTES", "ISQUIOS_GLUTEOS", "HYROX_FULL"}
UPPER_BODY_GROUPS = {"PECHO", "ESPALDA", "HOMBRO", "BRAZO", "CHEST", "BACK", "SHOULDERS", "ARMS"}


def evaluate_training_load_and_deload(
    workouts: list[WorkoutSession],
    recent_metric: DailyMetric | None,
    reference_date: date | None = None,
) -> dict:
    """
    Motor de Carga de Entrenamiento y Recomendaciones de Descarga (Deload):
    1. Calcula Carga Aguda (últimos 7 días en AU = min * RPE) y Carga Crónica (media semanal de 28 días).
    2. Calcula el índice ACWR (Acute:Chronic Workload Ratio), la Monotonía y el Strain (Fatiga).
    3. Desglosa el volumen de series efectivas y RPE por tren corporal (Inferior vs Superior) + impacto de Running/Hyrox.
    4. Integra sueño, FC en reposo y VFC (HRV) para emitir una recomendación precisa de descarga:
       - DELOAD_TREN_INFERIOR
       - DELOAD_TREN_SUPERIOR
       - DELOAD_GENERAL_SEMANA
       - RECUPERACION_OPTIMA
    """
    today = reference_date or date.today()
    seven_days_ago = today - timedelta(days=6)
    twenty_eight_days_ago = today - timedelta(days=27)

    # Carga diaria en los últimos 7 días para calcular Monotonía
    daily_loads_7d: dict[date, int] = {
        today - timedelta(days=i): 0 for i in range(7)
    }

    acute_load_au = 0
    chronic_total_28d_au = 0

    lower_body_sets_7d = 0
    upper_body_sets_7d = 0
    lower_rpe_list: list[float] = []
    upper_rpe_list: list[float] = []
    running_km_7d = 0.0

    for w in workouts:
        if w.session_date < twenty_eight_days_ago or w.session_date > today:
            continue
        chronic_total_28d_au += w.internal_load_au

        if w.session_date >= seven_days_ago:
            acute_load_au += w.internal_load_au
            if w.session_date in daily_loads_7d:
                daily_loads_7d[w.session_date] += w.internal_load_au

            if w.modality in ("RUNNING", "HYROX"):
                running_km_7d += float(w.distance_km or 0.0)
                # El impacto excéntrico de carrera/Hyrox suma estrés mecánico al tren inferior
                lower_body_sets_7d += max(2, int(round((w.distance_km or 5.0) * 0.6)))
                lower_rpe_list.append(float(w.session_rpe))

            try:
                sets = json.loads(w.strength_sets_json or "[]")
            except Exception:
                sets = []

            for s in sets:
                m_group = str(s.get("muscle_group", "PIERNA")).upper()
                s_rpe = float(s.get("rpe", w.session_rpe))
                if m_group in LOWER_BODY_GROUPS:
                    lower_body_sets_7d += 1
                    lower_rpe_list.append(s_rpe)
                elif m_group in UPPER_BODY_GROUPS:
                    upper_body_sets_7d += 1
                    upper_rpe_list.append(s_rpe)

    # Si el usuario recién empieza y tiene pocos días en los 28d, evitar división artificialmente baja
    chronic_weekly_avg_au = max(350.0, chronic_total_28d_au / 4.0)
    if chronic_total_28d_au == acute_load_au and acute_load_au > 0:
        # Si toda la historia está en esta semana, usar base normativa de atleta híbrido (1400 AU)
        chronic_weekly_avg_au = max(chronic_weekly_avg_au, 1350.0)

    acwr_ratio = round(acute_load_au / chronic_weekly_avg_au, 2) if chronic_weekly_avg_au > 0 else 0.85

    # Monotonía = Media diaria (7d) / Desviación estándar (7d)
    loads_vals = list(daily_loads_7d.values())
    mean_daily = sum(loads_vals) / 7.0
    variance = sum((x - mean_daily) ** 2 for x in loads_vals) / 7.0
    std_daily = math.sqrt(variance) if variance > 0 else 1.0
    monotony = round(mean_daily / max(25.0, std_daily), 2)
    strain_au = int(round(acute_load_au * monotony))

    # Indicadores fisiológicos de recuperación (Sueño, FC Reposo, VFC / HRV)
    sleep_hours = float(recent_metric.sleep_hours) if recent_metric and recent_metric.sleep_hours else 7.5
    resting_hr = int(getattr(recent_metric, "resting_hr_bpm", 54) or 54)
    hrv_ms = float(getattr(recent_metric, "hrv_ms", 68.0) or 68.0)

    # Puntaje de recuperación autonómica (0 a 100)
    sleep_score = min(40.0, (sleep_hours / 8.0) * 40.0)
    hrv_score = min(35.0, (hrv_ms / 75.0) * 35.0)
    rhr_score = max(5.0, 25.0 - max(0, resting_hr - 52) * 1.2)
    recovery_score = int(round(min(100.0, sleep_score + hrv_score + rhr_score)))

    avg_lower_rpe = (
        round(sum(lower_rpe_list) / len(lower_rpe_list), 1)
        if lower_rpe_list
        else 7.5
    )
    avg_upper_rpe = (
        round(sum(upper_rpe_list) / len(upper_rpe_list), 1)
        if upper_rpe_list
        else 7.5
    )

    # ÁRBOL DE DECISIÓN DE DESCARGA (DELOAD)
    if acwr_ratio > 1.38 or recovery_score < 56 or (monotony > 2.1 and acute_load_au > 1600):
        deload_type = "DELOAD_GENERAL_SEMANA"
        urgency = "ALTA"
        title = "Se recomienda Semana de Descarga General (Sistema Nervioso y Autonómico)"
        explanation = (
            f"Tu ratio de carga aguda/crónica (ACWR = {acwr_ratio}) o tus marcadores de recuperación "
            f"(Sueño: {sleep_hours}h, VFC: {hrv_ms} ms, FC reposo: {resting_hr} ppm, Score: {recovery_score}/100) "
            "indican fatiga sistémica acumulada."
        )
        protocol = [
            "Reduce el volumen total de series en gimnasio un -40% durante 6 días.",
            "Mantén la intensidad en barra moderada (RPE 6.5–7, dejando 3 repeticiones en recámara).",
            "En running, sustituye las series de umbral/intervalos por rodajes suaves en Zona 1–2 y sesiones de movilidad de cadera y tobillo.",
            "Sube las calorías al rango de mantenimiento durante los días de descarga para supercompensar glucógeno y tejido conectivo.",
        ]
    elif (lower_body_sets_7d >= 12 and running_km_7d >= 15.0) or (
        lower_body_sets_7d >= 15 and avg_lower_rpe >= 8.3
    ):
        deload_type = "DELOAD_TREN_INFERIOR"
        urgency = "MEDIA"
        title = "Descarga Específica de Tren Inferior (Piernas + Impacto de Running)"
        explanation = (
            f"Acumulas {lower_body_sets_7d} bloques/series equivalentes de impacto en tren inferior "
            f"({running_km_7d:.1f} km de carrera/Hyrox + pesas a RPE medio {avg_lower_rpe}), "
            f"mientras tu tren superior está fresco ({upper_body_sets_7d} series)."
        )
        protocol = [
            "Tren Inferior: recorta el volumen de sentadilla/peso muerto un -45% por 5 días y evita fallos concéntricos.",
            "Running / Hyrox: reemplaza 1 sesión de asfalto por bicicleta estática o natación sin impacto articular.",
            "Tren Superior: puedes mantener tu entrenamiento normal de pecho, espalda y hombros al 100%.",
            "Aumenta 20 minutos de movilidad de psoas, isquiotibiales y descarga miofascial de sóleo/gemelo.",
        ]
    elif upper_body_sets_7d >= 16 and avg_upper_rpe >= 8.4:
        deload_type = "DELOAD_TREN_SUPERIOR"
        urgency = "MEDIA"
        title = "Descarga Específica de Tren Superior (Hombro, Pectoral y Tracción)"
        explanation = (
            f"Tu tren superior registra {upper_body_sets_7d} series de alta intensidad (RPE medio {avg_upper_rpe}). "
            "Para proteger el manguito rotador y los tendones del codo mientras estás en déficit calórico, descarga el tren superior."
        )
        protocol = [
            "Tren Superior: reduce series de press banca, press militar y dominadas lastradas a 2 series por ejercicio a RPE 7.",
            "Tren Inferior y Running: continúa con tu planificación habitual de carrera y fuerza de piernas.",
            "Incluye trabajo de movilidad escapular y rotadores externos con banda elástica.",
        ]
    else:
        deload_type = "RECUPERACION_OPTIMA"
        urgency = "BAJA"
        title = "Carga Equilibrada (Sweet Spot de Adaptación)"
        explanation = (
            f"Tu ratio ACWR ({acwr_ratio}) se encuentra en la zona óptima (0.80–1.30) y tu índice de recuperación "
            f"autonómica es {recovery_score}/100 (VFC {hrv_ms} ms, FC reposo {resting_hr} ppm)."
        )
        protocol = [
            "No necesitas descarga esta semana: puedes aplicar sobrecarga progresiva (+1 rep o +1.25–2.5 kg en básicos).",
            "Programa tu próxima semana de descarga general preventiva al completar 4–5 semanas seguidas de bloque de carga.",
        ]

    return {
        "acute_load_7d_au": acute_load_au,
        "chronic_load_28d_weekly_au": int(round(chronic_weekly_avg_au)),
        "acwr_ratio": acwr_ratio,
        "monotony": monotony,
        "strain_au": strain_au,
        "muscle_split_7d": {
            "lower_body_effective_sets": lower_body_sets_7d,
            "upper_body_effective_sets": upper_body_sets_7d,
            "running_km_7d": round(running_km_7d, 1),
            "avg_lower_rpe": avg_lower_rpe,
            "avg_upper_rpe": avg_upper_rpe,
        },
        "autonomic_recovery": {
            "recovery_score_100": recovery_score,
            "sleep_hours": sleep_hours,
            "resting_hr_bpm": resting_hr,
            "hrv_ms": hrv_ms,
        },
        "recommendation": {
            "deload_type": deload_type,
            "urgency": urgency,
            "title": title,
            "explanation": explanation,
            "action_protocol": protocol,
        },
    }
