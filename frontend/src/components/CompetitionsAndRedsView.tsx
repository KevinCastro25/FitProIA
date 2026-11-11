"use client";

import React, { useState, useEffect } from "react";
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
  Trash2,
  Sparkles,
} from "lucide-react";

export type CompetitionEventType =
  | "FIVE_K"
  | "SEVEN_K"
  | "TEN_K"
  | "TWELVE_K"
  | "FIFTEEN_K"
  | "HALF_MARATHON"
  | "MARATHON"
  | "ULTRA"
  | "HYROX"
  | "TRIATHLON";

export interface ModalityOption {
  id: CompetitionEventType;
  label: string;
  defaultKm: number;
  defaultMin: number;
  isCustomKm?: boolean;
}

export const MODALITY_OPTIONS: ModalityOption[] = [
  { id: "FIVE_K", label: "5K Carrera (5 km)", defaultKm: 5.0, defaultMin: 28 },
  { id: "SEVEN_K", label: "7K Carrera (7 km)", defaultKm: 7.0, defaultMin: 40 },
  { id: "TEN_K", label: "10K Carrera (10 km)", defaultKm: 10.0, defaultMin: 55 },
  { id: "TWELVE_K", label: "12K Carrera (12 km)", defaultKm: 12.0, defaultMin: 68 },
  { id: "FIFTEEN_K", label: "15K Carrera (15 km)", defaultKm: 15.0, defaultMin: 85 },
  { id: "HALF_MARATHON", label: "Media Maratón (21.1 km)", defaultKm: 21.1, defaultMin: 115 },
  { id: "MARATHON", label: "Maratón (42.2 km)", defaultKm: 42.2, defaultMin: 240 },
  { id: "ULTRA", label: "Ultra Maratón (km configurables)", defaultKm: 60.0, defaultMin: 420, isCustomKm: true },
  { id: "HYROX", label: "Hyrox (8 km)", defaultKm: 8.0, defaultMin: 75 },
  { id: "TRIATHLON", label: "Triatlón (51.5 km)", defaultKm: 51.5, defaultMin: 170 },
];

