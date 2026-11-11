// ============================================================================
// FitProIA — Motor Cliente + Sincronizador Offline IndexedDB + Conector API
// Garantiza persistencia en el servidor (FastAPI / Supabase) y operación 100%
// funcional en iPhone (Safari Standalone) aún sin conexión a internet.
// ============================================================================

export interface UserProfileData {
  sex: "M" | "F";
  age: number;
  height_cm: number;
  current_weight_kg: number;
  current_body_fat_pct: number | null;
  bf_measurement_method: "DEXA" | "PLIEGUES" | "BIOIMPEDANCIA" | "ESTIMACION_VISUAL";
  target_body_fat_pct: number;
  activity_level: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "ATHLETE";
  target_weekly_loss_pct: number;
  carb_cycling_enabled: boolean;
  protein_g_per_kg: number;
  calorie_backfill_ratio: number;
  injuries_or_restrictions: string;
  primary_sport_focus: string;
}

export interface NutritionTargetsData {
  formula_used: "KATCH_MCARDLE" | "MIFFLIN_ST_JEOR";
  lean_body_mass_kg: number;
  fat_mass_kg: number;
  bmr_kcal: number;
  tdee_base_kcal: number;
  tdee_lower_bound_kcal: number;
  tdee_upper_bound_kcal: number;
  target_daily_kcal: number;
  training_day_kcal: number;
  rest_day_kcal: number;
  min_safe_kcal: number;
  protein_target_g: number;
  protein_per_meal_recommended_g: number;
  fat_target_g: number;
  carbs_training_day_g: number;
  carbs_rest_day_g: number;
  fiber_target_g: number;
  water_target_ml: number;
  daily_steps_target: number;
  estimated_weeks_to_goal: number;
  estimated_goal_date: string;
  warnings: string[];
}

export interface FoodCatalogItem {
  id: string;
  name_es: string;
  category: string;
  region: "CO" | "GLOBAL";
  source: string;
  barcode_ean13?: string | null;
  serving_label: string;
  serving_weight_g: number;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
}

export interface RecipeItem {
  id: string;
  name: string;
  servings: number;
  total_weight_g: number;
  kcal_per_serving: number;
  protein_g_per_serving: number;
  carbs_g_per_serving: number;
  fat_g_per_serving: number;
  fiber_g_per_serving: number;
  ingredients: {
    food_name: string;
    weight_g: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  }[];
}

export type MealCategory =
  | "DESAYUNO"
  | "ALMUERZO"
  | "CENA"
  | "PRE_ENTRENO"
  | "POST_ENTRENO"
  | "SNACK";

export interface MealLogItem {
  id: string;
  log_date: string;
  meal_type: MealCategory;
  custom_food_name: string;
  quantity_g: number;
  portion_description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  client_mutation_id?: string;
  synced?: boolean;
}

export interface StrengthSetItem {
  exercise_name: string;
  muscle_group: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number;
}

export type WorkoutModality =
  | "GYM"
  | "RUNNING"
  | "BICICLETA"
  | "BICICLETA ESTATICA"
  | "HYROX"
  | "CROSSFIT"
  | "BICICLETA ELIPTICA"
  | "CAMINADORA"
  | "OTROS EJERCICIOS"
  | "STRENGTH"
  | "CYCLING"
  | "SWIMMING"
  | "MOBILITY";

export interface WorkoutSessionItem {
  id: string;
  session_date: string;
  title: string;
  modality: WorkoutModality;
  duration_minutes: number;
  session_rpe: number;
  internal_load_au: number;
  estimated_kcal_burned: number;
  distance_km: number;
  avg_pace_sec_per_km: number;
  avg_hr_bpm: number;
  elevation_gain_m: number;
  strength_sets: StrengthSetItem[];
  notes: string;
  client_mutation_id?: string;
}

