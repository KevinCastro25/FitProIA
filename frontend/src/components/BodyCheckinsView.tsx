"use client";

import React, { useState } from "react";
import {
  TrendingDown,
  ShieldAlert,
  Sparkles,
  Scale,
  Ruler,
  Info,
} from "lucide-react";
import { BodyCheckinItem } from "@/lib/fitproia-store";

interface BodyCheckinsViewProps {
  checkins: BodyCheckinItem[];
  targetBodyFatPct: number;
  onAddCheckin: (
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
  ) => void;
}

export function BodyCheckinsView({
  checkins,
  targetBodyFatPct,
  onAddCheckin,
}: BodyCheckinsViewProps) {
  const latest = checkins[checkins.length - 1];
  const first = checkins[0];

  const [weightKg, setWeightKg] = useState(latest?.weight_kg ?? 76.4);
  const [bodyFatPct, setBodyFatPct] = useState(latest?.body_fat_pct ?? 15.8);
  const [bfMethod, setBfMethod] = useState<BodyCheckinItem["bf_method"]>(
    latest?.bf_method ?? "PLIEGUES"
  );
  const [conditions, setConditions] = useState<
    BodyCheckinItem["measurement_conditions"]
  >(latest?.measurement_conditions ?? "AYUNAS_MANANA");
  const [waistCm, setWaistCm] = useState(latest?.waist_cm ?? 79.8);
  const [hipCm, setHipCm] = useState(latest?.hip_cm ?? 95.0);
  const [chestCm, setChestCm] = useState(latest?.chest_cm ?? 103.5);
  const [armCm, setArmCm] = useState(latest?.arm_cm ?? 37.8);
  const [thighCm, setThighCm] = useState(latest?.thigh_cm ?? 58.4);
  const [energyLevel, setEnergyLevel] = useState(4);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [strengthPerformance, setStrengthPerformance] = useState(5);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCheckin({
      checkin_date: new Date().toISOString().split("T")[0],
      weight_kg: weightKg,
      body_fat_pct: bodyFatPct,
      bf_method: bfMethod,
      measurement_conditions: conditions,
      waist_cm: waistCm,
      hip_cm: hipCm,
      chest_cm: chestCm,
      arm_cm: armCm,
      thigh_cm: thighCm,
      energy_level: energyLevel,
      sleep_quality: sleepQuality,
      strength_performance: strengthPerformance,
      notes,
    });
    setNotes("");
  };

  const totalFatLostKg =
    first && latest ? Number((first.fat_mass_kg - latest.fat_mass_kg).toFixed(2)) : 0;
  const totalLbmChangeKg =
    first && latest
      ? Number((latest.lean_mass_kg - first.lean_mass_kg).toFixed(2))
      : 0;
  const totalWaistChangeCm =
    first && latest ? Number((latest.waist_cm - first.waist_cm).toFixed(1)) : 0;

  return (
    <div className="space-y-5">
      {/* Tarjeta Principal: Diagnóstico Inteligente de Composición Corporal */}
      {latest && (
        <section className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Diagnóstico IA Fisiológico: {latest.assessment_status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-slate-400">
              Método: <strong>{latest.bf_method}</strong> ({latest.measurement_conditions})
            </span>
          </div>

          <p className="text-sm font-medium text-slate-100 leading-relaxed">
            {latest.assessment_summary}
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-emerald-300">
            <strong className="block text-white mb-0.5">
              Acción Recomendada por el Motor de Recomposición:
            </strong>
            {latest.recommended_action}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-400 pt-1">
            <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
            <span>{latest.method_margin_warning}</span>
          </div>
        </section>
      )}

      {/* Métricas Comparativas de Éxito Real (% Grasa, Masa Magra y Cintura vs Peso Báscula) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400 block">
            % Grasa Actual (Meta {targetBodyFatPct}%)
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {latest?.body_fat_pct ?? 15.8}%
          </span>
          <span className="text-[11px] text-emerald-300">
            Masa grasa: {latest?.fat_mass_kg ?? 12.1} kg (-{totalFatLostKg} kg)
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400 block">
            Masa Muscular Magra (LBM)
          </span>
          <span className="text-2xl font-black text-sky-400 mt-1 block">
            {latest?.lean_mass_kg ?? 64.3} kg
          </span>
          <span className="text-[11px] text-sky-300">
            Evolución: {totalLbmChangeKg >= 0 ? "+" : ""}
            {totalLbmChangeKg} kg (Protegida)
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400 block">Perímetro Cintura</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {latest?.waist_cm ?? 79.8} cm
          </span>
          <span className="text-[11px] text-amber-300">
            Cambio: {totalWaistChangeCm} cm
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400 block">
            Peso Tendencia EMA (Secundario)
          </span>
          <span className="text-2xl font-black text-slate-200 mt-1 block">
            {latest?.trend_weight_kg ?? 76.6} kg
          </span>
          <span className="text-[11px] text-slate-400">
            Báscula hoy: {latest?.weight_kg ?? 76.4} kg
          </span>
        </div>
      </section>

      {/* Gráfica Visual de Evolución de Recomposición (% Grasa vs Masa Magra vs Cintura) */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Curva Histórica de Recomposición Corporal
            </h3>
            <p className="text-xs text-slate-400">
              Compara la reducción de grasa y cintura frente a la retención/ganancia de
              masa magra
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-3">Fecha</th>
                <th className="py-2.5 px-2">% Grasa</th>
                <th className="py-2.5 px-2">Masa Magra</th>
                <th className="py-2.5 px-2">Cintura</th>
                <th className="py-2.5 px-2">Peso (EMA 7d)</th>
                <th className="py-2.5 px-2">Método / Condición</th>
                <th className="py-2.5 pl-2">Valoración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {checkins.map((c) => (
                <tr key={c.id} className="text-slate-200">
                  <td className="py-2.5 pr-3 font-semibold">{c.checkin_date}</td>
                  <td className="py-2.5 px-2 font-bold text-emerald-400">
                    {c.body_fat_pct}% ({c.fat_mass_kg}kg)
                  </td>
                  <td className="py-2.5 px-2 font-bold text-sky-400">
                    {c.lean_mass_kg} kg
                  </td>
                  <td className="py-2.5 px-2 font-bold text-amber-400">
                    {c.waist_cm} cm
                  </td>
                  <td className="py-2.5 px-2">
                    {c.weight_kg} kg{" "}
                    <span className="text-slate-400">({c.trend_weight_kg})</span>
                  </td>
                  <td className="py-2.5 px-2 text-[11px] text-slate-400">
                    {c.bf_method} • {c.measurement_conditions}
                  </td>
                  <td className="py-2.5 pl-2">
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {c.assessment_status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Formulario de Nuevo Chequeo Planificado */}
      <form
        method="POST"
        action="/api/v1/checkins"
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Registrar Nuevo Chequeo de Composición y Perímetros
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="chk-bf"
              className="block text-xs font-bold text-emerald-400 mb-1"
            >
              % Grasa Corporal *
            </label>
            <input
              id="chk-bf"
              name="body_fat_pct"
              type="number"
              step="0.1"
              min={4}
              max={55}
              required
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
            />
          </div>
          <div>
            <label
              htmlFor="chk-method"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Método de Medición *
            </label>
            <select
              id="chk-method"
              name="bf_method"
              value={bfMethod}
              onChange={(e) =>
                setBfMethod(e.target.value as BodyCheckinItem["bf_method"])
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="PLIEGUES">Pliegues Cutáneos (ISAK)</option>
              <option value="BIOIMPEDANCIA">Báscula Bioimpedancia</option>
              <option value="DEXA">DEXA (Clínico)</option>
              <option value="ESTIMACION_VISUAL">Estimación Visual / Cinta</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="chk-cond"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Condición de Medición *
            </label>
            <select
              id="chk-cond"
              name="measurement_conditions"
              value={conditions}
              onChange={(e) =>
                setConditions(
                  e.target.value as BodyCheckinItem["measurement_conditions"]
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="AYUNAS_MANANA">En ayunas (mañana)</option>
              <option value="POST_ENTRENO">Post-entrenamiento</option>
              <option value="TARDE_HIDRATADO">Tarde / Hidratado</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="chk-weight"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Peso Báscula (kg)
            </label>
            <input
              id="chk-weight"
              name="weight_kg"
              type="number"
              step="0.1"
              min={35}
              max={220}
              required
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Perímetros Corporales en cm */}
        <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
          <legend className="px-2 text-xs font-bold text-slate-300">
            Perímetros Corporales (cm)
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1">
            <div>
              <label htmlFor="p-waist" className="block text-xs text-amber-400 mb-1">
                Cintura (cm) *
              </label>
              <input
                id="p-waist"
                name="waist_cm"
                type="number"
                step="0.1"
                required
                value={waistCm}
                onChange={(e) => setWaistCm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="p-hip" className="block text-xs text-slate-400 mb-1">
                Cadera (cm)
              </label>
              <input
                id="p-hip"
                name="hip_cm"
                type="number"
                step="0.1"
                value={hipCm}
                onChange={(e) => setHipCm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="p-chest" className="block text-xs text-slate-400 mb-1">
                Pecho (cm)
              </label>
              <input
                id="p-chest"
                name="chest_cm"
                type="number"
                step="0.1"
                value={chestCm}
                onChange={(e) => setChestCm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="p-arm" className="block text-xs text-slate-400 mb-1">
                Brazo contraído (cm)
              </label>
              <input
                id="p-arm"
                name="arm_cm"
                type="number"
                step="0.1"
                value={armCm}
                onChange={(e) => setArmCm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="p-thigh" className="block text-xs text-slate-400 mb-1">
                Muslo medio (cm)
              </label>
              <input
                id="p-thigh"
                name="thigh_cm"
                type="number"
                step="0.1"
                value={thighCm}
                onChange={(e) => setThighCm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </fieldset>

        {/* Sensaciones de Rendimiento, Energía y Sueño */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="chk-strength"
              className="block text-xs text-slate-300 mb-1"
            >
              Rendimiento en Fuerza / Running (1-5): {strengthPerformance}
            </label>
            <input
              id="chk-strength"
              name="strength_performance"
              type="range"
              min={1}
              max={5}
              value={strengthPerformance}
              onChange={(e) => setStrengthPerformance(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="chk-energy" className="block text-xs text-slate-300 mb-1">
              Nivel de Energía Diaria (1-5): {energyLevel}
            </label>
            <input
              id="chk-energy"
              name="energy_level"
              type="range"
              min={1}
              max={5}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="chk-sleep" className="block text-xs text-slate-300 mb-1">
              Calidad del Sueño (1-5): {sleepQuality}
            </label>
            <input
              id="chk-sleep"
              name="sleep_quality"
              type="range"
              min={1}
              max={5}
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
        >
          Evaluar Composición Corporal y Guardar Chequeo
        </button>
      </form>
    </div>
  );
}
