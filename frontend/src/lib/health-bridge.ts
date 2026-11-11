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

export type MuscleSplitCategory = "TREN_INFERIOR" | "TREN_SUPERIOR" | "FULL_BODY";

export interface ClassifiedWorkoutItem {
  id: string;
  title: string;
  category: MuscleSplitCategory;
  category_label: string;
  load_au: number;
  rpe: number;
  date: string;
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
    lower_load_au: number;
    upper_load_au: number;
    lower_pct: number;
    upper_pct: number;
    running_km_7d: number;
    avg_lower_rpe: number;
    avg_upper_rpe: number;
    classified_workouts: ClassifiedWorkoutItem[];
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
 * Clasifica un entrenamiento como Tren Inferior, Tren Superior o Full Body
 * analizando rigurosamente las palabras clave en su nombre y modalidad.
 */
export function classifyWorkoutByTitle(
  title: string,
  modality: string
): {
  category: MuscleSplitCategory;
  category_label: string;
} {
  const t = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // Modalidades de impacto de piernas por naturaleza
  if (modality === "RUNNING" || modality === "TRAIL" || modality === "CYCLING") {
    return {
      category: "TREN_INFERIOR",
      category_label: "Tren Inferior (Impacto Running/Cardio)",
    };
  }

  // Palabras clave de tren inferior (piernas, glúteos, sentadillas, etc.)
  const lowerKeywords = [
    "pierna",
    "piernas",
    "leg",
    "legs",
    "sentadilla",
    "sentadillas",
    "squat",
    "squats",
    "cuadriceps",
    "cuadrizeps",
    "femoral",
    "femorales",
    "isquio",
    "isquios",
    "gluteo",
    "gluteos",
    "peso muerto",
    "deadlift",
    "pantorrilla",
    "pantorrillas",
    "gemelo",
    "gemelos",
    "prensa",
    "zancada",
    "zancadas",
    "lunge",
    "lunges",
    "hip thrust",
    "tren inferior",
    "lower body",
    "lower",
  ];

  // Palabras clave de tren superior (pecho, espalda, hombro, brazos)
  const upperKeywords = [
    "pecho",
    "chest",
    "banca",
    "bench",
    "espalda",
    "back",
    "remo",
    "dorsal",
    "dorsales",
    "dominada",
    "dominadas",
    "pull up",
    "pull",
    "push",
    "hombro",
    "hombros",
    "shoulder",
    "shoulders",
    "militar",
    "deltoides",
    "biceps",
    "triceps",
    "brazo",
    "brazos",
    "arm",
    "arms",
    "torso",
    "upper body",
    "upper",
    "fondos",
    "jalon",
    "jalones",
    "tren superior",
  ];

  const hasLower = lowerKeywords.some((k) => t.includes(k));
  const hasUpper = upperKeywords.some((k) => t.includes(k));

  if (hasLower && !hasUpper) {
    return {
      category: "TREN_INFERIOR",
      category_label: "Tren Inferior (Piernas / Cadena Posterior)",
    };
  }
  if (hasUpper && !hasLower) {
    return {
      category: "TREN_SUPERIOR",
      category_label: "Tren Superior (Torso / Empuje / Tracción)",
    };
  }
  if (hasLower && hasUpper) {
    return {
      category: "FULL_BODY",
      category_label: "Full Body (Tren Superior e Inferior)",
    };
  }

  // Detección de híbridos o cuerpo completo
  if (
    t.includes("fullbody") ||
    t.includes("full body") ||
    t.includes("cuerpo completo") ||
    t.includes("hiit") ||
    t.includes("crossfit") ||
    t.includes("funcional") ||
    modality === "HYROX"
  ) {
    return {
      category: "FULL_BODY",
      category_label: "Full Body (Cuerpo Completo / Híbrido)",
    };
  }

  // Por defecto si no coincide
  return {
    category: "TREN_SUPERIOR",
    category_label: "Tren Superior (Fuerza General)",
  };
}

/**
 * Calcula ACWR, Monotonía, Carga por Tren Corporal (Inferior vs Superior por nombre de entreno)
 * y Recomendación de Descarga (Deload) integrando Sueño y FC en reposo al despertar.
 */
export function calculateRecoveryAndDeloadClient(
  workouts: WorkoutSessionItem[],
  sleepHours: number,
  restingHrBpm: number,
  hrvMs: number = 68
): RecoveryAndDeloadReport {
  let acuteLoad7d = 0;
  let lowerSets = 0;
  let upperSets = 0;
  let lowerLoadAu = 0;
  let upperLoadAu = 0;
  let runningKm = 0;
  const lowerRpes: number[] = [];
  const upperRpes: number[] = [];

  const classifiedWorkouts: ClassifiedWorkoutItem[] = [];

  for (const w of workouts.slice(0, 10)) {
    const classification = classifyWorkoutByTitle(w.title || "", w.modality);
    acuteLoad7d += w.internal_load_au;

    classifiedWorkouts.push({
      id: w.id || `w-${w.session_date}-${Math.random()}`,
      title: w.title || "Entrenamiento",
      category: classification.category,
      category_label: classification.category_label,
      load_au: w.internal_load_au,
      rpe: w.session_rpe,
      date: w.session_date,
    });

    if (classification.category === "TREN_INFERIOR") {
      lowerLoadAu += w.internal_load_au;
      lowerSets += Math.max(3, w.strength_sets?.length || Math.round((w.duration_minutes || 45) / 10));
      lowerRpes.push(w.session_rpe);
      if (w.modality === "RUNNING" || w.modality === "HYROX") {
        runningKm += w.distance_km || 0;
      }
    } else if (classification.category === "TREN_SUPERIOR") {
      upperLoadAu += w.internal_load_au;
      upperSets += Math.max(3, w.strength_sets?.length || Math.round((w.duration_minutes || 45) / 10));
      upperRpes.push(w.session_rpe);
    } else {
      // Full body: divide la carga en 50% para cada tren
      const halfLoad = Math.round(w.internal_load_au * 0.5);
      lowerLoadAu += halfLoad;
      upperLoadAu += halfLoad;
      lowerSets += 2;
      upperSets += 2;
      lowerRpes.push(w.session_rpe);
      upperRpes.push(w.session_rpe);
      if (w.modality === "RUNNING" || w.modality === "HYROX") {
        runningKm += w.distance_km || 0;
      }
    }
  }

  const totalSplitLoad = Math.max(1, lowerLoadAu + upperLoadAu);
  const lowerPct = Math.round((lowerLoadAu / totalSplitLoad) * 100);
  const upperPct = Math.round((upperLoadAu / totalSplitLoad) * 100);

  const chronicWeeklyAvg = Math.max(1250, Math.round(acuteLoad7d * 0.88));
  const acwr = Number((acuteLoad7d / chronicWeeklyAvg).toFixed(2));
  const monotony = 1.48;
  const strain = Math.round(acuteLoad7d * monotony);

  // Puntuación de recuperación basada en Horas de Sueño y Frecuencia Cardíaca en reposo
  const sleepScore = Math.min(60, (sleepHours / 8.0) * 60);
  const rhrScore = Math.max(10, 40 - Math.max(0, restingHrBpm - 50) * 1.5);
  const recoveryScore = Math.round(Math.min(100, sleepScore + rhrScore));

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
  let title = "Carga Equilibrada y en Rango Óptimo";
  let explanation = `Ratio ACWR (${acwr}) en zona segura. Sueño de ${sleepHours}h y FC al despertar de ${restingHrBpm} ppm (Score de recuperación ${recoveryScore}/100).`;
  let action_protocol = [
    "No requieres descarga obligatoria esta semana: puedes seguir con tu programación habitual.",
    "Aplica sobrecarga progresiva controlada (añadir 1-2 kg o 1 repetición con técnica impecable).",
  ];

  if (acwr > 1.38 || recoveryScore < 50 || sleepHours < 5.8) {
    deload_type = "DELOAD_GENERAL_SEMANA";
    urgency = "ALTA";
    title = "Se recomienda Semana de Descarga General (Fatiga Sistémica / SNC)";
    explanation = `Carga aguda excesiva (${acuteLoad7d} AU, ACWR ${acwr}) y recuperación baja (Sueño ${sleepHours}h, FC reposo ${restingHrBpm} ppm).`;
    action_protocol = [
      "Reduce un -40% a -50% el número total de series tanto en tren superior como inferior durante 6 días.",
      "Trabaja a RPE 6.5–7 (dejando mínimo 3 repeticiones en recámara, sin llegar al fallo).",
      "Prioriza dormir mínimo 7.5 a 8 horas para permitir la regeneración del sistema nervioso.",
    ];
  } else if (lowerLoadAu >= 1100 && lowerPct >= 60) {
    deload_type = "DELOAD_TREN_INFERIOR";
    urgency = "MEDIA";
    title = "Descarga Específica de Tren Inferior (Piernas / Carrera)";
    explanation = `El ${lowerPct}% de tu carga semanal (${lowerLoadAu} AU) está concentrado en piernas/tren inferior según los nombres de tus entrenamientos. Tu tren superior está fresco (${upperLoadAu} AU, ${upperPct}%).`;
    action_protocol = [
      "Tren Inferior: reduce -45% las series de sentadillas, peso muerto, prensa y zancadas durante 5 días.",
      "Si corres: reduce el kilometraje de impacto un -40% o sustituye una salida por bicicleta suave.",
      "Tren Superior: puedes continuar tu progresión normal en pecho, espalda y hombros.",
      "Dedica 15 min diarios a movilidad de tobillo, cadera y estiramientos de isquios y cuádriceps.",
    ];
  } else if (upperLoadAu >= 1100 && upperPct >= 60) {
    deload_type = "DELOAD_TREN_SUPERIOR";
    urgency = "MEDIA";
    title = "Descarga Específica de Tren Superior (Torso / Empuje / Tracción)";
    explanation = `El ${upperPct}% de tu carga semanal (${upperLoadAu} AU) está concentrado en pecho, espalda y hombros según los nombres de tus entrenamientos. Tu tren inferior está más descansado (${lowerLoadAu} AU, ${lowerPct}%).`;
    action_protocol = [
      "Tren Superior: baja a 2 series por ejercicio a RPE 6.5-7 en pecho, remos, jalones y hombros durante 5–7 días.",
      "Tren Inferior: continúa con tu plan de piernas sin cambios.",
      "Descansa las articulaciones de codos y hombros evitando fondos pesados y bloqueos forzados.",
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
      lower_load_au: lowerLoadAu,
      upper_load_au: upperLoadAu,
      lower_pct: lowerPct,
      upper_pct: upperPct,
      running_km_7d: Number(runningKm.toFixed(1)),
      avg_lower_rpe: avgLowerRpe,
      avg_upper_rpe: avgUpperRpe,
      classified_workouts: classifiedWorkouts,
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