export interface BodyCheckinItem {
  id: string;
  checkin_date: string;
  weight_kg: number;
  trend_weight_kg: number;
  body_fat_pct: number;
  bf_method: "DEXA" | "PLIEGUES" | "BIOIMPEDANCIA" | "ESTIMACION_VISUAL";
  measurement_conditions: "AYUNAS_MANANA" | "POST_ENTRENO" | "TARDE_HIDRATADO";
  lean_mass_kg: number;
  fat_mass_kg: number;
  waist_cm: number;
  hip_cm: number;
  chest_cm: number;
  arm_cm: number;
  thigh_cm: number;
  energy_level: number;
  sleep_quality: number;
  strength_performance: number;
  notes: string;
  assessment_status:
    | "RECOMPOSICION_ACTIVA"
    | "OPTIMO_DEFINICION"
    | "ALERTA_PERDIDA_MUSCULAR"
    | "ESTANCAMIENTO"
    | "AJUSTE_REQUERIDO"
    | "LINEA_BASE_INICIAL";
  assessment_summary: string;
  recommended_action: string;
  calorie_adjustment_kcal: number;
  method_margin_warning: string;
}

// --- Catálogo Semilla de Alimentos Colombianos y Deportivos ---
export const INITIAL_COLOMBIAN_FOODS: FoodCatalogItem[] = [
  {
    id: "co-arepa-blanca",
    name_es: "Arepa de maíz blanco asada (sin mantequilla)",
    category: "Tradicional Colombiano",
    region: "CO",
    source: "COLOMBIA_CORE",
    barcode_ean13: "7702001001011",
    serving_label: "1 arepa mediana (90g)",
    serving_weight_g: 90,
    kcal_per_100g: 195,
    protein_g_per_100g: 4.6,
    carbs_g_per_100g: 40.5,
    fat_g_per_100g: 1.4,
    fiber_g_per_100g: 2.8,
  },
  {
    id: "co-arepa-choclo",
    name_es: "Arepa de choclo tradicional",
    category: "Tradicional Colombiano",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 unidad (110g)",
    serving_weight_g: 110,
    kcal_per_100g: 235,
    protein_g_per_100g: 5.2,
    carbs_g_per_100g: 42.0,
    fat_g_per_100g: 5.1,
    fiber_g_per_100g: 2.5,
  },
  {
    id: "co-bandeja-paisa",
    name_es: "Bandeja Paisa completa (fríjol, arroz, carne, chicharrón, huevo, arepa)",
    category: "Platos Típicos Colombianos",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 plato estándar (650g)",
    serving_weight_g: 650,
    kcal_per_100g: 215,
    protein_g_per_100g: 9.8,
    carbs_g_per_100g: 19.5,
    fat_g_per_100g: 10.8,
    fiber_g_per_100g: 3.4,
  },
  {
    id: "co-ajiaco",
    name_es: "Ajiaco Santafereño con pollo desmechado y aguacate",
    category: "Platos Típicos Colombianos",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 tazón grande (450g)",
    serving_weight_g: 450,
    kcal_per_100g: 122,
    protein_g_per_100g: 7.6,
    carbs_g_per_100g: 13.8,
    fat_g_per_100g: 4.1,
    fiber_g_per_100g: 2.1,
  },
  {
    id: "co-sancocho",
    name_es: "Sancocho de gallina / pollo colombiano",
    category: "Platos Típicos Colombianos",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 plato hondo (450g)",
    serving_weight_g: 450,
    kcal_per_100g: 115,
    protein_g_per_100g: 8.2,
    carbs_g_per_100g: 12.5,
    fat_g_per_100g: 3.6,
    fiber_g_per_100g: 1.8,
  },
  {
    id: "co-calentado",
    name_es: "Calentado paisa (fríjol y arroz) con 2 huevos",
    category: "Tradicional Colombiano",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 plato mediano (320g)",
    serving_weight_g: 320,
    kcal_per_100g: 158,
    protein_g_per_100g: 8.4,
    carbs_g_per_100g: 20.2,
    fat_g_per_100g: 4.8,
    fiber_g_per_100g: 3.9,
  },
  {
    id: "co-empanada",
    name_es: "Empanada colombiana de carne y papa",
    category: "Antojos Colombianos",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 empanada mediana (85g)",
    serving_weight_g: 85,
    kcal_per_100g: 285,
    protein_g_per_100g: 7.2,
    carbs_g_per_100g: 31.0,
    fat_g_per_100g: 14.8,
    fiber_g_per_100g: 2.2,
  },
  {
    id: "co-patacon-airfryer",
    name_es: "Patacón pisado en Airfryer / Horno",
    category: "Tradicional Colombiano",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 patacón grande (100g)",
    serving_weight_g: 100,
    kcal_per_100g: 165,
    protein_g_per_100g: 1.5,
    carbs_g_per_100g: 36.0,
    fat_g_per_100g: 1.8,
    fiber_g_per_100g: 2.6,
  },
  {
    id: "co-pandebono",
    name_es: "Pandebono valluno horneado",
    category: "Panadería Colombiana",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 unidad (70g)",
    serving_weight_g: 70,
    kcal_per_100g: 310,
    protein_g_per_100g: 8.9,
    carbs_g_per_100g: 38.5,
    fat_g_per_100g: 13.4,
    fiber_g_per_100g: 1.0,
  },
  {
    id: "co-huevos-pericos",
    name_es: "Huevos pericos colombianos (con tomate y cebolla)",
    category: "Proteínas & Desayunos CO",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "3 huevos preparados (180g)",
    serving_weight_g: 180,
    kcal_per_100g: 148,
    protein_g_per_100g: 11.8,
    carbs_g_per_100g: 2.1,
    fat_g_per_100g: 10.2,
    fiber_g_per_100g: 0.5,
  },
  {
    id: "co-quesito",
    name_es: "Quesito antioqueño / Queso campesino",
    category: "Lácteos CO",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 tajada gruesa (60g)",
    serving_weight_g: 60,
    kcal_per_100g: 230,
    protein_g_per_100g: 17.5,
    carbs_g_per_100g: 2.4,
    fat_g_per_100g: 16.8,
    fiber_g_per_100g: 0.0,
  },
  {
    id: "co-frijoles",
    name_es: "Fríjoles rojos colombianos cocidos (sin tocino)",
    category: "Leguminosas CO",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 cucharón / taza (150g)",
    serving_weight_g: 150,
    kcal_per_100g: 127,
    protein_g_per_100g: 8.7,
    carbs_g_per_100g: 22.8,
    fat_g_per_100g: 0.5,
    fiber_g_per_100g: 6.4,
  },
  {
    id: "co-pechuga",
    name_es: "Pechuga de pollo a la plancha (peso cocido)",
    category: "Proteínas Magras",
    region: "CO",
    source: "USDA",
    serving_label: "1 filete grande (180g)",
    serving_weight_g: 180,
    kcal_per_100g: 165,
    protein_g_per_100g: 31.0,
    carbs_g_per_100g: 0.0,
    fat_g_per_100g: 3.6,
    fiber_g_per_100g: 0.0,
  },
  {
    id: "co-solomito",
    name_es: "Lomo de res / Solomito magro asado",
    category: "Proteínas Magras",
    region: "CO",
    source: "USDA",
    serving_label: "1 corte mediano (170g)",
    serving_weight_g: 170,
    kcal_per_100g: 192,
    protein_g_per_100g: 28.5,
    carbs_g_per_100g: 0.0,
    fat_g_per_100g: 8.2,
    fiber_g_per_100g: 0.0,
  },
  {
    id: "co-tilapia",
    name_es: "Tilapia / Mojarra a la plancha u horno",
    category: "Proteínas Magras",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 filete grande (200g)",
    serving_weight_g: 200,
    kcal_per_100g: 128,
    protein_g_per_100g: 26.2,
    carbs_g_per_100g: 0.0,
    fat_g_per_100g: 2.7,
    fiber_g_per_100g: 0.0,
  },
  {
    id: "co-arroz",
    name_es: "Arroz blanco cocido colombiano",
    category: "Carbohidratos Complejos",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 pocillo cocido (150g)",
    serving_weight_g: 150,
    kcal_per_100g: 130,
    protein_g_per_100g: 2.7,
    carbs_g_per_100g: 28.2,
    fat_g_per_100g: 0.3,
    fiber_g_per_100g: 0.4,
  },
  {
    id: "co-papa-criolla",
    name_es: "Papa criolla cocida o en Airfryer",
    category: "Tubérculos CO",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 porción (150g)",
    serving_weight_g: 150,
    kcal_per_100g: 94,
    protein_g_per_100g: 2.2,
    carbs_g_per_100g: 21.0,
    fat_g_per_100g: 0.2,
    fiber_g_per_100g: 2.0,
  },
  {
    id: "co-aguacate-hass",
    name_es: "Aguacate Hass colombiano",
    category: "Grasas Saludables",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "Medio aguacate (80g)",
    serving_weight_g: 80,
    kcal_per_100g: 160,
    protein_g_per_100g: 2.0,
    carbs_g_per_100g: 8.5,
    fat_g_per_100g: 14.7,
    fiber_g_per_100g: 6.7,
  },
  {
    id: "co-bocadillo-veleno",
    name_es: "Bocadillo veleño de guayaba (Pre/Intra-running)",
    category: "Frutas & Energía",
    region: "CO",
    source: "COLOMBIA_CORE",
    serving_label: "1 lonja individual (30g)",
    serving_weight_g: 30,
    kcal_per_100g: 312,
    protein_g_per_100g: 0.6,
    carbs_g_per_100g: 77.0,
    fat_g_per_100g: 0.1,
    fiber_g_per_100g: 3.2,
  },
  {
    id: "co-whey-isolate",
    name_es: "Proteína Whey Isolate (Suero aislado)",
    category: "Suplementación Deportiva",
    region: "GLOBAL",
    source: "OPENFOODFACTS",
    serving_label: "1 scoop colmado (32g)",
    serving_weight_g: 32,
    kcal_per_100g: 375,
    protein_g_per_100g: 81.2,
    carbs_g_per_100g: 4.5,
    fat_g_per_100g: 2.1,
    fiber_g_per_100g: 0.0,
  },
  {
    id: "co-yogur-griego",
    name_es: "Yogur Griego Natural sin azúcar añadido",
    category: "Lácteos Alta Proteína",
    region: "CO",
    source: "OPENFOODFACTS",
    serving_label: "1 vaso (150g)",
    serving_weight_g: 150,
    kcal_per_100g: 68,
    protein_g_per_100g: 10.2,
    carbs_g_per_100g: 3.8,
    fat_g_per_100g: 1.2,
    fiber_g_per_100g: 0.0,
  },
];

