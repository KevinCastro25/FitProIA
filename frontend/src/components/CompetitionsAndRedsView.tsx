"use client";

import React, { useState } from "react";
import {
  Trophy,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Droplets,
  Calendar,
  Plus,
  Zap,
  Lock,
} from "lucide-react";

export interface CompetitionPlanBlock {
  block_code: string;
  block_name: string;
  window_description: string;
  start_date: string;
  end_date: string;
  calorie_strategy: string;
  carbs_g_per_kg: number;
  protein_g_per_kg: number;
  deficit_permitted: boolean;
  focus: string;
}

export interface CompetitionItem {
  id: string;
  name: string;
  event_type: "HALF_MARATHON" | "MARATHON" | "ULTRA" | "HYROX" | "TEN_K" | "TRIATHLON";
  event_date: string;
  distance_km: number;
  elevation_gain_m: number;
  goal_time_minutes: number;
  priority_level: string;
}

interface CompetitionsAndRedsViewProps {
  apiBase: string;
  userWeightKg: number;
  leanBodyMassKg: number;
  tdeeMaintenanceKcal: number;
  baseDeficitKcal: number;
  currentIntakeKcal: number;
  burnedWorkoutKcal: number;
}

function computeLocalPeriodization(
  comp: CompetitionItem,
  userWeightKg: number,
  leanBodyMassKg: number,
  tdeeMaintenanceKcal: number,
  baseDeficitKcal: number,
  currentIntakeKcal: number,
  burnedWorkoutKcal: number
) {
  const today = new Date();
  const raceDate = new Date(`${comp.event_date}T00:00:00`);
  const daysUntil = Math.round(
    (raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksUntil = Number((daysUntil / 7).toFixed(1));

  let phaseTitle = "Fase Base — Ventana Óptima de Definición (% Grasa)";
  let deficitAllowed = true;
  let recommendedKcal = baseDeficitKcal;
  let carbsPerKg = 3.8;
  let proteinPerKg = 2.2;
  let phaseRationale =
    "Estás a más de 8 semanas de la competencia: es la ventana ideal para oxidar grasa con déficit moderado protegiendo tu masa muscular.";

  if (daysUntil >= 0 && daysUntil <= 14) {
    phaseTitle = "Tapering y Supercompensación de Glucógeno (Carb Loading)";
    deficitAllowed = false;
    recommendedKcal = tdeeMaintenanceKcal + 200;
    carbsPerKg = daysUntil <= 3 ? 7.5 : 5.8;
    proteinPerKg = 2.0;
    phaseRationale =
      "PROHIBIDO BUSCAR PERDER GRASA EN TAPERING: Faltan ≤14 días para competir. El volumen de entrenamiento baja (-40% a -60%) y las calorías suben a mantenimiento con carga de carbohidratos (6-8 g/kg).";
  } else if (daysUntil > 14 && daysUntil <= 28) {
    phaseTitle = "Pico de Carga Específica (Mantenimiento / Superávit Leve)";
    deficitAllowed = false;
    recommendedKcal = tdeeMaintenanceKcal + 100;
    carbsPerKg = 5.5;
    proteinPerKg = 2.2;
    phaseRationale =
      "SEMANAS DE MÁXIMA CARGA — DÉFICIT BLOQUEADO: A 2-4 semanas de la carrera no se debe hacer déficit calórico para evitar lesión tendinosa, caída hormonal y vaciamiento de glucógeno.";
  } else if (daysUntil > 28 && daysUntil <= 56) {
    phaseTitle = "Construcción Específica (Déficit Ciclado Conservador)";
    deficitAllowed = true;
    recommendedKcal = Math.round((baseDeficitKcal + tdeeMaintenanceKcal) / 2);
    carbsPerKg = 4.6;
    proteinPerKg = 2.2;
    phaseRationale =
      "Fase de Construcción (4 a 8 semanas antes): Se reduce el déficit a la mitad y los días de tirada larga o simulación Hyrox se comen en mantenimiento estricto.";
  } else if (daysUntil < 0 && daysUntil >= -7) {
    phaseTitle = "Recuperación Post-Competencia (Regeneración Tisular)";
    deficitAllowed = false;
    recommendedKcal = tdeeMaintenanceKcal + 150;
    carbsPerKg = 4.5;
    proteinPerKg = 2.3;
    phaseRationale =
      "Semana post-carrera: Prohibido el déficit durante 7 días para reparar daño fibrilar y tendinoso.";
  }

  const hoursDur = Math.max(0.5, comp.goal_time_minutes / 60);
  const carbsPerHourG =
    comp.event_type === "MARATHON" || comp.event_type === "ULTRA"
      ? 75
      : comp.event_type === "HYROX"
      ? 45
      : 50;
  const fluidPerHourMl =
    comp.event_type === "MARATHON" || comp.event_type === "ULTRA" ? 650 : 550;
  const sodiumPerHourMg =
    comp.event_type === "MARATHON" || comp.event_type === "ULTRA" ? 650 : 480;

  const safeFfm = Math.max(35, leanBodyMassKg);
  const activeBurn = burnedWorkoutKcal > 0 ? burnedWorkoutKcal : 480;
  const effectiveIntake = currentIntakeKcal > 900 ? currentIntakeKcal : recommendedKcal;
  const ea = Number(
    (Math.max(0, effectiveIntake - activeBurn) / safeFfm).toFixed(1)
  );

  return {
    daysUntil,
    weeksUntil,
    phaseTitle,
    deficitAllowed,
    recommendedKcal,
    recommendedCarbsG: Math.round(userWeightKg * carbsPerKg),
    recommendedProteinG: Math.round(userWeightKg * proteinPerKg),
    phaseRationale,
    carbsPerHourG,
    totalRaceCarbsG: Math.round(carbsPerHourG * hoursDur),
    fluidPerHourMl,
    totalRaceFluidMl: Math.round(fluidPerHourMl * hoursDur),
    sodiumPerHourMg,
    totalRaceSodiumMg: Math.round(sodiumPerHourMg * hoursDur),
    ea,
    redsAlert:
      ea < 30
        ? `ALERTA CRÍTICA RED-S: Disponibilidad Energética en ${ea} kcal/kg Masa Magra (<30 kcal/kg FFM). Riesgo de pérdida muscular, fatiga neuroendocrina y lesión por estrés óseo.`
        : `Disponibilidad Energética segura (${ea} kcal/kg Masa Magra ≥ 30 kcal/kg FFM).`,
  };
}

export function CompetitionsAndRedsView({
  apiBase,
  userWeightKg,
  leanBodyMassKg,
  tdeeMaintenanceKcal,
  baseDeficitKcal,
  currentIntakeKcal,
  burnedWorkoutKcal,
}: CompetitionsAndRedsViewProps) {
  const defaultRaceDate = new Date(Date.now() + 21 * 86400000)
    .toISOString()
    .split("T")[0];

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([
    {
      id: "comp-mmb",
      name: "Media Maratón de Bogotá (21.1K)",
      event_type: "HALF_MARATHON",
      event_date: defaultRaceDate,
      distance_km: 21.1,
      elevation_gain_m: 180,
      goal_time_minutes: 98,
      priority_level: "A",
    },
    {
      id: "comp-hyrox",
      name: "Hyrox Medellín Open Individual",
      event_type: "HYROX",
      event_date: new Date(Date.now() + 75 * 86400000).toISOString().split("T")[0],
      distance_km: 8.0,
      elevation_gain_m: 0,
      goal_time_minutes: 72,
      priority_level: "B",
    },
  ]);

  const [selectedCompId, setSelectedCompId] = useState<string>("comp-mmb");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] =
    useState<CompetitionItem["event_type"]>("HALF_MARATHON");
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 65 * 86400000).toISOString().split("T")[0]
  );
  const [newDist, setNewDist] = useState(21.1);
  const [newGoalMin, setNewGoalMin] = useState(100);

  const activeComp =
    competitions.find((c) => c.id === selectedCompId) || competitions[0];

  const plan = computeLocalPeriodization(
    activeComp,
    userWeightKg,
    leanBodyMassKg,
    tdeeMaintenanceKcal,
    baseDeficitKcal,
    currentIntakeKcal,
    burnedWorkoutKcal
  );

  const handleAddCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item: CompetitionItem = {
      id: `comp-${Date.now()}`,
      name: newName.trim(),
      event_type: newType,
      event_date: newDate,
      distance_km: newDist,
      elevation_gain_m: 120,
      goal_time_minutes: newGoalMin,
      priority_level: "A",
    };
    setCompetitions((prev) => [...prev, item]);
    setSelectedCompId(item.id);
    setNewName("");

    try {
      await fetch(`${apiBase}/competitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Selector de Competencia Activa */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">
              Planificación por Competencias y Periodización Nutricional
            </h3>
          </div>
          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
            Faltan {plan.daysUntil} días ({plan.weeksUntil} sem)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {competitions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCompId(c.id)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-bold border transition ${
                c.id === activeComp.id
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
              }`}
            >
              {c.name} ({c.event_date})
            </button>
          ))}
        </div>

        {/* Estado del Bloque Actual y Bloqueo de Déficit en Pico/Tapering */}
        <div
          className={`rounded-2xl border p-4 space-y-2 ${
            plan.deficitAllowed
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              {!plan.deficitAllowed && <Lock className="h-4 w-4 text-amber-400" />}
              {plan.phaseTitle}
            </span>
            <span
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                plan.deficitAllowed
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {plan.deficitAllowed
                ? "Déficit Moderado Permitido (Fase Base)"
                : "DÉFICIT BLOQUEADO — Prioridad Rendimiento & Glucógeno"}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {plan.phaseRationale}
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Meta Calórica del Bloque
              </span>
              <strong className="text-sm text-white">
                {plan.recommendedKcal} kcal/día
              </strong>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-[10px] text-sky-400 block">
                Carbohidratos del Bloque
              </span>
              <strong className="text-sm text-sky-300">
                {plan.recommendedCarbsG} g/día
              </strong>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block">
                Proteína Retención Magra
              </span>
              <strong className="text-sm text-emerald-300">
                {plan.recommendedProteinG} g/día
              </strong>
            </div>
          </div>
        </div>

        {/* Línea de Tiempo de los 5 Bloques de Periodización */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Macrociclo Automático hacia la Competencia (Definición Lejos del Evento)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {[
              {
                step: "1. Base (>8 sem)",
                mode: "Déficit Moderado",
                desc: "Oxidar grasa corporal lejos de la competencia conservando fuerza.",
                safe: true,
              },
              {
                step: "2. Construcción (4-8 sem)",
                mode: "Ciclado / Transición",
                desc: "Mantenimiento en fondos largos; déficit leve en días suaves.",
                safe: true,
              },
              {
                step: "3. Pico Carga (2-4 sem)",
                mode: "Mantenimiento / +100 kcal",
                desc: "Cero déficit en las semanas de máximo kilometraje o carga Hyrox.",
                safe: false,
              },
              {
                step: "4. Tapering (<2 sem)",
                mode: "Carga Carbos (7-9 g/kg)",
                desc: "Supercompensación de glucógeno muscular 48h antes; bajar fibra.",
                safe: false,
              },
              {
                step: "5. Post-Carrera (7d)",
                mode: "Regeneración (+150 kcal)",
                desc: "Reparación miofibrilar y tendinosa con 2.3 g/kg de proteína.",
                safe: false,
              },
            ].map((b) => (
              <div
                key={b.step}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-white block">
                    {b.step}
                  </span>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      b.safe
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {b.mode}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estrategia Intra-Competencia + Monitor Clínico RED-S */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hidratación y Nutrición Durante el Evento */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-sky-400" />
            <h4 className="text-sm font-bold text-white">
              Estrategia de Hidratación y Carbohidratos Intra-Evento
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Carbohidratos/Hora
              </span>
              <strong className="text-base font-black text-amber-400">
                {plan.carbsPerHourG} g/h
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Total: {plan.totalRaceCarbsG}g en carrera
              </span>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Fluido / Hidratación
              </span>
              <strong className="text-base font-black text-sky-400">
                {plan.fluidPerHourMl} ml/h
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Total: {plan.totalRaceFluidMl} ml
              </span>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Sodio (Electrolitos)
              </span>
              <strong className="text-base font-black text-emerald-400">
                {plan.sodiumPerHourMg} mg/h
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Total: {plan.totalRaceSodiumMg} mg Na+
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <p>
              <strong className="text-emerald-400">Desayuno 3h antes:</strong> 2
              arepas de maíz blanco asadas con miel + 1 banano maduro + 1 scoop de
              Whey Isolate (bajo en fibra y grasa para evitar molestias GI).
            </p>
            <p>
              <strong className="text-amber-400">
                Fuentes Colombianas en Ruta:
              </strong>{" "}
              Alternar geles isotónicos con bocadillo veleño (25g carbos rápidos por
              unidad) + cápsula o bebida de sales cada 35-40 min.
            </p>
          </div>
        </section>

        {/* Alerta de Disponibilidad Energética (Prevención RED-S) */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Monitor de Disponibilidad Energética (RED-S)
                </h4>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  plan.ea < 30
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                EA: {plan.ea} kcal / kg FFM
              </span>
            </div>

            <p className="text-xs text-slate-300">
              La Deficiencia Energética Relativa en el Deporte (<strong>RED-S</strong>)
              ocurre cuando la energía libre tras descontar el ejercicio cae por
              debajo de <strong>30 kcal por kg de Masa Magra (FFM)</strong>.
            </p>

            <div
              className={`rounded-2xl p-3.5 border text-xs flex items-start gap-2.5 ${
                plan.ea < 30
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {plan.ea < 30 ? (
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span>{plan.redsAlert}</span>
            </div>
          </div>

          {/* Formulario rápido para registrar nueva competencia */}
          <form
            onSubmit={handleAddCompetition}
            className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
          >
            <div className="sm:col-span-4">
              <label
                htmlFor="comp-name"
                className="block text-[10px] text-slate-400 mb-1"
              >
                Nueva Competencia Objetivo
              </label>
              <input
                id="comp-name"
                type="text"
                placeholder="Ej: Maratón Medellín 42K"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label
                htmlFor="comp-type"
                className="block text-[10px] text-slate-400 mb-1"
              >
                Modalidad
              </label>
              <select
                id="comp-type"
                value={newType}
                onChange={(e) => {
                  const val = e.target.value as CompetitionItem["event_type"];
                  setNewType(val);
                  if (val === "MARATHON") setNewDist(42.2);
                  if (val === "HALF_MARATHON") setNewDist(21.1);
                  if (val === "HYROX") setNewDist(8.0);
                  if (val === "TEN_K") setNewDist(10.0);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
              >
                <option value="HALF_MARATHON">Media Maratón 21K</option>
                <option value="MARATHON">Maratón 42K</option>
                <option value="ULTRA">Ultra Trail (50K+)</option>
                <option value="HYROX">Hyrox Individual/Pro</option>
                <option value="TEN_K">10K Ruta</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label
                htmlFor="comp-date"
                className="block text-[10px] text-slate-400 mb-1"
              >
                Fecha del Evento
              </label>
              <input
                id="comp-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
