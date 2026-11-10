"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame,
  Utensils,
  Dumbbell,
  TrendingDown,
  UserCheck,
  Droplets,
  Footprints,
  Smartphone,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trophy,
} from "lucide-react";
import {
  INITIAL_COLOMBIAN_FOODS,
  UserProfileData,
  FoodCatalogItem,
  RecipeItem,
  MealLogItem,
  WorkoutSessionItem,
  BodyCheckinItem,
  computeNutritionTargets,
  evaluateCheckinLocally,
  idbGet,
  idbSet,
  enqueueOfflineMutation,
  getOfflineOutbox,
  clearOfflineMutation,
} from "@/lib/fitproia-store";
import { IosInstallGuideModal } from "@/components/IosInstallGuideModal";
import { NutritionMealsView } from "@/components/NutritionMealsView";
import { WorkoutsTrackerView } from "@/components/WorkoutsTrackerView";
import { BodyCheckinsView } from "@/components/BodyCheckinsView";
import { ProfileCalculatorView } from "@/components/ProfileCalculatorView";
import { calculateDynamicBudgetClient } from "@/lib/health-bridge";
import { AUTH_ENABLED, signOut } from "@/lib/supabase";
import { CompetitionsAndRedsView } from "@/components/CompetitionsAndRedsView";
import { CoachHealthExtrasView } from "@/components/CoachHealthExtrasView";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type NavTab = "diario" | "comidas" | "entreno" | "progreso" | "coach" | "perfil";