// --- Motor Fisiológico Katch-McArdle / Mifflin-St Jeor en Cliente/Servidor ---
export function computeNutritionTargets(profile: UserProfileData): NutritionTargetsData {
  const warnings: string[] = [];
  const weight = profile.current_weight_kg;

  let bmr_kcal = 0;
  let fat_mass_kg = 0;
  let lean_body_mass_kg = 0;
  let formula_used: "KATCH_MCARDLE" | "MIFFLIN_ST_JEOR" = "KATCH_MCARDLE";

  if (profile.current_body_fat_pct !== null && profile.current_body_fat_pct > 0) {
    fat_mass_kg = Number((weight * (profile.current_body_fat_pct / 100)).toFixed(2));
    lean_body_mass_kg = Number((weight - fat_mass_kg).toFixed(2));
    bmr_kcal = Math.round(370 + 21.6 * lean_body_mass_kg);
    formula_used = "KATCH_MCARDLE";
  } else {
    const s = profile.sex === "M" ? 5 : -161;
    bmr_kcal = Math.round(10 * weight + 6.25 * profile.height_cm - 5 * profile.age + s);
    const fallbackBf = profile.sex === "M" ? 18 : 26;
    fat_mass_kg = Number((weight * (fallbackBf / 100)).toFixed(2));
    lean_body_mass_kg = Number((weight - fat_mass_kg).toFixed(2));
    formula_used = "MIFFLIN_ST_JEOR";
    warnings.push(
      "Sin % de grasa ingresado: se activó Mifflin-St Jeor como respaldo. Al ingresar tu % de grasa se prioriza Katch-McArdle."
    );
  }

  const activityMultipliers: Record<string, number> = {
    SEDENTARY: 1.25,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    ATHLETE: 1.85,
  };

  const mult = activityMultipliers[profile.activity_level] ?? 1.725;
  const tdee_base_kcal = Math.round(bmr_kcal * mult);
  const tdee_lower_bound_kcal = Math.round(tdee_base_kcal * 0.95);
  const tdee_upper_bound_kcal = Math.round(tdee_base_kcal * 1.05);

  if (profile.target_weekly_loss_pct > 0.85) {
    warnings.push(
      `El ritmo de ${profile.target_weekly_loss_pct}%/semana es agresivo para un atleta híbrido. Se recomienda 0.4%–0.7%/semana para blindar tu masa muscular.`
    );
  }

  const safeLossPct = Math.min(profile.target_weekly_loss_pct, 1.0);
  const weeklyKgLoss = weight * (safeLossPct / 100);
  const rawDailyDeficit = Math.round((weeklyKgLoss * 7700) / 7);
  const maxDeficit = Math.round(tdee_base_kcal * 0.22);
  const effectiveDeficit = Math.min(rawDailyDeficit, maxDeficit);

  const sexFloor = profile.sex === "M" ? 1550 : 1250;
  const min_safe_kcal = Math.max(bmr_kcal, sexFloor, Math.round(lean_body_mass_kg * 28.5));

  const target_daily_kcal = Math.max(min_safe_kcal, tdee_base_kcal - effectiveDeficit);
  if (tdee_base_kcal - rawDailyDeficit < min_safe_kcal) {
    warnings.push(
      `Salvaguarda clínica activada: Meta ajustada al piso seguro (${min_safe_kcal} kcal) para evitar baja disponibilidad energética (RED-S) y catabolismo muscular.`
    );
  }

  const training_day_kcal = profile.carb_cycling_enabled
    ? Math.round(target_daily_kcal * 1.07)
    : target_daily_kcal;
  const rest_day_kcal = profile.carb_cycling_enabled
    ? Math.max(min_safe_kcal, Math.round(target_daily_kcal * 0.91))
    : target_daily_kcal;

  const proteinGPerKg = Math.max(1.8, Math.min(profile.protein_g_per_kg, 2.5));
  const protein_target_g = Math.round(weight * proteinGPerKg);
  const protein_per_meal_recommended_g = Math.round(protein_target_g / 4);
  const fat_target_g = Math.max(
    Math.round(weight * 0.85),
    Math.round((target_daily_kcal * 0.24) / 9)
  );

  const proteinKcal = protein_target_g * 4;
  const fatKcal = fat_target_g * 9;

  const carbs_training_day_g = Math.round(
    Math.max(240, training_day_kcal - proteinKcal - fatKcal) / 4
  );
  const carbs_rest_day_g = Math.round(
    Math.max(180, rest_day_kcal - proteinKcal - fatKcal) / 4
  );

  const fiber_target_g = Math.max(28, Math.round((target_daily_kcal / 1000) * 14));
  const water_target_ml = Math.round(weight * 35 + 500);

  const currentBf = profile.current_body_fat_pct ?? (profile.sex === "M" ? 18 : 26);
  let estimated_weeks_to_goal = 4;
  if (currentBf > profile.target_body_fat_pct) {
    const targetWeightAtSameLbm =
      lean_body_mass_kg / (1 - profile.target_body_fat_pct / 100);
    const fatToLoseKg = Math.max(0.5, weight - targetWeightAtSameLbm);
    const weeklyFatLossRate = Math.max(0.25, (effectiveDeficit * 7) / 7700);
    estimated_weeks_to_goal = Math.max(2, Math.round(fatToLoseKg / weeklyFatLossRate));
  }

  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + estimated_weeks_to_goal * 7);

  if (profile.injuries_or_restrictions.trim()) {
    warnings.push(
      `Nota de protección articular (${profile.injuries_or_restrictions}): mantén el aporte proteico alto para síntesis de colágeno y recuperación tendinosa.`
    );
  }

  return {
    formula_used,
    lean_body_mass_kg,
    fat_mass_kg,
    bmr_kcal,
    tdee_base_kcal,
    tdee_lower_bound_kcal,
    tdee_upper_bound_kcal,
    target_daily_kcal,
    training_day_kcal,
    rest_day_kcal,
    min_safe_kcal,
    protein_target_g,
    protein_per_meal_recommended_g,
    fat_target_g,
    carbs_training_day_g,
    carbs_rest_day_g,
    fiber_target_g,
    water_target_ml,
    daily_steps_target: 10000,
    estimated_weeks_to_goal,
    estimated_goal_date: goalDate.toISOString().split("T")[0],
    warnings,
  };
}

