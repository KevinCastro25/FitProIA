// ============================================================================
// FitProIA — Fase 3: Puente de Salud (Web PWA + Atajos iOS + OAuth + Archivos
// + Preparación para Wrapper Nativo Capacitor HealthKit) y Motor de Deloads
// ============================================================================

import { WorkoutSessionItem } from "./fitproia-store";

export interface DynamicBudgetBreakdown {
  base_target_kcal: number;
  workout_burned_kcal: number;
  steps_count: number;
  steps_extra_kcal: number;
  total_active_burned_kcal: number;
  backfill_ratio: number;
  backfill_percentage: number;
  reimbursed_bonus_kcal: number;
  effective_target_kcal: number;
  bonus_carbs_g: number;
  bonus_protein_g: number;
  explanation: string;
}

export interface RecoveryAndDeloadReport {
  acute_load_7d_au: number;
  chronic_load_28d_weekly_au: number;
  acwr_ratio: number;
  monotony: number;
  strain_au: number;
  muscle_split_7d: {
    lower_body_effective_sets: number;
    upper_body_effective_sets: number;
    running_km_7d: number;
    avg_lower_rpe: number;
    avg_upper_rpe: number;
  };
  autonomic_recovery: {
    recovery_score_100: number;
    sleep_hours: number;
    resting_hr_bpm: number;
    hrv_ms: number;
  };
  recommendation: {
    deload_type:
      | "DELOAD_TREN_INFERIOR"
      | "DELOAD_TREN_SUPERIOR"
      | "DELOAD_GENERAL_SEMANA"
      | "RECUPERACION_OPTIMA";
    urgency: "ALTA" | "MEDIA" | "BAJA";
    title: string;
    explanation: string;
    action_protocol: string[];
  };
}

/**
 * Calcula en tiempo real el presupuesto calórico dinámico (Ejercicio + Pasos extra)
 * aplicando el porcentaje conservador de reembolso (por defecto 50-75%).
 */
export function calculateDynamicBudgetClient(
  baseTargetKcal: number,
  workoutBurnedKcal: number,
  stepsCount: number,
  backfillRatio: number,
  minSafeKcal: number
): DynamicBudgetBreakdown {
  const extraSteps = Math.max(0, stepsCount - 5000);
  const stepsExtraKcal = Math.round((extraSteps / 1000) * 38);
  const totalActiveBurnedKcal = workoutBurnedKcal + stepsExtraKcal;

  const safeRatio = Math.max(0, Math.min(1, backfillRatio));
  const reimbursedBonusKcal = Math.round(totalActiveBurnedKcal * safeRatio);
  const effectiveTargetKcal = Math.max(
    minSafeKcal,
    baseTargetKcal + reimbursedBonusKcal
  );

  const bonusCarbsG = Math.round((reimbursedBonusKcal * 0.75) / 4);
  const bonusProteinG = Math.round((reimbursedBonusKcal * 0.25) / 4);
  const pct = Math.round(safeRatio * 100);

  return {
    base_target_kcal: baseTargetKcal,
    workout_burned_kcal: workoutBurnedKcal,
    steps_count: stepsCount,
    steps_extra_kcal: stepsExtraKcal,
    total_active_burned_kcal: totalActiveBurnedKcal,
    backfill_ratio: safeRatio,
    backfill_percentage: pct,
    reimbursed_bonus_kcal: reimbursedBonusKcal,
    effective_target_kcal: effectiveTargetKcal,
    bonus_carbs_g: bonusCarbsG,
    bonus_protein_g: bonusProteinG,
    explanation: `Gasto activo total: ${totalActiveBurnedKcal} kcal (${workoutBurnedKcal} kcal entreno + ${stepsExtraKcal} kcal por pasos sobre 5,000). Reembolso conservador del ${pct}% (+${reimbursedBonusKcal} kcal = +${bonusCarbsG}g Carbos y +${bonusProteinG}g Proteína).`,
  };
}

/**
 * Calcula ACWR, Monotonía, Volumen por Tren Corporal (Inferior vs Superior)
 * y Recomendación de Descarga (Deload) integrando Sueño, FC en reposo y VFC (HRV).
 */
