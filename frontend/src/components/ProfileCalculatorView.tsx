"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Download,
  Check,
} from "lucide-react";
import {
  NutritionTargetsData,
  UserProfileData,
  computeNutritionTargets,
} from "@/lib/fitproia-store";
import { WebPushSettingsCard } from "./WebPushSettingsCard";

interface ProfileCalculatorViewProps {
  apiBase: string;
  isStandalone: boolean;
  profile: UserProfileData;
  targets: NutritionTargetsData;
  onSaveProfile: (newProfile: UserProfileData) => Promise<void> | void;
  onExportDataJson: () => void;
  onOpenInstallGuide: () => void;
}

type ProfileFormState = {
  sex: "M" | "F";
  age: string | number;
  height_cm: string | number;
  current_weight_kg: string | number;
  current_body_fat_pct: string | number | null;
  target_body_fat_pct: string | number;
  activity_level: UserProfileData["activity_level"];
  target_weekly_loss_pct: number;
  carb_cycling_enabled: boolean;
  protein_g_per_kg: number;
  calorie_backfill_ratio: number;
  injuries_or_restrictions: string;
  primary_sport_focus: string;
  bf_measurement_method: UserProfileData["bf_measurement_method"];
};

// Huella canónica (orden fijo y números normalizados) para comparar perfiles sin falsos cambios
function profileFingerprint(p: Record<string, unknown>): string {
  const num = (v: unknown) =>
    v === null || v === undefined || v === "" ? null : Math.round(Number(v) * 1000) / 1000;
  return JSON.stringify([
    p.sex,
    num(p.age),
    num(p.height_cm),
    num(p.current_weight_kg),
    num(p.current_body_fat_pct),
    num(p.target_body_fat_pct),
    p.activity_level,
    num(p.target_weekly_loss_pct),
    !!p.carb_cycling_enabled,
    num(p.protein_g_per_kg),
    num(p.calorie_backfill_ratio),
    p.injuries_or_restrictions ?? "",
    p.primary_sport_focus ?? "",
    p.bf_measurement_method ?? "",
  ]);
}