// --- Evaluador Automático de Chequeos Corporales ---
export function evaluateCheckinLocally(
  input: Omit<
    BodyCheckinItem,
    | "id"
    | "trend_weight_kg"
    | "lean_mass_kg"
    | "fat_mass_kg"
    | "assessment_status"
    | "assessment_summary"
    | "recommended_action"
    | "calorie_adjustment_kcal"
    | "method_margin_warning"
  >,
  history: BodyCheckinItem[]
): BodyCheckinItem {
  const methodWarnings: Record<string, string> = {
    BIOIMPEDANCIA:
      "Báscula de Bioimpedancia (BIA): margen de error típico de ±3% a 4%. Muy sensible al estado de hidratación; mídete siempre en ayunas.",
    PLIEGUES:
      "Pliegues Cutáneos (Antropometría ISAK): margen de error de ±2% a 3% cuando se mide en el mismo estado de hidratación.",
    DEXA:
      "DEXA (Estándar Clínico): margen de error de ±1% a 1.5%. Ideal para calibrar el seguimiento semestral.",
    ESTIMACION_VISUAL:
      "Estimación Visual / Cinta: margen de error de ±4%. Prioriza la tendencia de cintura en cm.",
  };

  const fat_mass_kg = Number(((input.weight_kg * input.body_fat_pct) / 100).toFixed(2));
  const lean_mass_kg = Number((input.weight_kg - fat_mass_kg).toFixed(2));
  const warning = methodWarnings[input.bf_method] ?? methodWarnings.BIOIMPEDANCIA;

  if (history.length === 0) {
    return {
      ...input,
      id: `chk-${Date.now()}`,
      trend_weight_kg: input.weight_kg,
      lean_mass_kg,
      fat_mass_kg,
      assessment_status: "LINEA_BASE_INICIAL",
      assessment_summary: `Chequeo base registrado: ${lean_mass_kg} kg de masa magra y ${fat_mass_kg} kg de masa grasa (${input.body_fat_pct}%).`,
      recommended_action:
        "Mantén el plan durante 14 días asegurando cumplir la meta diaria de proteína.",
      calorie_adjustment_kcal: 0,
      method_margin_warning: warning,
    };
  }

  const sorted = [...history].sort((a, b) =>
    a.checkin_date.localeCompare(b.checkin_date)
  );
  const last = sorted[sorted.length - 1];

  const alpha = 0.35;
  const trend_weight_kg = Number(
    (alpha * input.weight_kg + (1 - alpha) * last.trend_weight_kg).toFixed(2)
  );

  const weightDelta = input.weight_kg - last.weight_kg;
  const bfDelta = input.body_fat_pct - last.body_fat_pct;
  const lbmDelta = lean_mass_kg - last.lean_mass_kg;
  const waistDelta = input.waist_cm - last.waist_cm;

  let consistencyNote = "";
  if (
    last.bf_method !== input.bf_method ||
    last.measurement_conditions !== input.measurement_conditions
  ) {
    consistencyNote = ` (Nota: cambiaste de ${last.bf_method}/${last.measurement_conditions} a ${input.bf_method}/${input.measurement_conditions}; interpreta la variación de % grasa con cautela).`;
  }

  let assessment_status: BodyCheckinItem["assessment_status"] = "OPTIMO_DEFINICION";
  let assessment_summary = "";
  let recommended_action = "";
  let calorie_adjustment_kcal = 0;

  if (weightDelta < -1.1 || (lbmDelta < -0.55 && input.strength_performance <= 2)) {
    assessment_status = "ALERTA_PERDIDA_MUSCULAR";
    assessment_summary = `¡Alerta de pérdida muscular! El peso cayó bruscamente (${weightDelta.toFixed(1)} kg) y la masa magra varió ${lbmDelta.toFixed(2)} kg con fatiga en fuerza.${consistencyNote}`;
    recommended_action =
      "Déficit demasiado agresivo: sube +250 kcal/día (en carbohidratos peri-entreno) y asegura 2.2-2.4 g/kg de proteína.";
    calorie_adjustment_kcal = 250;
  } else if (
    Math.abs(weightDelta) <= 0.45 &&
    (waistDelta <= -0.4 || bfDelta <= -0.3) &&
    lbmDelta >= 0
  ) {
    assessment_status = "RECOMPOSICION_ACTIVA";
    assessment_summary = `¡Recomposición corporal ideal! El peso en báscula apenas varió (${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg), pero tu cintura bajó ${Math.abs(waistDelta).toFixed(1)} cm, tu % de grasa cambió ${bfDelta.toFixed(1)}% y ganaste +${lbmDelta.toFixed(2)} kg de masa magra.${consistencyNote}`;
    recommended_action =
      "No toques nada. Estás perdiendo grasa y construyendo músculo simultáneamente. Mantén calorías y proteína actuales.";
    calorie_adjustment_kcal = 0;
  } else if (weightDelta < -0.15 && bfDelta <= -0.1 && lbmDelta >= -0.35) {
    assessment_status = "OPTIMO_DEFINICION";
    assessment_summary = `Definición óptima: % grasa (${bfDelta.toFixed(1)}%) y cintura (${waistDelta.toFixed(1)} cm) a la baja manteniendo ${lean_mass_kg} kg de masa magra y buen rendimiento.${consistencyNote}`;
    recommended_action =
      "Continúa exactamente con el presupuesto calórico y ciclado actual.";
    calorie_adjustment_kcal = 0;
  } else if (Math.abs(waistDelta) < 0.3 && bfDelta >= 0 && Math.abs(weightDelta) < 0.35) {
    assessment_status = "ESTANCAMIENTO";
    assessment_summary = `Estancamiento detectado: sin cambios significativos en cintura (${waistDelta.toFixed(1)} cm) ni % de grasa (${bfDelta.toFixed(1)}%).${consistencyNote}`;
    recommended_action =
      input.energy_level <= 2
        ? "Fatiga acumulada alta: realiza una pausa de dieta (Diet Break) de 5 días en calorías de mantenimiento."
        : "Ajuste sugerido: incrementa +1,500 pasos/día o recorta -150 kcal en días de descanso.";
    calorie_adjustment_kcal = input.energy_level <= 2 ? 150 : -150;
  } else {
    assessment_status = "AJUSTE_REQUERIDO";
    assessment_summary = `Variación en chequeo: peso ${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg (EMA ${trend_weight_kg} kg), % grasa ${bfDelta >= 0 ? "+" : ""}${bfDelta.toFixed(1)}% y cintura ${waistDelta >= 0 ? "+" : ""}${waistDelta.toFixed(1)} cm.${consistencyNote}`;
    recommended_action =
      "Verifica pesaje de porciones y grasas ocultas. Ajusta -150 kcal/día manteniendo alta la proteína.";
    calorie_adjustment_kcal = -150;
  }

  return {
    ...input,
    id: `chk-${Date.now()}`,
    trend_weight_kg,
    lean_mass_kg,
    fat_mass_kg,
    assessment_status,
    assessment_summary,
    recommended_action,
    calorie_adjustment_kcal,
    method_margin_warning: warning,
  };
}

