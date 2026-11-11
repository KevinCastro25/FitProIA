"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingDown,
  Sparkles,
  Scale,
  Ruler,
  Info,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { BodyCheckinItem } from "@/lib/fitproia-store";

/**
 * Cálculo científico de % de Grasa Corporal basado exclusivamente en medidas
 * antropométricas con cinta métrica (Fórmula de la Marina de EE. UU. y RFM de Cedars-Sinai).
 * No requiere que el usuario conozca o adivine su % de grasa.
 */
export function calculateBodyFatFromMeasurements({
  waistCm,
  weightKg,
  heightCm = 170,
  sex = "M",
  neckCm,
  hipCm,
}: {
  waistCm: number;
  weightKg: number;
  heightCm?: number;
  sex?: "M" | "F";
  neckCm?: number;
  hipCm?: number;
}) {
  const waist = Math.max(45, waistCm);
  const weight = Math.max(35, weightKg);
  const height = Math.max(120, heightCm);
  const neck =
    neckCm && neckCm > 20
      ? neckCm
      : sex === "M"
      ? waist * 0.48
      : waist * 0.44;
  const hip =
    hipCm && hipCm > 40
      ? hipCm
      : sex === "F"
      ? waist * 1.15
      : waist * 1.05;

  let bf = 15.0;

  // 1. Fórmula de la Marina de EE. UU. (Gold standard con cinta)
  if (sex === "M" && waist > neck) {
    const denom =
      1.0324 -
      0.19077 * Math.log10(waist - neck) +
      0.15456 * Math.log10(height);
    if (denom > 0) {
      bf = 495 / denom - 450;
    }
  } else if (sex === "F" && waist + hip > neck) {
    const denom =
      1.29579 -
      0.35004 * Math.log10(waist + hip - neck) +
      0.22100 * Math.log10(height);
    if (denom > 0) {
      bf = 495 / denom - 450;
    }
  }

  // 2. Respaldo RFM (Relative Fat Mass - Cedars-Sinai Medical Center)
  if (isNaN(bf) || bf < 4 || bf > 55) {
    if (sex === "F") {
      bf = 76 - (20 * height) / waist;
    } else {
      bf = 64 - (20 * height) / waist;
    }
  }

  const clampedBf = Math.max(5.0, Math.min(50.0, Number(bf.toFixed(1))));
  const fatMassKg = Number(((weight * clampedBf) / 100).toFixed(2));
  const leanMassKg = Number((weight - fatMassKg).toFixed(2));

  return {
    bodyFatPct: clampedBf,
    fatMassKg,
    leanMassKg,
  };
}

