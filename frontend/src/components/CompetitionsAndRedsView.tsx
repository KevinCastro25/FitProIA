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
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
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

  const plan = activeComp
    ? computeLocalPeriodization(
        activeComp,
        userWeightKg,
        leanBodyMassKg,
        tdeeMaintenanceKcal,
        baseDeficitKcal,
        currentIntakeKcal,
        burnedWorkoutKcal
      )
    : null;

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
      {/* Sección de Competencias */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">
              Mis Competencias u Objetivos Deportivos
            </h3>
          </div>
          {plan && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
              Faltan {plan.daysUntil} días ({plan.weeksUntil} sem)
            </span>
          )}
        </div>

        {competitions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-400">
            Aún no has registrado ninguna carrera o competencia. Agrega una abajo si estás preparando algún evento (10K, Media Maratón, Maratón, Hyrox, etc.) o déjalo vacío si solo entrenas por salud y recomposición.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {competitions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCompId(c.id)}
                className={`rounded-2xl px-4 py-2.5 text-xs font-bold border transition ${
                  c.id === activeComp?.id
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                }`}
              >
                {c.name} ({c.event_date})
              </button>
            ))}
          </div>
        )}

        {/* Estado del Bloque Actual si hay competencia activa */}
        {plan && (
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
                  ? "Déficit Moderado Permitido"
                  : "DÉFICIT BLOQUEADO — Carga de carbohidratos"}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {plan.phaseRationale}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  Meta Calórica
                </span>
                <strong className="text-sm text-white">
                  {plan.recommendedKcal} kcal/día
                </strong>
              </div>
              <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
                <span className="text-[10px] text-sky-400 block">
                  Carbohidratos
                </span>
                <strong className="text-sm text-sky-300">
                  {plan.recommendedCarbsG} g/día
                </strong>
              </div>
              <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">
                  Proteína
                </span>
                <strong className="text-sm text-emerald-300">
                  {plan.recommendedProteinG} g/día
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Formulario para registrar nueva competencia */}
        <form
          onSubmit={handleAddCompetition}
          className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
        >
          <div className="sm:col-span-4">
            <label
              htmlFor="comp-name"
              className="block text-[10px] text-slate-400 mb-1"
            >
              Registrar Competencia / Carrera Objetivo
            </label>
            <input
              id="comp-name"
              type="text"
              placeholder="Ej: Media Maratón, 10K, Hyrox..."
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
              <option value="TEN_K">10K Carrera</option>
              <option value="HALF_MARATHON">Media Maratón (21K)</option>
              <option value="MARATHON">Maratón (42K)</option>
              <option value="HYROX">Hyrox</option>
              <option value="ULTRA">Ultra Trail</option>
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

      {/* Solo mostrar estrategia de intra-competencia si el usuario tiene una carrera configurada */}
      {plan && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-sky-400" />
            <h4 className="text-sm font-bold text-white">
              Estrategia de Hidratación y Nutrición en Carrera
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
                Total: {plan.totalRaceCarbsG}g
              </span>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Líquidos
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
                Electrolitos
              </span>
              <strong className="text-base font-black text-emerald-400">
                {plan.sodiumPerHourMg} mg/h
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Total: {plan.totalRaceSodiumMg} mg
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