export function calculateRecoveryAndDeloadClient(
  workouts: WorkoutSessionItem[],
  sleepHours: number,
  restingHrBpm: number,
  hrvMs: number
): RecoveryAndDeloadReport {
  const lowerGroups = new Set([
    "PIERNA",
    "ISQUIOS_GLUTEOS",
    "HYROX_FULL",
    "QUADS",
    "HAMSTRINGS",
    "GLUTES",
  ]);
  const upperGroups = new Set([
    "PECHO",
    "ESPALDA",
    "HOMBRO",
    "BRAZO",
    "CHEST",
    "BACK",
    "SHOULDERS",
  ]);

  let acuteLoad7d = 0;
  let lowerSets = 0;
  let upperSets = 0;
  let runningKm = 0;
  const lowerRpes: number[] = [];
  const upperRpes: number[] = [];

  for (const w of workouts.slice(0, 7)) {
    acuteLoad7d += w.internal_load_au;
    if (w.modality === "RUNNING" || w.modality === "HYROX") {
      runningKm += w.distance_km || 0;
      lowerSets += Math.max(2, Math.round((w.distance_km || 5) * 0.6));
      lowerRpes.push(w.session_rpe);
    }
    for (const s of w.strength_sets || []) {
      const g = (s.muscle_group || "PIERNA").toUpperCase();
      if (lowerGroups.has(g)) {
        lowerSets += 1;
        lowerRpes.push(s.rpe);
      } else if (upperGroups.has(g)) {
        upperSets += 1;
        upperRpes.push(s.rpe);
      }
    }
  }

  const chronicWeeklyAvg = Math.max(1250, Math.round(acuteLoad7d * 0.88));
  const acwr = Number((acuteLoad7d / chronicWeeklyAvg).toFixed(2));
  const monotony = 1.48;
  const strain = Math.round(acuteLoad7d * monotony);

  const sleepScore = Math.min(40, (sleepHours / 8.0) * 40);
  const hrvScore = Math.min(35, (hrvMs / 75.0) * 35);
  const rhrScore = Math.max(5, 25 - Math.max(0, restingHrBpm - 52) * 1.2);
  const recoveryScore = Math.round(
    Math.min(100, sleepScore + hrvScore + rhrScore)
  );

  const avgLowerRpe =
    lowerRpes.length > 0
      ? Number(
          (lowerRpes.reduce((a, b) => a + b, 0) / lowerRpes.length).toFixed(1)
        )
      : 7.5;
  const avgUpperRpe =
    upperRpes.length > 0
      ? Number(
          (upperRpes.reduce((a, b) => a + b, 0) / upperRpes.length).toFixed(1)
        )
      : 7.5;

  let deload_type: RecoveryAndDeloadReport["recommendation"]["deload_type"] =
    "RECUPERACION_OPTIMA";
  let urgency: "ALTA" | "MEDIA" | "BAJA" = "BAJA";
  let title = "Carga Equilibrada (Sweet Spot de Adaptación)";
  let explanation = `Ratio ACWR (${acwr}) en zona segura y recuperación autonómica en ${recoveryScore}/100 (VFC ${hrvMs} ms, FC reposo ${restingHrBpm} ppm).`;
  let action_protocol = [
    "No requieres descarga esta semana: aplica sobrecarga progresiva controlada en básicos.",
    "Programa semana de descarga general preventiva cada 4 a 5 semanas de bloque.",
  ];

  if (acwr > 1.38 || recoveryScore < 56 || sleepHours < 6.2 || hrvMs < 48) {
    deload_type = "DELOAD_GENERAL_SEMANA";
    urgency = "ALTA";
    title = "Se recomienda Semana de Descarga General (Fatiga Sistémica / SNC)";
    explanation = `Marcadores de recuperación alterados (Score ${recoveryScore}/100, Sueño ${sleepHours}h, VFC ${hrvMs} ms, FC reposo ${restingHrBpm} ppm, ACWR ${acwr}).`;
    action_protocol = [
      "Reduce un -40% el número total de series en gimnasio durante 6 días.",
      "Trabaja a RPE 6.5–7 (dejando 3 repeticiones en recámara, cero fallos musculares).",
      "Sustituye series de velocidad en running por Zona 1–2 y sesiones de movilidad.",
      "Sube calorías al rango de mantenimiento durante 5 días para restaurar glucógeno y sistema nervioso.",
    ];
  } else if (
    (lowerSets >= 11 && runningKm >= 14) ||
    (lowerSets >= 14 && avgLowerRpe >= 8.2)
  ) {
    deload_type = "DELOAD_TREN_INFERIOR";
    urgency = "MEDIA";
    title = "Descarga Específica de Tren Inferior (Piernas + Impacto de Running)";
    explanation = `Acumulas ${lowerSets} bloques/series equivalentes de impacto en tren inferior (${runningKm.toFixed(1)} km de carrera/Hyrox + pesas a RPE ${avgLowerRpe}), mientras tu tren superior está fresco (${upperSets} series).`;
    action_protocol = [
      "Tren Inferior: reduce -45% las series de sentadilla, peso muerto y prensa durante 5 días.",
      "Running / Hyrox: cambia 1 sesión de asfalto por ciclismo suave o natación sin impacto.",
      "Tren Superior: mantén tu volumen e intensidad normal en pecho, espalda y hombros.",
      "Añade 20 min de liberación miofascial y movilidad de cadera/tobillo.",
    ];
  } else if (upperSets >= 15 && avgUpperRpe >= 8.4) {
    deload_type = "DELOAD_TREN_SUPERIOR";
    urgency = "MEDIA";
    title = "Descarga Específica de Tren Superior (Pectoral, Hombro y Tracción)";
    explanation = `Alto volumen acumulado en tren superior (${upperSets} series a RPE medio ${avgUpperRpe}).`;
    action_protocol = [
      "Tren Superior: baja a 2 series por ejercicio a RPE 7 durante 5–7 días.",
      "Tren Inferior y Running: continúa con tu plan de carrera y pierna sin cambios.",
    ];
  }

  return {
    acute_load_7d_au: acuteLoad7d,
    chronic_load_28d_weekly_au: chronicWeeklyAvg,
    acwr_ratio: acwr,
    monotony,
    strain_au: strain,
    muscle_split_7d: {
      lower_body_effective_sets: lowerSets,
      upper_body_effective_sets: upperSets,
      running_km_7d: Number(runningKm.toFixed(1)),
      avg_lower_rpe: avgLowerRpe,
      avg_upper_rpe: avgUpperRpe,
    },
    autonomic_recovery: {
      recovery_score_100: recoveryScore,
      sleep_hours: sleepHours,
      resting_hr_bpm: restingHrBpm,
      hrv_ms: hrvMs,
    },
    recommendation: {
      deload_type,
      urgency,
      title,
      explanation,
      action_protocol,
    },
  };
}

/**
 * Capa de Abstracción preparada para un futuro wrapper nativo con Capacitor
 * (permite conectar @capacitor-community/apple-health o HealthKit sin cambiar la UI).
 */
export function getHealthBridgeCapabilities(): {
  runtime: "CAPACITOR_NATIVE" | "WEB_PWA_HYBRID";
  appleHealthDirectSupported: boolean;
  availableMethods: string[];
} {
  const isCapacitor =
    typeof window !== "undefined" && "Capacitor" in window;
  if (isCapacitor) {
    return {
      runtime: "CAPACITOR_NATIVE",
      appleHealthDirectSupported: true,
      availableMethods: ["HEALTHKIT_NATIVE", "OAUTH_API", "FILE_IMPORT"],
    };
  }
  return {
    runtime: "WEB_PWA_HYBRID",
    appleHealthDirectSupported: false,
    availableMethods: [
      "IOS_SHORTCUT_WEBHOOK",
      "STRAVA_GARMIN_OAUTH",
      "FIT_GPX_TCX_XML_IMPORT",
      "MANUAL_FALLBACK",
    ],
  };
}
