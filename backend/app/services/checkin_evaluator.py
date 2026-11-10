from app.models.entities import BodyCheckin
from app.schemas.api_schemas import BodyCheckinCreate

METHOD_ERROR_WARNINGS = {
    "BIOIMPEDANCIA": (
        "Báscula de Bioimpedancia (BIA): margen de error típico de ±3% a 4%. "
        "Es altamente sensible al nivel de hidratación, glucógeno y sudoración. Mídete siempre en ayunas tras ir al baño."
    ),
    "PLIEGUES": (
        "Pliegues Cutáneos (Antropometría ISAK): margen de error de ±2% a 3% si lo toma el mismo evaluador en las mismas condiciones."
    ),
    "DEXA": (
        "DEXA (Absorciometría Dual de Rayos X): estándar clínico de referencia (±1% a 1.5%). Excelente para calibrar tus mediciones caseras."
    ),
    "ESTIMACION_VISUAL": (
        "Estimación Visual / Cinta Métrica: margen de error de ±4%. Guiarse principalmente por la tendencia del perímetro de cintura y fotos de progreso."
    ),
}


def evaluate_body_checkin(
    new_checkin: BodyCheckinCreate,
    previous_checkins: list[BodyCheckin],
) -> dict:
    """
    Evalúa el chequeo priorizando la COMPOSICIÓN CORPORAL (% grasa, masa magra y cintura)
    y el rendimiento deportivo por encima del peso aislado en la báscula.
    Calcula media móvil exponencial (EMA) del peso para filtrar fluctuaciones de agua.
    """
    weight = new_checkin.weight_kg
    bf_pct = new_checkin.body_fat_pct
    fat_mass_kg = round(weight * (bf_pct / 100.0), 2)
    lean_mass_kg = round(weight - fat_mass_kg, 2)

    method_warning = METHOD_ERROR_WARNINGS.get(
        new_checkin.bf_method,
        METHOD_ERROR_WARNINGS["BIOIMPEDANCIA"],
    )

    if not previous_checkins:
        return {
            "trend_weight_kg": round(weight, 2),
            "lean_mass_kg": lean_mass_kg,
            "fat_mass_kg": fat_mass_kg,
            "assessment_status": "LINEA_BASE_INICIAL",
            "assessment_summary": (
                f"Chequeo base registrado: {lean_mass_kg:.1f} kg de masa magra y {fat_mass_kg:.1f} kg de masa grasa "
                f"({bf_pct:.1f}% vía {new_checkin.bf_method}). El peso en la báscula será secundario; "
                "evaluaremos la evolución de tu cintura, masa magra y fuerza."
            ),
            "recommended_action": (
                "Mantén el plan nutricional actual durante 14 días asegurando cumplir la meta diaria de proteína "
                "y registra tu próximo chequeo bajo las mismas condiciones (" + new_checkin.measurement_conditions + ")."
            ),
            "calorie_adjustment_kcal": 0,
            "method_margin_warning": method_warning,
        }

    # Ordenar previos cronológicamente y tomar el más reciente
    sorted_prev = sorted(previous_checkins, key=lambda c: c.checkin_date)
    last = sorted_prev[-1]

    # Media Móvil Exponencial (EMA alpha = 0.35 para suavizar retención de líquidos post-entreno)
    alpha = 0.35
    trend_weight_kg = round((alpha * weight) + ((1 - alpha) * last.trend_weight_kg), 2)

    days_elapsed = max(1, (new_checkin.checkin_date - last.checkin_date).days)
    weeks_elapsed = max(0.5, days_elapsed / 7.0)

    weight_delta = weight - last.weight_kg
    weekly_pct_change = ((weight_delta / last.weight_kg) * 100.0) / weeks_elapsed
    bf_delta = bf_pct - last.body_fat_pct
    lbm_delta = lean_mass_kg - last.lean_mass_kg
    waist_delta = new_checkin.waist_cm - last.waist_cm

    # Advertencia si cambió el método o condición de medición
    consistency_note = ""
    if last.bf_method != new_checkin.bf_method or last.measurement_conditions != new_checkin.measurement_conditions:
        consistency_note = (
            f" Nota metodológica: este chequeo se midió con ({new_checkin.bf_method} / {new_checkin.measurement_conditions}) "
            f"mientras que el anterior fue ({last.bf_method} / {last.measurement_conditions}). Compara el % de grasa con cautela."
        )

    # ÁRBOL DE DECISIÓN DE COMPOSICIÓN CORPORAL (El peso NO es el objetivo principal)

    # Caso 1: Pérdida rápida o caída de masa magra / caída de fuerza -> RIESGO DE PÉRDIDA MUSCULAR
    if (weekly_pct_change < -1.05) or (lbm_delta < -0.6 and new_checkin.strength_performance <= 2):
        status = "ALERTA_PERDIDA_MUSCULAR"
        summary = (
            f"¡Atención! Tu peso bajó a un ritmo de {abs(weekly_pct_change):.2f}%/semana "
            f"y la masa magra estimada varió {lbm_delta:+.2f} kg con reporte de menor fuerza en el gimnasio."
            + consistency_note
        )
        action = (
            "El déficit actual es demasiado agresivo para tu volumen de gym/running. "
            "Se recomienda subir +250 kcal/día (priorizando carbohidratos alrededor del entrenamiento) y fijar la proteína en 2.2-2.4 g/kg."
        )
        kcal_adj = 250

    # Caso 2: Peso estable (o incluso leve subida) pero cintura y % grasa bajan -> RECOMPOSICIÓN CORPORAL EXITOSA
    elif abs(weight_delta) <= 0.45 and (waist_delta <= -0.4 or bf_delta <= -0.3) and lbm_delta >= 0.0:
        status = "RECOMPOSICION_ACTIVA"
        summary = (
            f"¡Recomposición corporal ideal! Aunque la báscula casi no se movió ({weight_delta:+.2f} kg), "
            f"tu cintura se redujo {abs(waist_delta):.1f} cm, tu % de grasa cambió {bf_delta:+.1f}% y ganaste/conservaste masa magra ({lbm_delta:+.2f} kg)."
            + consistency_note
        )
        action = (
            "No toques nada. Estás oxidando grasa visceral/subcutánea mientras construyes tejido magro y glucógeno. "
            "Mantén exactamente las mismas calorías y distribución de proteína."
        )
        kcal_adj = 0

    # Caso 3: Peso baja moderadamente + % grasa baja + fuerza/masa magra estables -> DEFINICIÓN ÓPTIMA
    elif weight_delta < -0.15 and bf_delta <= -0.1 and lbm_delta >= -0.35 and new_checkin.strength_performance >= 3:
        status = "OPTIMO_DEFINICION"
        summary = (
            f"Progreso óptimo: el % de grasa bajó ({bf_delta:+.1f}%), la cintura varió {waist_delta:+.1f} cm "
            f"y tu masa magra ({lean_mass_kg:.1f} kg) y rendimiento se mantienen sólidos."
            + consistency_note
        )
        action = (
            "Continúa con el presupuesto calórico actual. Tu ritmo de pérdida protege la masa muscular y el rendimiento en carrera."
        )
        kcal_adj = 0

    # Caso 4: Estancamiento (sin bajada de cintura ni % grasa)
    elif abs(waist_delta) < 0.3 and bf_delta >= 0.0 and abs(weight_delta) < 0.35:
        status = "ESTANCAMIENTO"
        summary = (
            f"Meseta detectada: sin reducción en perímetro de cintura ({waist_delta:+.1f} cm) ni en % de grasa ({bf_delta:+.1f}%)."
            + consistency_note
        )
        if new_checkin.energy_level <= 2 or new_checkin.sleep_quality <= 2:
            action = (
                "Reportas fatiga alta o mal sueño: antes de recortar calorías, realiza 5-7 días en calorías de mantenimiento (Diet Break) "
                "y prioriza dormir >7.5h para reducir el cortisol y la retención hídrica."
            )
            kcal_adj = 150
        else:
            action = (
                "Propuesta de ajuste conservador: añade +1,500 pasos diarios o aplica un recorte ligero de -150 kcal en días de descanso, "
                "manteniendo intacta la proteína."
            )
            kcal_adj = -150

    # Caso 5: Subida de grasa y cintura
    else:
        status = "AJUSTE_REQUERIDO"
        summary = (
            f"Variación registrada: peso {weight_delta:+.2f} kg (tendencia EMA {trend_weight_kg:.1f} kg), "
            f"% grasa {bf_delta:+.1f}% y cintura {waist_delta:+.1f} cm."
            + consistency_note
        )
        action = (
            "Revisa la precisión en el registro de porciones del fin de semana y aceites de cocción. "
            "Se sugiere ajustar -150 kcal/día y asegurar el cumplimiento de pasos diarios."
        )
        kcal_adj = -150

    return {
        "trend_weight_kg": trend_weight_kg,
        "lean_mass_kg": lean_mass_kg,
        "fat_mass_kg": fat_mass_kg,
        "assessment_status": status,
        "assessment_summary": summary,
        "recommended_action": action,
        "calorie_adjustment_kcal": kcal_adj,
        "method_margin_warning": method_warning,
    }