interface BodyCheckinsViewProps {
  checkins: BodyCheckinItem[];
  targetBodyFatPct: number;
  userHeightCm?: number;
  userSex?: "M" | "F";
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
  userHeightCm = 170,
  userSex = "M",
  onAddCheckin,
}: BodyCheckinsViewProps) {
  const latest = checkins[checkins.length - 1];
  const first = checkins[0];

  // Solo se ingresan medidas físicas (cinta métrica y báscula)
  const [weightKg, setWeightKg] = useState<string | number>(
    latest?.weight_kg ?? 70.0
  );
  const [waistCm, setWaistCm] = useState<string | number>(
    latest?.waist_cm ?? 80.0
  );
  const [neckCm, setNeckCm] = useState<string | number>("");
  const [hipCm, setHipCm] = useState<string | number>(latest?.hip_cm ?? 95.0);
  const [chestCm, setChestCm] = useState<string | number>(
    latest?.chest_cm ?? 100.0
  );
  const [armCm, setArmCm] = useState<string | number>(latest?.arm_cm ?? 36.0);
  const [thighCm, setThighCm] = useState<string | number>(
    latest?.thigh_cm ?? 56.0
  );
  const [conditions, setConditions] = useState<
    BodyCheckinItem["measurement_conditions"]
  >(latest?.measurement_conditions ?? "AYUNAS_MANANA");
  const [energyLevel, setEnergyLevel] = useState(4);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [strengthPerformance, setStrengthPerformance] = useState(5);
  const [notes, setNotes] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cálculo en vivo del % de Grasa y masa magra según las medidas ingresadas
  const autoCalculated = useMemo(() => {
    const w = Number(weightKg) || 70.0;
    const waist = Number(waistCm) || 80.0;
    const neck = neckCm !== "" ? Number(neckCm) : undefined;
    const hip = hipCm !== "" ? Number(hipCm) : undefined;
    return calculateBodyFatFromMeasurements({
      waistCm: waist,
      weightKg: w,
      heightCm: userHeightCm,
      sex: userSex,
      neckCm: neck,
      hipCm: hip,
    });
  }, [weightKg, waistCm, neckCm, hipCm, userHeightCm, userSex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalWeight = Math.max(30, Number(weightKg) || 70);
    const finalWaist = Math.max(45, Number(waistCm) || 80);

    onAddCheckin({
      checkin_date: new Date().toISOString().split("T")[0],
      weight_kg: finalWeight,
      body_fat_pct: autoCalculated.bodyFatPct,
      bf_method: "ESTIMACION_VISUAL",
      measurement_conditions: conditions,
      waist_cm: finalWaist,
      hip_cm: Number(hipCm) || 0,
      chest_cm: Number(chestCm) || 0,
      arm_cm: Number(armCm) || 0,
      thigh_cm: Number(thighCm) || 0,
      energy_level: energyLevel,
      sleep_quality: sleepQuality,
      strength_performance: strengthPerformance,
      notes,
    });
    setNotes("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const totalFatLostKg =
    first && latest
      ? Number((first.fat_mass_kg - latest.fat_mass_kg).toFixed(2))
      : 0;
  const totalLbmChangeKg =
    first && latest
      ? Number((latest.lean_mass_kg - first.lean_mass_kg).toFixed(2))
      : 0;
  const totalWaistChangeCm =
    first && latest
      ? Number((latest.waist_cm - first.waist_cm).toFixed(1))
      : 0;

  return (
    <div className="space-y-5">
      {/* Tarjeta Principal: Diagnóstico Inteligente de Composición Corporal */}
      {latest && (
        <section className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Diagnóstico Fisiológico: {latest.assessment_status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-slate-400">
              Cálculo por Medidas ({latest.measurement_conditions.replace(/_/g, " ").toLowerCase()})
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
            <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Tu % de grasa se deduce directamente de tus perímetros corporales y peso.
              La evolución de tu cintura (cm) es el indicador más fiel de pérdida de grasa real.
            </p>
          </div>
        </section>
      )}

      {/* Métricas Resumen (% Grasa, Masa Magra, Cintura y Peso) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400 block">
            % Grasa (Meta {targetBodyFatPct}%)
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
            Masa Muscular Magra
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
            Peso Báscula
          </span>
          <span className="text-2xl font-black text-slate-200 mt-1 block">
            {latest?.weight_kg ?? 70.0} kg
          </span>
          <span className="text-[11px] text-slate-400">
            Tendencia EMA: {latest?.trend_weight_kg ?? 70.0} kg
          </span>
        </div>
      </section>

      {/* Historial de Medidas */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Historial de Medidas y Composición
            </h3>
            <p className="text-xs text-slate-400">
              Evolución de tus perímetros en cm y composición corporal estimada
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-3">Fecha</th>
                <th className="py-2.5 px-2">Cintura</th>
                <th className="py-2.5 px-2">% Grasa Calc.</th>
                <th className="py-2.5 px-2">Masa Magra</th>
                <th className="py-2.5 px-2">Peso</th>
                <th className="py-2.5 pl-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {checkins.map((c) => (
                <tr key={c.id} className="text-slate-200">
                  <td className="py-2.5 pr-3 font-semibold">{c.checkin_date}</td>
                  <td className="py-2.5 px-2 font-bold text-amber-400">
                    {c.waist_cm} cm
                  </td>
                  <td className="py-2.5 px-2 font-bold text-emerald-400">
                    {c.body_fat_pct}% ({c.fat_mass_kg} kg)
                  </td>
                  <td className="py-2.5 px-2 font-bold text-sky-400">
                    {c.lean_mass_kg} kg
                  </td>
                  <td className="py-2.5 px-2">
                    {c.weight_kg} kg
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

      {/* Formulario de Registro: EXCLUSIVAMENTE MEDIDAS (Cinta y Báscula) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white">
              Registrar Medidas de Hoy
            </h3>
            <p className="text-xs text-slate-400">
              Solo necesitas tu cinta métrica y báscula. El % de grasa se calcula automáticamente.
            </p>
          </div>
        </div>

        {/* Tarjeta de Cálculo Automático en Tiempo Real */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              % Grasa Estimado Automáticamente
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">
                {autoCalculated.bodyFatPct}%
              </span>
              <span className="text-xs text-emerald-300 font-medium">
                (Grasa: {autoCalculated.fatMassKg} kg · Músculo Magro: {autoCalculated.leanMassKg} kg)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fórmula Antropométrica (Marina de EE. UU. / RFM) calculada por tu cintura de {waistCm} cm y peso de {weightKg} kg.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-800 font-mono">
              Estatura: {userHeightCm} cm
            </span>
          </div>
        </div>

        {/* Datos Principales: Peso y Perímetro de Cintura */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="chk-weight"
              className="block text-xs font-bold text-white mb-1"
            >
              Peso Báscula (kg) *
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
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <span className="text-[10px] text-slate-400">Peso en ayunas</span>
          </div>

          <div>
            <label
              htmlFor="p-waist"
              className="block text-xs font-bold text-amber-400 mb-1"
            >
              Cintura (cm) *
            </label>
            <input
              id="p-waist"
              name="waist_cm"
              type="number"
              step="0.1"
              min={45}
              max={180}
              required
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
              className="w-full rounded-xl border border-amber-500/50 bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
            />
            <span className="text-[10px] text-slate-400">A nivel del ombligo</span>
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
            <span className="text-[10px] text-slate-400">Recomendado: ayunas</span>
          </div>
        </div>

        {/* Perímetros Secundarios Opcionales */}
        <fieldset className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <legend className="px-2 text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>Otros Perímetros con Cinta Métrica (cm)</span>
          </legend>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label htmlFor="p-neck" className="block text-xs text-slate-400 mb-1">
                Cuello (cm)
              </label>
              <input
                id="p-neck"
                name="neck_cm"
                type="number"
                step="0.1"
                placeholder="Opcional"
                value={neckCm}
                onChange={(e) => setNeckCm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                placeholder="Opcional"
                value={hipCm}
                onChange={(e) => setHipCm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                placeholder="Opcional"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="p-arm" className="block text-xs text-slate-400 mb-1">
                Brazo (cm)
              </label>
              <input
                id="p-arm"
                name="arm_cm"
                type="number"
                step="0.1"
                placeholder="Opcional"
                value={armCm}
                onChange={(e) => setArmCm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="p-thigh" className="block text-xs text-slate-400 mb-1">
                Muslo (cm)
              </label>
              <input
                id="p-thigh"
                name="thigh_cm"
                type="number"
                step="0.1"
                placeholder="Opcional"
                value={thighCm}
                onChange={(e) => setThighCm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Sensaciones de Rendimiento, Energía y Sueño */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label
              htmlFor="chk-strength"
              className="block text-xs text-slate-300 mb-1"
            >
              Fuerza / Rendimiento (1-5): {strengthPerformance}
            </label>
            <input
              id="chk-strength"
              name="strength_performance"
              type="range"
              min={1}
              max={5}
              value={strengthPerformance}
              onChange={(e) => setStrengthPerformance(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="chk-energy" className="block text-xs text-slate-300 mb-1">
              Nivel de Energía (1-5): {energyLevel}
            </label>
            <input
              id="chk-energy"
              name="energy_level"
              type="range"
              min={1}
              max={5}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="chk-sleep" className="block text-xs text-slate-300 mb-1">
              Calidad de Sueño (1-5): {sleepQuality}
            </label>
            <input
              id="chk-sleep"
              name="sleep_quality"
              type="range"
              min={1}
              max={5}
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              ¡Medidas guardadas con éxito! % Grasa ({autoCalculated.bodyFatPct}%) actualizado en tu perfil y gráficas.
            </span>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Ruler className="w-4 h-4" />
          <span>Guardar Medidas de Hoy</span>
        </button>
      </form>
    </div>
  );
}