export function getModalityLabel(type: string, distKm?: number): string {
  const match = MODALITY_OPTIONS.find((m) => m.id === type);
  if (match) {
    if (match.isCustomKm && distKm) {
      return `Ultra Maratón (${distKm} km)`;
    }
    return match.label.split("(")[0].trim();
  }
  return type;
}

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
  event_type: CompetitionEventType | string;
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
      "Fase de Construcción (4 a 8 semanas antes): Se reduce el déficit a la mitad y los días de tirada larga o simulación se comen en mantenimiento estricto.";
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

  // Hidratación y combustible intra-carrera adaptados a la distancia
  let carbsPerHourG = 50;
  let fluidPerHourMl = 550;
  let sodiumPerHourMg = 480;

  if (comp.event_type === "ULTRA" || comp.distance_km >= 45) {
    carbsPerHourG = 80;
    fluidPerHourMl = 700;
    sodiumPerHourMg = 700;
  } else if (comp.event_type === "MARATHON" || comp.distance_km >= 35) {
    carbsPerHourG = 75;
    fluidPerHourMl = 650;
    sodiumPerHourMg = 650;
  } else if (comp.event_type === "HYROX") {
    carbsPerHourG = 45;
    fluidPerHourMl = 550;
    sodiumPerHourMg = 500;
  } else if (comp.event_type === "FIVE_K" || comp.distance_km <= 6) {
    carbsPerHourG = 20;
    fluidPerHourMl = 450;
    sodiumPerHourMg = 350;
  } else if (comp.event_type === "SEVEN_K" || comp.distance_km <= 8) {
    carbsPerHourG = 30;
    fluidPerHourMl = 500;
    sodiumPerHourMg = 400;
  } else if (comp.event_type === "HALF_MARATHON") {
    carbsPerHourG = 60;
    fluidPerHourMl = 600;
    sodiumPerHourMg = 500;
  }

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
        : null,
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
  const [newName, setNewName] = useState("Carrera 10K");
  const [newType, setNewType] = useState<CompetitionEventType>("TEN_K");
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 65 * 86400000).toISOString().split("T")[0]
  );
  const [newDist, setNewDist] = useState<number | string>(10.0);
  const [newGoalMin, setNewGoalMin] = useState<number | string>(55);

  // Cargar competencias guardadas en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fitproia_competitions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompetitions(parsed);
          setSelectedCompId(parsed[0].id);
        }
      }
    } catch {}
  }, []);

  // Persistir cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("fitproia_competitions", JSON.stringify(competitions));
    } catch {}
  }, [competitions]);

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

  const handleModalityChange = (type: CompetitionEventType) => {
    setNewType(type);
    const cfg = MODALITY_OPTIONS.find((m) => m.id === type);
    if (cfg) {
      setNewDist(cfg.defaultKm);
      setNewGoalMin(cfg.defaultMin);
      if (
        !newName.trim() ||
        MODALITY_OPTIONS.some((m) => newName.includes(m.label.split("(")[0].trim())) ||
        newName.startsWith("Carrera")
      ) {
        setNewName(type === "ULTRA" ? `Ultra Maratón ${cfg.defaultKm}K` : cfg.label.split("(")[0].trim());
      }
    }
  };

  const handleAddCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDist = Math.max(1, Number(newDist) || 10.0);
    const finalGoal = Math.max(10, Number(newGoalMin) || 60);
    const finalName =
      newName.trim() ||
      (newType === "ULTRA" ? `Ultra Maratón ${finalDist}K` : getModalityLabel(newType, finalDist));

    const item: CompetitionItem = {
      id: `comp-${Date.now()}`,
      name: finalName,
      event_type: newType,
      event_date: newDate,
      distance_km: finalDist,
      elevation_gain_m: newType === "ULTRA" ? 850 : 120,
      goal_time_minutes: finalGoal,
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

  const handleDeleteComp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = competitions.filter((c) => c.id !== id);
    setCompetitions(updated);
    if (selectedCompId === id) {
      setSelectedCompId(updated[0]?.id || "");
    }
  };

  const isUltra = newType === "ULTRA";

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
            Aún no has registrado ninguna carrera o competencia. Selecciona tu modalidad abajo (5K, 7K, 10K, 12K, 15K, Media Maratón, Maratón, Ultra Maratón con km configurables o Hyrox) para sincronizar tu periodización nutricional y déficit.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {competitions.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCompId(c.id)}
                className={`flex items-center gap-2 cursor-pointer rounded-2xl px-4 py-2.5 text-xs font-bold border transition ${
                  c.id === activeComp?.id
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>
                  {c.name} · {c.distance_km} km ({c.event_date})
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteComp(c.id, e)}
                  title="Eliminar competencia"
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
          className="pt-3 border-t border-slate-800 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            {/* Modalidad */}
            <div className="sm:col-span-4">
              <label
                htmlFor="comp-type"
                className="block text-[11px] font-semibold text-slate-300 mb-1"
              >
                Modalidad de Carrera / Evento
              </label>
              <select
                id="comp-type"
                value={newType}
                onChange={(e) =>
                  handleModalityChange(e.target.value as CompetitionEventType)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              >
                {MODALITY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Distancia (km) - Configurable para Ultra y todas las modalidades */}
            <div className="sm:col-span-3">
              <label
                htmlFor="comp-dist"
                className={`block text-[11px] font-semibold mb-1 flex items-center justify-between ${
                  isUltra ? "text-amber-400 font-bold" : "text-slate-300"
                }`}
              >
                <span>Distancia (km)</span>
                {isUltra && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded font-normal">
                    Configurable
                  </span>
                )}
              </label>
              <input
                id="comp-dist"
                type="number"
                step="0.1"
                min="1"
                max="500"
                value={newDist}
                onChange={(e) => setNewDist(e.target.value)}
                placeholder="Ej. 50, 80, 100"
                className={`w-full rounded-xl bg-slate-950 px-2.5 py-2 text-xs font-bold text-white focus:outline-none ${
                  isUltra
                    ? "border-2 border-amber-500/70 focus:border-amber-400 text-amber-200"
                    : "border border-slate-700 focus:border-emerald-500"
                }`}
              />
            </div>

            {/* Nombre del Evento */}
            <div className="sm:col-span-5">
              <label
                htmlFor="comp-name"
                className="block text-[11px] font-semibold text-slate-300 mb-1"
              >
                Nombre del Evento
              </label>
              <input
                id="comp-name"
                type="text"
                placeholder={
                  isUltra
                    ? "Ej: Ultra Chicamocha 80K, UTMB..."
                    : "Ej: Media Maratón Bogotá, 10K..."
                }
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            {/* Fecha del Evento */}
            <div className="sm:col-span-5">
              <label
                htmlFor="comp-date"
                className="block text-[11px] font-semibold text-slate-300 mb-1"
              >
                Fecha del Evento
              </label>
              <input
                id="comp-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tiempo Objetivo en minutos */}
            <div className="sm:col-span-4">
              <label
                htmlFor="comp-goal"
                className="block text-[11px] font-semibold text-slate-300 mb-1"
              >
                Tiempo Objetivo (minutos)
              </label>
              <input
                id="comp-goal"
                type="number"
                min="10"
                max="3000"
                value={newGoalMin}
                onChange={(e) => setNewGoalMin(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Botón Añadir */}
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition-all"
              >
                <Plus className="h-4 w-4" /> Añadir Carrera
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Solo mostrar estrategia de intra-competencia si el usuario tiene una carrera configurada */}
      {plan && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-sky-400" />
              <h4 className="text-sm font-bold text-white">
                Estrategia Intra-Carrera ({activeComp?.name} · {activeComp?.distance_km} km)
              </h4>
            </div>
            {activeComp?.event_type === "ULTRA" && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                Protocolo Ultra Distancia
              </span>
            )}
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