export function ProfileCalculatorView({
  apiBase,
  isStandalone,
  profile,
  targets,
  onSaveProfile,
  onExportDataJson,
  onOpenInstallGuide,
}: ProfileCalculatorViewProps) {
  const [formState, setFormState] = useState<ProfileFormState>(profile);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [themePref, setThemePref] = useState<"system" | "dark" | "light">("system");

  // Referencias estables para evitar bucles guardar -> sincronizar -> guardar
  const onSaveProfileRef = useRef(onSaveProfile);
  onSaveProfileRef.current = onSaveProfile;
  // Última huella (JSON) del perfil que ya está en el servidor / viene del servidor
  const lastSyncedJsonRef = useRef<string>(
    profileFingerprint(profile as unknown as Record<string, unknown>)
  );

  // Mantener el formulario sincronizado si el perfil cambia remotamente (sync desde Supabase / otra pestaña).
  // Solo se aplica si el CONTENIDO realmente cambió (evita reinicios por nuevas referencias del objeto).
  useEffect(() => {
    const incomingJson = profileFingerprint(profile as unknown as Record<string, unknown>);
    if (incomingJson === lastSyncedJsonRef.current) return;
    lastSyncedJsonRef.current = incomingJson;
    setFormState(profile);
  }, [profile]);

  // Perfil sanitizado numérico para cálculo de metas en vivo y envío al servidor
  const normalizedProfile: UserProfileData = {
    sex: formState.sex,
    age: formState.age === "" ? profile.age : (Number(formState.age) || profile.age),
    height_cm: formState.height_cm === "" ? profile.height_cm : (Number(formState.height_cm) || profile.height_cm),
    current_weight_kg:
      formState.current_weight_kg === "" ? profile.current_weight_kg : (Number(formState.current_weight_kg) || profile.current_weight_kg),
    current_body_fat_pct:
      formState.current_body_fat_pct === "" || formState.current_body_fat_pct == null
        ? null
        : Number(formState.current_body_fat_pct),
    target_body_fat_pct:
      formState.target_body_fat_pct === "" ? profile.target_body_fat_pct : (Number(formState.target_body_fat_pct) || profile.target_body_fat_pct),
    activity_level: formState.activity_level,
    target_weekly_loss_pct: formState.target_weekly_loss_pct,
    carb_cycling_enabled: formState.carb_cycling_enabled,
    protein_g_per_kg: formState.protein_g_per_kg,
    calorie_backfill_ratio: formState.calorie_backfill_ratio,
    injuries_or_restrictions: formState.injuries_or_restrictions,
    primary_sport_focus: formState.primary_sport_focus,
    bf_measurement_method: formState.bf_measurement_method,
  };

  // Sincronización continua automática: cualquier cambio se guarda solo tras 800ms
  const normalizedJson = profileFingerprint(normalizedProfile as unknown as Record<string, unknown>);
  const normalizedProfileRef = useRef(normalizedProfile);
  normalizedProfileRef.current = normalizedProfile;
  useEffect(() => {
    // Sin cambios reales respecto a lo ya sincronizado: no hacer nada (rompe el bucle)
    if (normalizedJson === lastSyncedJsonRef.current) return;
    // No auto-guardar si el usuario está borrando temporalmente para escribir un nuevo valor
    if (
      formState.current_weight_kg === "" ||
      formState.height_cm === "" ||
      formState.age === "" ||
      formState.target_body_fat_pct === ""
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      const snapshot = normalizedJson;
      try {
        await onSaveProfileRef.current(normalizedProfileRef.current);
        lastSyncedJsonRef.current = snapshot;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3500);
      } catch {
        // Se encola offline; marcar como ya intentado para no reintentar en bucle
        lastSyncedJsonRef.current = snapshot;
        setSaveStatus("offline");
        setTimeout(() => setSaveStatus("idle"), 3500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [normalizedJson]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("color-scheme");
    if (stored === "dark" || stored === "light") {
      setThemePref(stored);
    } else {
      setThemePref("system");
    }
  }, []);

  const handleThemeChange = (nextTheme: "system" | "dark" | "light") => {
    setThemePref(nextTheme);
    if (typeof window === "undefined") return;
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (nextTheme === "system") {
      localStorage.removeItem("color-scheme");
      if (meta) meta.setAttribute("content", "light dark");
    } else {
      localStorage.setItem("color-scheme", nextTheme);
      if (meta) meta.setAttribute("content", nextTheme);
    }
  };

  const liveTargets = computeNutritionTargets(normalizedProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    const safetyTimer = setTimeout(() => {
      setSaveStatus((prev) => (prev === "saving" ? "offline" : prev));
    }, 8500);
    lastSyncedJsonRef.current = normalizedJson;
    try {
      await onSaveProfile(normalizedProfile);
      clearTimeout(safetyTimer);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } catch {
      clearTimeout(safetyTimer);
      setSaveStatus("offline");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Resumen Calculado en Vivo (Katch-McArdle / Mifflin-St Jeor) */}
      <section className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Presupuesto Fisiológico ({liveTargets.formula_used.replace("_", "-")})
            </h2>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            Meta Proyectada: {liveTargets.estimated_goal_date} (~
            {liveTargets.estimated_weeks_to_goal} semanas)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-950/90 p-3.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">
              Rango Mantenimiento (±5%)
            </span>
            <span className="text-lg font-black text-white mt-0.5 block">
              {liveTargets.tdee_lower_bound_kcal} – {liveTargets.tdee_upper_bound_kcal}{" "}
              kcal
            </span>
            <span className="text-[11px] text-slate-400">
              TMB (BMR): {liveTargets.bmr_kcal} kcal
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/90 p-3.5 border border-slate-800">
            <span className="text-[11px] text-emerald-400 block">
              Composición Actual
            </span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">
              {liveTargets.lean_body_mass_kg} kg Magra
            </span>
            <span className="text-[11px] text-slate-400">
              Masa grasa: {liveTargets.fat_mass_kg} kg
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/90 p-3.5 border border-slate-800">
            <span className="text-[11px] text-sky-400 block">
              Ciclado: Día Entreno vs Descanso
            </span>
            <span className="text-lg font-black text-sky-400 mt-0.5 block">
              {liveTargets.training_day_kcal} / {liveTargets.rest_day_kcal} kcal
            </span>
            <span className="text-[11px] text-slate-400">
              Carbos: {liveTargets.carbs_training_day_g}g vs {liveTargets.carbs_rest_day_g}g
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/90 p-3.5 border border-slate-800">
            <span className="text-[11px] text-amber-400 block">
              Proteína Priorizada ({formState.protein_g_per_kg} g/kg)
            </span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">
              {liveTargets.protein_target_g} g / día
            </span>
            <span className="text-[11px] text-slate-400">
              ~{liveTargets.protein_per_meal_recommended_g}g en 4 comidas
            </span>
          </div>
        </div>

        {liveTargets.warnings.length > 0 && (
          <div className="space-y-2 pt-1">
            {liveTargets.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulario de Onboarding y Parámetros Fisiológicos */}
      <form
        method="POST"
        action="/api/v1/profile"
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
      >
        <h3 className="text-base font-bold text-white">
          Parámetros Antropométricos y Estrategia de Recomposición
        </h3>

        <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
          <legend className="px-2 text-xs font-bold text-slate-300">
            Sexo Biológico (2 opciones visibles con Radio según guía de accesibilidad)
          </legend>
          <div className="flex gap-6 mt-1">
            <label htmlFor="sex-m" className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                id="sex-m"
                type="radio"
                name="sex"
                value="M"
                checked={formState.sex === "M"}
                onChange={() => setFormState({ ...formState, sex: "M" })}
              />
              <span>Hombre (M)</span>
            </label>
            <label htmlFor="sex-f" className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                id="sex-f"
                type="radio"
                name="sex"
                value="F"
                checked={formState.sex === "F"}
                onChange={() => setFormState({ ...formState, sex: "F" })}
              />
              <span>Mujer (F)</span>
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="prof-age" className="block text-xs text-slate-300 mb-1">
              Edad (años)
            </label>
            <input
              id="prof-age"
              name="age"
              type="number"
              min={14}
              max={95}
              required
              value={formState.age}
              onChange={(e) => setFormState({ ...formState, age: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="prof-height" className="block text-xs text-slate-300 mb-1">
              Estatura (cm)
            </label>
            <input
              id="prof-height"
              name="height_cm"
              type="number"
              min={120}
              max={230}
              required
              value={formState.height_cm}
              onChange={(e) => setFormState({ ...formState, height_cm: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="prof-weight" className="block text-xs text-slate-300 mb-1">
              Peso Actual (kg)
            </label>
            <input
              id="prof-weight"
              name="current_weight_kg"
              type="number"
              step="0.1"
              required
              value={formState.current_weight_kg}
              onChange={(e) => setFormState({ ...formState, current_weight_kg: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="prof-bf" className="block text-xs text-emerald-400 font-bold mb-1">
              % Grasa Actual (Activa Katch-McArdle)
            </label>
            <input
              id="prof-bf"
              name="current_body_fat_pct"
              type="number"
              step="0.1"
              placeholder="Vacío = usa Mifflin"
              value={formState.current_body_fat_pct ?? ""}
              onChange={(e) => setFormState({ ...formState, current_body_fat_pct: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="prof-target-bf"
              className="block text-xs font-bold text-emerald-400 mb-1"
            >
              % Grasa Objetivo Principal
            </label>
            <input
              id="prof-target-bf"
              name="target_body_fat_pct"
              type="number"
              step="0.5"
              min={5}
              max={40}
              required
              value={formState.target_body_fat_pct}
              onChange={(e) => setFormState({ ...formState, target_body_fat_pct: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label
              htmlFor="prof-activity"
              className="block text-xs text-slate-300 mb-1"
            >
              ¿Cuántos días a la semana entrenas?
            </label>
            <select
              id="prof-activity"
              name="activity_level"
              value={formState.activity_level}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  activity_level: e.target.value as UserProfileData["activity_level"],
                })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="SEDENTARY">Poco o nada (0 a 1 día / semana)</option>
              <option value="LIGHT">Ligero (2 a 3 días / semana)</option>
              <option value="MODERATE">Moderado (4 a 5 días / semana)</option>
              <option value="ACTIVE">Activo (6 o más días / semana)</option>
              <option value="ATHLETE">Atleta competitivo (doble sesión)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="prof-loss-rate"
              className="block text-xs text-slate-300 mb-1"
            >
              Velocidad para bajar de grasa
            </label>
            <select
              id="prof-loss-rate"
              name="target_weekly_loss_pct"
              value={formState.target_weekly_loss_pct}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  target_weekly_loss_pct: Number(e.target.value),
                })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value={0.35}>Tranquilo (~0.3 kg / sem - Muy fácil de seguir)</option>
              <option value={0.5}>Recomendado (~0.5 kg / sem - Protege tu músculo)</option>
              <option value={0.8}>Rápido (~0.8 kg / sem - Mayor disciplina)</option>
            </select>
          </div>
        </div>

        {/* Ajustes avanzados opcionales en acordeón */}
        <details className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
          <summary className="cursor-pointer font-bold text-slate-400 hover:text-white">
            ⚙️ Ajustes avanzados (opcional para expertos)
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div>
              <label
                htmlFor="prof-prot"
                className="block text-[11px] text-slate-400 mb-1"
              >
                Proteína ({formState.protein_g_per_kg} g por kilo de peso)
              </label>
              <input
                id="prof-prot"
                name="protein_g_per_kg"
                type="range"
                min={1.8}
                max={2.4}
                step={0.1}
                value={formState.protein_g_per_kg}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    protein_g_per_kg: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="prof-backfill"
                className="block text-[11px] text-slate-400 mb-1"
              >
                Comer más cuando entrenes ({Math.round(formState.calorie_backfill_ratio * 100)}%)
              </label>
              <input
                id="prof-backfill"
                name="calorie_backfill_ratio"
                type="range"
                min={0.4}
                max={0.85}
                step={0.05}
                value={formState.calorie_backfill_ratio}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    calorie_backfill_ratio: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="flex items-center pt-2">
              <input
                id="prof-cycling"
                name="carb_cycling_enabled"
                type="checkbox"
                checked={formState.carb_cycling_enabled}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    carb_cycling_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
              <label
                htmlFor="prof-cycling"
                className="ml-2 text-[11px] font-semibold text-slate-300 cursor-pointer"
              >
                Más energía los días de entreno fuerte
              </label>
            </div>
          </div>
        </details>

        <div>
          <label
            htmlFor="prof-injuries"
            className="block text-xs text-slate-300 mb-1"
          >
            Lesiones, molestias articulares o restricciones alimentarias
          </label>
          <input
            id="prof-injuries"
            name="injuries_or_restrictions"
            type="text"
            value={formState.injuries_or_restrictions}
            onChange={(e) =>
              setFormState({
                ...formState,
                injuries_or_restrictions: e.target.value,
              })
            }
            placeholder="Ej: Sobrecarga tendón rotuliano / Intolerancia a la lactosa"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          {saveStatus === "saving" && (
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              Sincronizando con el servidor...
            </span>
          )}
          {saveStatus === "saved" && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-emerald-400 flex items-center gap-1"
            >
              <Check className="h-4 w-4" /> Perfil sincronizado con la nube (Supabase)
            </span>
          )}
          {saveStatus === "offline" && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-amber-300 flex items-center gap-1"
            >
              ⚠️ Guardado localmente (se sincronizará al conectar)
            </span>
          )}
          {saveStatus === "idle" && (
            <span className="text-xs text-slate-400">
              Piso seguro calculado: {liveTargets.min_safe_kcal} kcal/día
            </span>
          )}

          <button
            type="submit"
            className="rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
          >
            Guardar Perfil y Recalcular Metas
          </button>
        </div>
      </form>

      {/* Notificaciones Web Push (iOS 16.4+ Standalone) y Respaldo In-App/Email */}
      <WebPushSettingsCard
        apiBase={apiBase}
        isStandalone={isStandalone}
        onOpenInstallGuide={onOpenInstallGuide}
      />

      {/* Preferencia de Tema (3 Estados en Ajustes según Modern Web Guidance) + Ley 1581 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h4 className="text-sm font-bold text-white">
            Apariencia y Esquema de Color
          </h4>
          <p className="text-xs text-slate-400">
            Respeta la preferencia de iOS por defecto o fija un modo explícito.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border ${
                themePref === "system"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> Sistema
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border ${
                themePref === "dark"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              <Moon className="h-3.5 w-3.5" /> Oscuro
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border ${
                themePref === "light"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-400"
              }`}
            >
              <Sun className="h-3.5 w-3.5" /> Claro
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Privacidad y Habeas Data (Ley 1581 de Colombia)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Tus datos biométricos se almacenan en PostgreSQL (Supabase) con respaldo
            offline en IndexedDB. No reemplaza valoración médica.
          </p>
          <button
            type="button"
            onClick={onExportDataJson}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-emerald-500"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Exportar Mis Datos para Nutricionista (JSON/CSV)
          </button>
        </div>
      </section>
    </div>
  );
}
