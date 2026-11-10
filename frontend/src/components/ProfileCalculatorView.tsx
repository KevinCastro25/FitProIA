"use client";

import React, { useState, useEffect } from "react";
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
  onSaveProfile: (newProfile: UserProfileData) => void;
  onExportDataJson: () => void;
  onOpenInstallGuide: () => void;
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
  const [formState, setFormState] = useState<UserProfileData>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [themePref, setThemePref] = useState<"system" | "dark" | "light">("system");

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

  const liveTargets = computeNutritionTargets(formState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formState);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
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
              onChange={(e) =>
                setFormState({ ...formState, age: Number(e.target.value) || 25 })
              }
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  height_cm: Number(e.target.value) || 170,
                })
              }
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  current_weight_kg: Number(e.target.value) || 70,
                })
              }
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  current_body_fat_pct:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
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
              onChange={(e) =>
                setFormState({
                  ...formState,
                  target_body_fat_pct: Number(e.target.value) || 12,
                })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label
              htmlFor="prof-activity"
              className="block text-xs text-slate-300 mb-1"
            >
              Nivel de Actividad Base
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
              <option value="SEDENTARY">Sedentario (Oficina)</option>
              <option value="LIGHT">Ligero (1-2 entrenos/sem)</option>
              <option value="MODERATE">Moderado (3-4 entrenos/sem)</option>
              <option value="ACTIVE">Activo Híbrido (Gym + Running 4-6 días)</option>
              <option value="ATHLETE">Atleta Competencia (Doble sesión / Maratón / Hyrox)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="prof-loss-rate"
              className="block text-xs text-slate-300 mb-1"
            >
              Ritmo semanal deseado ({formState.target_weekly_loss_pct}% peso/sem)
            </label>
            <input
              id="prof-loss-rate"
              name="target_weekly_loss_pct"
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={formState.target_weekly_loss_pct}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  target_weekly_loss_pct: Number(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-[10px] text-slate-400">
              Recomendado atletas: 0.4% a 0.6%/sem para no perder músculo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="prof-prot"
              className="block text-xs text-slate-300 mb-1"
            >
              Meta de Proteína ({formState.protein_g_per_kg} g/kg)
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
              className="block text-xs text-slate-300 mb-1"
            >
              Reembolso Calorías Ejercicio (
              {Math.round(formState.calorie_backfill_ratio * 100)}%)
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

          <div className="flex items-center pt-4">
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
              className="h-5 w-5"
            />
            <label
              htmlFor="prof-cycling"
              className="ml-2.5 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Activar Calorías Cíclicas (+Carbos en días de entreno)
            </label>
          </div>
        </div>

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
          {savedNotice ? (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-emerald-400 flex items-center gap-1"
            >
              <Check className="h-4 w-4" /> Perfil y metas actualizados
            </span>
          ) : (
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