// --- Almacenamiento IndexedDB (Cola Offline + Caché para iOS Safari) ---
const IDB_NAME = "fitproia_pwa_db";
const IDB_VERSION = 1;

function openFitProDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv_store")) {
        db.createObjectStore("kv_store");
      }
      if (!db.objectStoreNames.contains("outbox_queue")) {
        db.createObjectStore("outbox_queue", { keyPath: "mutationId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openFitProDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction("kv_store", "readwrite");
    tx.objectStore("kv_store").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openFitProDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction("kv_store", "readonly");
    const req = tx.objectStore("kv_store").get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
}

export interface OfflineMutation {
  mutationId: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload: unknown;
  createdAt: string;
}

export async function enqueueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  const db = await openFitProDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction("outbox_queue", "readwrite");
    tx.objectStore("outbox_queue").put(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getOfflineOutbox(): Promise<OfflineMutation[]> {
  const db = await openFitProDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction("outbox_queue", "readonly");
    const req = tx.objectStore("outbox_queue").getAll();
    req.onsuccess = () => resolve((req.result as OfflineMutation[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

export async function clearOfflineMutation(mutationId: string): Promise<void> {
  const db = await openFitProDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction("outbox_queue", "readwrite");
    tx.objectStore("outbox_queue").delete(mutationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