export default function FitProIAPwaApp() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [activeTab, setActiveTab] = useState<NavTab>("diario");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Estado PWA / iOS Standalone / Red
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  // Estado de Dominio (Sincronizado con Servidor FastAPI/Supabase + IndexedDB)
  // Inicia limpio desde 0
  const [profile, setProfile] = useState<UserProfileData>({
    sex: "M",
    age: 28,
    height_cm: 170,
    current_weight_kg: 70.0,
    current_body_fat_pct: null,
    bf_measurement_method: "ESTIMACION_VISUAL",
    target_body_fat_pct: 12.0,
    activity_level: "MODERATE",
    target_weekly_loss_pct: 0.5,
    carb_cycling_enabled: true,
    protein_g_per_kg: 2.0,
    calorie_backfill_ratio: 0.6,
    injuries_or_restrictions: "",
    primary_sport_focus: "HYBRID_GYM_RUNNING",
  });

  const [foods, setFoods] = useState<FoodCatalogItem[]>(INITIAL_COLOMBIAN_FOODS);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [meals, setMeals] = useState<MealLogItem[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSessionItem[]>([]);
  const [waterMl, setWaterMl] = useState<number>(0);
  const [stepsCount, setStepsCount] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [restingHrBpm, setRestingHrBpm] = useState<number>(55);
  const [hrvMs, setHrvMs] = useState<number>(65);
  const [checkins, setCheckins] = useState<BodyCheckinItem[]>([]);

  const targets = computeNutritionTargets(profile);

  // Sincronización de Cola Offline IndexedDB -> Servidor FastAPI
  const flushOfflineOutbox = useCallback(async () => {
    const queue = await getOfflineOutbox();
    setPendingOfflineCount(queue.length);
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        const res = await fetch(`${API_BASE}${item.endpoint}`, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          await clearOfflineMutation(item.mutationId);
        }
      } catch {
        break;
      }
    }
    const remaining = await getOfflineOutbox();
    setPendingOfflineCount(remaining.length);
  }, []);

  // Registro de Service Worker + Detección de modo Standalone en iPhone + Carga inicial
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standaloneMatch =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standaloneMatch);
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineOutbox();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cargar caché de IndexedDB primero y luego sincronizar desde FastAPI / Supabase
    (async () => {
      if (AUTH_ENABLED) {
        // Cuenta real: no mostrar datos de demostración
        setMeals([]);
        setWorkouts([]);
        setCheckins([]);
      }
      const cachedProfile = await idbGet<UserProfileData>("profile");
      if (cachedProfile) setProfile(cachedProfile);
      const cachedMeals = await idbGet<MealLogItem[]>("meals");
      if (cachedMeals && cachedMeals.length > 0) setMeals(cachedMeals);
      const cachedWorkouts = await idbGet<WorkoutSessionItem[]>("workouts");
      if (cachedWorkouts && cachedWorkouts.length > 0) setWorkouts(cachedWorkouts);
      const cachedCheckins = await idbGet<BodyCheckinItem[]>("checkins");
      if (cachedCheckins && cachedCheckins.length > 0) setCheckins(cachedCheckins);

      try {
        const [profRes, foodsRes, mealsRes, workRes, chkRes] = await Promise.all([
          fetch(`${API_BASE}/profile`),
          fetch(`${API_BASE}/foods`),
          fetch(`${API_BASE}/meals?log_date=${todayStr}`),
          fetch(`${API_BASE}/workouts`),
          fetch(`${API_BASE}/checkins`),
        ]);
        if (profRes.ok) {
          const data = await profRes.json();
          setProfile(data.profile);
          await idbSet("profile", data.profile);
        }
        if (foodsRes.ok) {
          const data = await foodsRes.json();
          if (data.length > 0) setFoods(data);
        }
        if (mealsRes.ok) {
          const data = await mealsRes.json();
          if (data.length > 0) {
            setMeals(data);
            await idbSet("meals", data);
          }
        }
        if (workRes.ok) {
          const data = await workRes.json();
          if (data.length > 0) {
            setWorkouts(data);
            await idbSet("workouts", data);
          }
        }
        if (chkRes.ok) {
          const data = await chkRes.json();
          if (data.length > 0) {
            setCheckins(data);
            await idbSet("checkins", data);
          }
        }
      } catch {
        // Si el backend no está alcanzable, opera con la caché IndexedDB sin interrupción
      }
    })();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushOfflineOutbox, todayStr]);

  // Cálculos del Diario de Hoy
  const mealsForDate = meals.filter((m) => m.log_date === selectedDate);
  const workoutsForDate = workouts.filter((w) => w.session_date === selectedDate);

  const consumedKcal = mealsForDate.reduce((acc, m) => acc + m.kcal, 0);
  const consumedProtein = Number(
    mealsForDate.reduce((acc, m) => acc + m.protein_g, 0).toFixed(1)
  );
  const consumedCarbs = Number(
    mealsForDate.reduce((acc, m) => acc + m.carbs_g, 0).toFixed(1)
  );
  const consumedFat = Number(
    mealsForDate.reduce((acc, m) => acc + m.fat_g, 0).toFixed(1)
  );
  const consumedFiber = Number(
    mealsForDate.reduce((acc, m) => acc + m.fiber_g, 0).toFixed(1)
  );

  const burnedWorkoutKcal = workoutsForDate.reduce(
    (acc, w) => acc + w.estimated_kcal_burned,
    0
  );
  const isTrainingDay = workoutsForDate.length > 0;
  const baseBudgetKcal = isTrainingDay
    ? targets.training_day_kcal
    : targets.rest_day_kcal;

  // Recálculo dinámico de calorías (Ejercicio + Pasos NEAT > 5,000 con reembolso conservador 50-75%)
  const dynamicBudget = calculateDynamicBudgetClient(
    baseBudgetKcal,
    burnedWorkoutKcal,
    stepsCount,
    profile.calorie_backfill_ratio,
    targets.min_safe_kcal
  );
  const dynamicBonusKcal = dynamicBudget.reimbursed_bonus_kcal;
  const effectiveBudgetKcal = dynamicBudget.effective_target_kcal;
  const remainingKcal = effectiveBudgetKcal - consumedKcal;
  const carbsGoalG = Number(
    (
      (isTrainingDay ? targets.carbs_training_day_g : targets.carbs_rest_day_g) +
      dynamicBudget.bonus_carbs_g
    ).toFixed(1)
  );
  const effectiveProteinGoalG = Number(
    (targets.protein_target_g + dynamicBudget.bonus_protein_g).toFixed(1)
  );

  const remainingProteinG = Math.max(
    0,
    Math.round(effectiveProteinGoalG - consumedProtein)
  );

  // Handlers de Mutación con Soporte Offline IndexedDB + Servidor
  const handleLogMeal = async (newMeal: Omit<MealLogItem, "id">) => {
    const mutationId = `mut-meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const item: MealLogItem = {
      ...newMeal,
      id: mutationId,
      client_mutation_id: mutationId,
    };
    const updated = [...meals, item];
    setMeals(updated);
    await idbSet("meals", updated);

    try {
      const res = await fetch(`${API_BASE}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Offline queue");
    } catch {
      await enqueueOfflineMutation({
        mutationId,
        endpoint: "/meals",
        method: "POST",
        payload: item,
        createdAt: new Date().toISOString(),
      });
      const q = await getOfflineOutbox();
      setPendingOfflineCount(q.length);
    }
  };

  const handleLogMultipleMeals = async (newMealsList: Omit<MealLogItem, "id">[]) => {
    const createdItems: MealLogItem[] = newMealsList.map((m, idx) => {
      const mutId = `mut-ai-${Date.now()}-${idx}`;
      return {
        ...m,
        id: mutId,
        client_mutation_id: mutId,
      };
    });
    const updated = [...meals, ...createdItems];
    setMeals(updated);
    await idbSet("meals", updated);
  };

  const handleDeleteMeal = async (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    await idbSet("meals", updated);
    try {
      await fetch(`${API_BASE}/meals/${id}`, { method: "DELETE" });
    } catch {
      // Ignorar si era local
    }
  };

  const handleSaveWorkout = async (newWorkout: Omit<WorkoutSessionItem, "id">) => {
    const mutationId = `mut-work-${Date.now()}`;
    const item: WorkoutSessionItem = {
      ...newWorkout,
      id: mutationId,
      client_mutation_id: mutationId,
    };
    const updated = [item, ...workouts];
    setWorkouts(updated);
    await idbSet("workouts", updated);

    try {
      const res = await fetch(`${API_BASE}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWorkout,
          client_mutation_id: mutationId,
        }),
      });
      if (!res.ok) throw new Error("Offline workout queue");
    } catch {
      await enqueueOfflineMutation({
        mutationId,
        endpoint: "/workouts",
        method: "POST",
        payload: { ...newWorkout, client_mutation_id: mutationId },
        createdAt: new Date().toISOString(),
      });
      const q = await getOfflineOutbox();
      setPendingOfflineCount(q.length);
    }
  };

  const handleAddCheckin = async (
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
    >
  ) => {
    const evaluated = evaluateCheckinLocally(input, checkins);
    const updated = [...checkins, evaluated];
    setCheckins(updated);
    setProfile((prev) => ({
      ...prev,
      current_weight_kg: input.weight_kg,
      current_body_fat_pct: input.body_fat_pct,
      bf_measurement_method: input.bf_method,
    }));
    await idbSet("checkins", updated);

    try {
      await fetch(`${API_BASE}/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } catch {
      await enqueueOfflineMutation({
        mutationId: evaluated.id,
        endpoint: "/checkins",
        method: "POST",
        payload: input,
        createdAt: new Date().toISOString(),
      });
      const q = await getOfflineOutbox();
      setPendingOfflineCount(q.length);
    }
  };

  const handleSaveProfile = async (newProf: UserProfileData) => {
    setProfile(newProf);
    await idbSet("profile", newProf);
    try {
      await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProf),
      });
    } catch {
      await enqueueOfflineMutation({
        mutationId: `mut-prof-${Date.now()}`,
        endpoint: "/profile",
        method: "PUT",
        payload: newProf,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleExportDataJson = () => {
    const bundle = {
      app: "FitProIA",
      exported_at: new Date().toISOString(),
      profile,
      nutrition_targets: targets,
      body_checkins: checkins,
      workouts,
      meals,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitproia-datos-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    // Limpiar la caché local para que otro usuario del mismo dispositivo no vea estos datos
    for (const key of ["profile", "meals", "workouts", "checkins"]) {
      await idbSet(key, key === "profile" ? null : []);
    }
    await signOut();
  };

  const handleExportCsv = () => {
    const rows = [
      "tipo,fecha,descripcion,kcal,proteina_g,carbs_g,grasa_g",
      ...meals.map(
        (m) =>
          `comida,${m.log_date},"${m.custom_food_name ?? ""}",${m.kcal},${m.protein_g},${m.carbs_g},${m.fat_g}`
      ),
      ...workouts.map(
        (w) => `entreno,${w.session_date},"${w.title}",${-w.estimated_kcal_burned},,,`
      ),
      ...checkins.map(
        (c) =>
          `chequeo,${c.checkin_date},"peso ${c.weight_kg}kg grasa ${c.body_fat_pct}% cintura ${c.waist_cm}cm",,,,`
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitproia-reporte-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Cabecera Fija Tipo App Nativa iPhone con Safe Area */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl pt-safe">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black text-base shadow-md shadow-emerald-500/20">
              FP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">
                  FitProIA
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Meta: {profile.target_body_fat_pct}% Grasa
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Estado de Conexión y Cola Offline */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                isOnline
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-300"
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isOnline
                  ? pendingOfflineCount > 0
                    ? `Sincronizando (${pendingOfflineCount})`
                    : "Sincronizado"
                  : `Offline (${pendingOfflineCount} en cola)`}
              </span>
            </div>

            {/* Botón Guía de Instalación en iPhone */}
            <button
              type="button"
              onClick={() => setInstallModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500 transition"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>{isStandalone ? "PWA Activa" : "Instalar en iPhone"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal por Pestaña */}
      <main className="mx-auto max-w-5xl px-4 pt-4 space-y-5">
        {/* ================================================================
            PESTAÑA 1: DIARIO & DASHBOARD DE RECOMPOSICIÓN CORPORAL
           ================================================================ */}
        {activeTab === "diario" && (
          <div className="space-y-5">
            {/* Banner de Instalación en iPhone si no está en modo standalone */}
            {!isStandalone && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Instala FitProIA en la pantalla de inicio de tu iPhone
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Obtén pantalla completa sin barra de Safari, acceso rápido con una
                      mano y soporte Offline en el gimnasio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstallModalOpen(true)}
                  className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Ver cómo
                </button>
              </div>
            )}

            {/* Tarjeta Principal de Presupuesto Calórico Dinámico y Rango de Mantenimiento */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    {isTrainingDay
                      ? "Día de Entrenamiento (Carbohidratos Ciclados +)"
                      : "Día de Descanso / Recuperación"}
                  </span>
                  <h2 className="text-lg font-extrabold text-white">
                    Balance Energético y Protección Muscular
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">
                    Rango de Mantenimiento (±5%)
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {targets.tdee_lower_bound_kcal} – {targets.tdee_upper_bound_kcal}{" "}
                    kcal/día
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Anillo de Calorías y Desglose */}
                <div className="md:col-span-5 flex items-center gap-4 rounded-2xl bg-slate-950/90 p-4 border border-slate-800/80">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-emerald-500/20">
                    <div className="text-center">
                      <span className="text-lg font-black text-white block leading-none">
                        {remainingKcal >= 0 ? remainingKcal : 0}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">
                        kcal libres
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs flex-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Meta base déficit:</span>
                      <strong className="text-white">{baseBudgetKcal} kcal</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Reembolso act. ({Math.round(profile.calorie_backfill_ratio * 100)}
                        %):
                      </span>
                      <strong className="text-amber-400">
                        +{dynamicBonusKcal} kcal
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] text-slate-500">
                        Entreno {burnedWorkoutKcal} + NEAT {dynamicBudget.steps_extra_kcal} kcal
                      </span>
                      <div className="flex gap-1">
                        {[0.5, 0.6, 0.75].map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() =>
                              setProfile((prev) => ({
                                ...prev,
                                calorie_backfill_ratio: ratio,
                              }))
                            }
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              Math.abs(profile.calorie_backfill_ratio - ratio) < 0.02
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            {Math.round(ratio * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1">
                      <span className="text-slate-300 font-semibold">
                        Presupuesto hoy:
                      </span>
                      <strong className="text-emerald-400">
                        {effectiveBudgetKcal} kcal
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Consumidas:</span>
                      <strong className="text-white">{consumedKcal} kcal</strong>
                    </div>
                  </div>
                </div>

                {/* Barras de Macronutrientes con Prioridad en Proteína Alta */}
                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Proteína */}
                  <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-emerald-500/30">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-400">Proteína ★</span>
                      <span className="text-slate-400">
                        {profile.protein_g_per_kg}g/kg
                      </span>
                    </div>
                    <p className="text-base font-black text-white">
                      {consumedProtein} / {effectiveProteinGoalG}g
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (consumedProtein / effectiveProteinGoalG) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Carbohidratos Ciclados */}
                  <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-sky-400">Carbos</span>
                      <span className="text-slate-400">Ciclados</span>
                    </div>
                    <p className="text-base font-black text-white">
                      {consumedCarbs} / {carbsGoalG}g
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((consumedCarbs / carbsGoalG) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Grasas Saludables */}
                  <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-amber-400">Grasas</span>
                      <span className="text-slate-400">Hormonal</span>
                    </div>
                    <p className="text-base font-black text-white">
                      {consumedFat} / {targets.fat_target_g}g
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((consumedFat / targets.fat_target_g) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Fibra */}
                  <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-purple-400">Fibra</span>
                      <span className="text-slate-400">Saciedad</span>
                    </div>
                    <p className="text-base font-black text-white">
                      {consumedFiber} / {targets.fiber_target_g}g
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((consumedFiber / targets.fiber_target_g) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen rápido de proteína */}
              {remainingProteinG > 20 && (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-slate-200">
                      Te faltan{" "}
                      <strong className="text-emerald-400">
                        {remainingProteinG}g de proteína
                      </strong>{" "}
                      para la meta del día.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("comidas")}
                    className="shrink-0 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                  >
                    + Comida
                  </button>
                </div>
              )}
            </section>

            {/* Controles Rápidos a Una Mano: Hidratación, Pasos y Resumen de Composición */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hidratación */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">Hidratación</h3>
                  </div>
                  <span className="text-xs font-bold text-sky-400">
                    {waterMl} / {targets.water_target_ml} ml
                  </span>
                </div>
                <div className="my-3 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((waterMl / targets.water_target_ml) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWaterMl((w) => w + 250)}
                    className="flex-1 rounded-xl bg-sky-500/15 border border-sky-500/30 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25"
                  >
                    +250 ml (Vaso)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaterMl((w) => w + 500)}
                    className="flex-1 rounded-xl bg-sky-500/15 border border-sky-500/30 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25"
                  >
                    +500 ml (Caramañola)
                  </button>
                </div>
              </div>

              {/* Pasos Diarios (NEAT) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Pasos (NEAT)</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {stepsCount.toLocaleString("es-CO")} /{" "}
                    {targets.daily_steps_target.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="my-3 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((stepsCount / targets.daily_steps_target) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStepsCount((s) => s + 1000)}
                    className="flex-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    +1,000 pasos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStepsCount((s) => s + 2500)}
                    className="flex-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    +2,500 pasos
                  </button>
                </div>
              </div>

              {/* Resumen Rápido de Composición Corporal */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Objetivo: Recomposición
                  </span>
                  <span className="text-xs text-slate-400">
                    {profile.bf_measurement_method}
                  </span>
                </div>
                <div className="my-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">
                      {profile.current_body_fat_pct ?? 15.8}%
                    </span>
                    <span className="text-xs text-emerald-400 ml-1.5 font-semibold">
                      → Meta {profile.target_body_fat_pct}%
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Cintura: <strong>{checkins[checkins.length - 1]?.waist_cm} cm</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("progreso")}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-white transition"
                >
                  Ver Valoración de Chequeos →
                </button>
              </div>
            </section>

            {/* Resumen de Comidas y Entrenamientos del Día */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-400" />
                    Comidas de Hoy ({mealsForDate.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("comidas")}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Registrar comida
                  </button>
                </div>
                <div className="space-y-2">
                  {mealsForDate.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 block">
                          {m.meal_type}
                        </span>
                        <p className="text-xs font-semibold text-white">
                          {m.custom_food_name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white block">
                          {m.kcal} kcal
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {m.protein_g}g Proteína
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-amber-400" />
                    Entrenamientos de Hoy ({workoutsForDate.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("entreno")}
                    className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nuevo entreno
                  </button>
                </div>
                <div className="space-y-2">
                  {workoutsForDate.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 block">
                          {w.modality} • RPE {w.session_rpe}/10
                        </span>
                        <p className="text-xs font-semibold text-white">{w.title}</p>
                        <span className="text-[11px] text-slate-400">
                          {w.duration_minutes} min • Carga: {w.internal_load_au} AU
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-amber-400 block">
                          -{w.estimated_kcal_burned} kcal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ================================================================
            PESTAÑA 2: REGISTRO DE COMIDAS Y BASE DE ALIMENTOS COLOMBIANOS
           ================================================================ */}
        {activeTab === "comidas" && (
          <NutritionMealsView
            apiBase={API_BASE}
            isOnline={isOnline}
            foods={foods}
            recipes={recipes}
            mealsToday={mealsForDate}
            selectedDate={selectedDate}
            onLogMeal={handleLogMeal}
            onLogMultipleMeals={handleLogMultipleMeals}
            onDeleteMeal={handleDeleteMeal}
            onCreateCustomFood={(newFood) => {
              setFoods((prev) => [
                {
                  ...newFood,
                  id: `custom-${Date.now()}`,
                  source: "USER_CUSTOM",
                },
                ...prev,
              ]);
            }}
            onCreateRecipe={(newRec) => {
              setRecipes((prev) => [
                { ...newRec, id: `rec-${Date.now()}` },
                ...prev,
              ]);
            }}
          />
        )}

        {/* ================================================================
            PESTAÑA 3: ENTRENAMIENTO (FUERZA GYM + RUNNING / HYROX)
           ================================================================ */}
        {activeTab === "entreno" && (
          <WorkoutsTrackerView
            apiBase={API_BASE}
            workouts={workouts}
            userWeightKg={profile.current_weight_kg}
            selectedDate={selectedDate}
            sleepHours={sleepHours}
            restingHrBpm={restingHrBpm}
            hrvMs={hrvMs}
            onUpdateRecoveryMarkers={(sleep, rhr, hrv, stepsBonus) => {
              setSleepHours(sleep);
              setRestingHrBpm(rhr);
              setHrvMs(hrv);
              if (stepsBonus && stepsBonus > 0) {
                setStepsCount(stepsBonus);
              }
            }}
            onSaveWorkout={handleSaveWorkout}
          />
        )}

        {/* ================================================================
            PESTAÑA 4: CHEQUEOS Y VALORACIÓN DE COMPOSICIÓN CORPORAL
           ================================================================ */}
        {activeTab === "progreso" && (
          <BodyCheckinsView
            checkins={checkins}
            targetBodyFatPct={profile.target_body_fat_pct}
            onAddCheckin={handleAddCheckin}
          />
        )}

        {/* PESTAÑA COACH: Competencias, RED-S, Coach IA, Salud y Extras (Fase 4) */}
        {activeTab === "coach" && (
          <div className="space-y-5">
            <CompetitionsAndRedsView
              apiBase={API_BASE}
              userWeightKg={profile.current_weight_kg}
              leanBodyMassKg={targets.lean_body_mass_kg}
              tdeeMaintenanceKcal={targets.tdee_base_kcal}
              baseDeficitKcal={targets.target_daily_kcal}
              currentIntakeKcal={consumedKcal}
              burnedWorkoutKcal={burnedWorkoutKcal}
            />
            <CoachHealthExtrasView
              apiBase={API_BASE}
              remainingKcal={remainingKcal}
              remainingProteinG={remainingProteinG}
              remainingCarbsG={Math.max(0, carbsGoalG - consumedCarbs)}
              remainingFatG={Math.max(0, targets.fat_target_g - consumedFat)}
              bodyFatPct={profile.current_body_fat_pct ?? 15.8}
              targetBodyFatPct={profile.target_body_fat_pct}
              leanMassKg={targets.lean_body_mass_kg}
              weightKg={profile.current_weight_kg}
              proteinTargetG={targets.protein_target_g}
              trainingKcal={targets.training_day_kcal}
              restKcal={targets.rest_day_kcal}
              streakDays={new Set(meals.map((m) => m.log_date)).size}
              onExportCsv={handleExportCsv}
            />
          </div>
        )}

        {/* ================================================================
            PESTAÑA 5: PERFIL, KATCH-MCARDLE Y CONFIGURACIÓN PWA
           ================================================================ */}
        {activeTab === "perfil" && (
          <ProfileCalculatorView
            apiBase={API_BASE}
            isStandalone={isStandalone}
            profile={profile}
            targets={targets}
            onSaveProfile={handleSaveProfile}
            onExportDataJson={handleExportDataJson}
            onOpenInstallGuide={() => setInstallModalOpen(true)}
          />
        )}
        {activeTab === "perfil" && AUTH_ENABLED && (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
          >
            Cerrar sesión
          </button>
        )}
      </main>

      {/* Barra de Navegación Inferior Nativa para iPhone (Pensada para una sola mano + Safe Area) */}
      <nav
        aria-label="Navegación principal de FitProIA"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl pb-safe"
      >
        <div className="mx-auto max-w-lg grid grid-cols-6 px-2 pt-1.5">
          {[
            { id: "diario", label: "Diario", icon: Flame },
            { id: "comidas", label: "Comidas", icon: Utensils },
            { id: "entreno", label: "Entreno", icon: Dumbbell },
            { id: "progreso", label: "% Grasa", icon: TrendingDown },
            { id: "coach", label: "Coach", icon: Trophy },
            { id: "perfil", label: "Perfil", icon: UserCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as NavTab)}
                className={`flex flex-col items-center justify-center py-2 rounded-2xl transition ${
                  active
                    ? "text-emerald-400 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[11px] mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modal Guía de Instalación en iPhone (Safari -> Añadir a pantalla de inicio) */}
      <IosInstallGuideModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        isStandalone={isStandalone}
      />
    </div>
  );
}
