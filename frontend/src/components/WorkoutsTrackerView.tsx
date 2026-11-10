"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Flame,
  Timer,
  Sun,
  Plus,
  Play,
  RotateCcw,
  Activity,
  HeartPulse,
} from "lucide-react";
import {
  StrengthSetItem,
  WorkoutModality,
  WorkoutSessionItem,
} from "@/lib/fitproia-store";
import { IntegrationsAndDeloadView } from "./IntegrationsAndDeloadView";

interface WorkoutsTrackerViewProps {
  apiBase: string;
  workouts: WorkoutSessionItem[];
  userWeightKg: number;
  selectedDate: string;
  sleepHours: number;
  restingHrBpm: number;
  hrvMs: number;
  onUpdateRecoveryMarkers: (
    sleep: number,
    rhr: number,
    hrv: number,
    stepsBonus?: number
  ) => void;
  onSaveWorkout: (workout: Omit<WorkoutSessionItem, "id">) => void;
}

const EXERCISE_LIBRARY = [
  { name: "Sentadilla Trasera con Barra", group: "PIERNA" },
  { name: "Peso Muerto Rumano (RDL)", group: "ISQUIOS_GLUTEOS" },
  { name: "Press Banca Plano con Barra", group: "PECHO" },
  { name: "Dominadas Lastradas / Pronas", group: "ESPALDA" },
  { name: "Press Militar con Mancuernas", group: "HOMBRO" },
  { name: "Hip Thrust con Barra", group: "ISQUIOS_GLUTEOS" },
  { name: "Zancadas Búlgaras", group: "PIERNA" },
  { name: "Remo con Barra / Pendlay", group: "ESPALDA" },
  { name: "Wall Balls (Estación Hyrox)", group: "HYROX_FULL" },
  { name: "Sled Push / Trineo (Hyrox)", group: "PIERNA" },
];

export function WorkoutsTrackerView({
  apiBase,
  workouts,
  userWeightKg,
  selectedDate,
  sleepHours,
  restingHrBpm,
  hrvMs,
  onUpdateRecoveryMarkers,
  onSaveWorkout,
}: WorkoutsTrackerViewProps) {
  const [subView, setSubView] = useState<"live" | "deload_sync">("live");
  const [modality, setModality] = useState<WorkoutModality>("STRENGTH");
  const [title, setTitle] = useState("Fuerza Tren Superior + Core");
  const [durationMin, setDurationMin] = useState(60);
  const [sessionRpe, setSessionRpe] = useState(8);
  const [distanceKm, setDistanceKm] = useState(0);
  const [avgHrBpm, setAvgHrBpm] = useState(145);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [notes, setNotes] = useState("");

  // Series de fuerza
  const [strengthSets, setStrengthSets] = useState<StrengthSetItem[]>([
    {
      exercise_name: "Press Banca Plano con Barra",
      muscle_group: "PECHO",
      set_number: 1,
      reps: 6,
      weight_kg: 85,
      rpe: 8.0,
    },
  ]);
  const [selectedExIndex, setSelectedExIndex] = useState(0);
  const [repsInput, setRepsInput] = useState(8);
  const [weightInput, setWeightInput] = useState(80);
  const [rpeInput, setRpeInput] = useState(8.0);

  // Temporizador de descanso en vivo + Wake Lock de pantalla para iPhone
  const [restSeconds, setRestSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const toggleScreenWakeLock = async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) {
      setWakeLockActive((prev) => !prev);
      return;
    }
    try {
      if (!wakeLockActive) {
        await (
          navigator as Navigator & {
            wakeLock: { request: (t: "screen") => Promise<unknown> };
          }
        ).wakeLock.request("screen");
        setWakeLockActive(true);
      } else {
        setWakeLockActive(false);
      }
    } catch {
      setWakeLockActive((prev) => !prev);
    }
  };

  // Cálculo de calorías quemadas (METs + Distancia Running + RPE)
  const computeCalories = () => {
    const baseMets: Record<WorkoutModality, number> = {
      STRENGTH: 5.2,
      RUNNING: 9.8,
      HYROX: 10.5,
      CYCLING: 8.0,
      SWIMMING: 8.5,
      MOBILITY: 3.0,
    };
    const met = baseMets[modality] * (0.8 + sessionRpe * 0.04);
    if (modality === "RUNNING" && distanceKm > 0) {
      const distKcal = distanceKm * userWeightKg * 1.03;
      const metKcal = ((met * 3.5 * userWeightKg) / 200) * durationMin;
      return Math.round(distKcal * 0.65 + metKcal * 0.35);
    }
    let kcal = ((met * 3.5 * userWeightKg) / 200) * durationMin;
    if (avgHrBpm > 155) kcal *= 1.08;
    return Math.round(kcal);
  };

  const paceSecPerKm =
    distanceKm > 0 ? Math.round((durationMin * 60) / distanceKm) : 0;
  const formatPace = (sec: number) => {
    if (!sec || sec <= 0) return "--:-- /km";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s} min/km`;
  };

  const handleAddSet = () => {
    const ex = EXERCISE_LIBRARY[selectedExIndex] ?? EXERCISE_LIBRARY[0];
    setStrengthSets((prev) => [
      ...prev,
      {
        exercise_name: ex.name,
        muscle_group: ex.group,
        set_number: prev.filter((s) => s.exercise_name === ex.name).length + 1,
        reps: repsInput,
        weight_kg: weightInput,
        rpe: rpeInput,
      },
    ]);
    // Iniciar descanso automáticamente al registrar serie
    setRestSeconds(90);
    setTimerRunning(true);
  };

  const handleSubmitWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWorkout({
      session_date: selectedDate,
      title: title.trim() || `Sesión de ${modality}`,
      modality,
      duration_minutes: durationMin,
      session_rpe: sessionRpe,
      internal_load_au: durationMin * sessionRpe,
      estimated_kcal_burned: computeCalories(),
      distance_km: distanceKm,
      avg_pace_sec_per_km: paceSecPerKm,
      avg_hr_bpm: avgHrBpm,
      elevation_gain_m: elevationGainM,
      strength_sets: modality === "STRENGTH" || modality === "HYROX" ? strengthSets : [],
      notes,
    });
  };

  return (
    <div className="space-y-5">
      {/* Selector de Sub-Módulo de Entrenamiento: Registro En Vivo vs Descargas (Deload) e Integraciones */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1.5 border border-slate-800">
        <button
          type="button"
          onClick={() => setSubView("live")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            subView === "live"
              ? "bg-emerald-500 text-slate-950 shadow"
              : "text-slate-300 hover:text-white"
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          Registrar Entreno (Gym / Running / Hyrox)
        </button>
        <button
          type="button"
          onClick={() => setSubView("deload_sync")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            subView === "deload_sync"
              ? "bg-emerald-500 text-slate-950 shadow"
              : "text-slate-300 hover:text-white"
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Descargas (Deload), ACWR & Sincronización
        </button>
      </div>

      {subView === "deload_sync" ? (
        <IntegrationsAndDeloadView
          apiBase={apiBase}
          workouts={workouts}
          sleepHours={sleepHours}
          restingHrBpm={restingHrBpm}
          hrvMs={hrvMs}
          onUpdateRecoveryMarkers={onUpdateRecoveryMarkers}
          onImportWorkout={onSaveWorkout}
        />
      ) : (
        <>
      {/* Barra Superior de Modo Gimnasio En Vivo: Wake Lock + Cronómetro de Descanso */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Timer className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Temporizador de Descanso
            </p>
            <p className="text-2xl font-black text-white tabular-nums">
              {Math.floor(restSeconds / 60)}:
              {restSeconds % 60 < 10 ? "0" : ""}
              {restSeconds % 60}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[60, 90, 120, 180].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => {
                setRestSeconds(sec);
                setTimerRunning(true);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500"
            >
              {sec}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTimerRunning((prev) => !prev)}
            className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950"
          >
            <Play className="h-3.5 w-3.5" />
            {timerRunning ? "Pausar" : "Iniciar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerRunning(false);
              setRestSeconds(90);
            }}
            aria-label="Reiniciar temporizador"
            className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleScreenWakeLock}
            aria-pressed={wakeLockActive}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition ${
              wakeLockActive
                ? "border-amber-400 bg-amber-500/20 text-amber-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            <Sun className="h-4 w-4" />
            {wakeLockActive ? "Pantalla Activa (WakeLock)" : "Mantener Pantalla"}
          </button>
        </div>
      </section>

      {/* Formulario de Registro de Sesión */}
      <form
        method="POST"
        action="/api/v1/workouts"
        onSubmit={handleSubmitWorkout}
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "STRENGTH", label: "Fuerza (Gym)" },
              { id: "RUNNING", label: "Running / Calle" },
              { id: "HYROX", label: "Hyrox / Funcional" },
              { id: "CYCLING", label: "Ciclismo" },
              { id: "MOBILITY", label: "Movilidad / Descarga" },
            ] as { id: WorkoutModality; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setModality(m.id);
                if (m.id === "RUNNING") {
                  setTitle("Rodaje Tempo / Preparación Media Maratón");
                  setDistanceKm(10);
                } else if (m.id === "HYROX") {
                  setTitle("Simulación Hyrox (Carrera + Estaciones)");
                  setDistanceKm(6);
                } else if (m.id === "STRENGTH") {
                  setTitle("Fuerza Hipertrofia & Retención Muscular");
                  setDistanceKm(0);
                }
              }}
              className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                modality === m.id
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="workout-title"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Nombre de la sesión
            </label>
            <input
              id="workout-title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label
              htmlFor="workout-duration"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Duración (minutos)
            </label>
            <input
              id="workout-duration"
              name="duration_minutes"
              type="number"
              min={5}
              max={480}
              required
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
            />
          </div>
        </div>

        {/* Métricas de Running / Cardio / Hyrox */}
        {modality !== "STRENGTH" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3.5">
            <div>
              <label
                htmlFor="cardio-dist"
                className="block text-xs text-sky-300 mb-1"
              >
                Distancia (km)
              </label>
              <input
                id="cardio-dist"
                name="distance_km"
                type="number"
                step="0.1"
                min={0}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <span className="block text-xs text-sky-300 mb-1">
                Ritmo medio calculado
              </span>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-bold text-emerald-400">
                {formatPace(paceSecPerKm)}
              </div>
            </div>
            <div>
              <label htmlFor="cardio-hr" className="block text-xs text-sky-300 mb-1">
                FC Media (ppm)
              </label>
              <input
                id="cardio-hr"
                name="avg_hr_bpm"
                type="number"
                min={50}
                max={220}
                value={avgHrBpm}
                onChange={(e) => setAvgHrBpm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cardio-elev"
                className="block text-xs text-sky-300 mb-1"
              >
                Desnivel + (m)
              </label>
              <input
                id="cardio-elev"
                name="elevation_gain_m"
                type="number"
                min={0}
                value={elevationGainM}
                onChange={(e) => setElevationGainM(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        )}

        {/* Registro Rápido de Series de Fuerza (con cálculo de 1RM Epley) */}
        {(modality === "STRENGTH" || modality === "HYROX") && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Registro Rápido de Series (Fuerza & Retención Muscular)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-5">
                <label
                  htmlFor="ex-select"
                  className="block text-xs text-slate-400 mb-1"
                >
                  Ejercicio de Biblioteca
                </label>
                <select
                  id="ex-select"
                  name="exercise"
                  value={selectedExIndex}
                  onChange={(e) => setSelectedExIndex(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {EXERCISE_LIBRARY.map((ex, idx) => (
                    <option key={ex.name} value={idx}>
                      {ex.name} ({ex.group})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="set-weight"
                  className="block text-xs text-slate-400 mb-1"
                >
                  Peso (kg)
                </label>
                <input
                  id="set-weight"
                  name="weight_kg"
                  type="number"
                  step="0.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="set-reps"
                  className="block text-xs text-slate-400 mb-1"
                >
                  Reps
                </label>
                <input
                  id="set-reps"
                  name="reps"
                  type="number"
                  min={1}
                  value={repsInput}
                  onChange={(e) => setRepsInput(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-1">
                <label
                  htmlFor="set-rpe"
                  className="block text-xs text-slate-400 mb-1"
                >
                  RPE
                </label>
                <input
                  id="set-rpe"
                  name="rpe"
                  type="number"
                  step="0.5"
                  min={5}
                  max={10}
                  value={rpeInput}
                  onChange={(e) => setRpeInput(Number(e.target.value) || 8)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddSet}
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Plus className="h-3.5 w-3.5" /> Serie
                </button>
              </div>
            </div>

            {strengthSets.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {strengthSets.map((s, i) => {
                  const e1rm = Math.round(s.weight_kg * (1 + s.reps / 30));
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-slate-900/90 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-200">
                        #{s.set_number} {s.exercise_name}
                      </span>
                      <span className="text-slate-300">
                        <strong>{s.weight_kg} kg</strong> × {s.reps} reps @ RPE{" "}
                        {s.rpe} •{" "}
                        <span className="text-emerald-400 font-bold">
                          1RM est: {e1rm} kg
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Esfuerzo Percibido Global (sRPE) y Resumen Energético */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-2xl bg-slate-950 p-4 border border-slate-800">
          <div>
            <label
              htmlFor="session-rpe-range"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Esfuerzo Percibido de la Sesión (RPE: {sessionRpe}/10)
            </label>
            <input
              id="session-rpe-range"
              name="session_rpe"
              type="range"
              min={1}
              max={10}
              value={sessionRpe}
              onChange={(e) => setSessionRpe(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Carga interna sRPE:{" "}
              <strong className="text-white">{durationMin * sessionRpe} AU</strong>
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">
                Gasto energético estimado
              </span>
              <span className="text-xl font-black text-amber-400 flex items-center gap-1">
                <Flame className="h-5 w-5" /> {computeCalories()} kcal
              </span>
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
            >
              Guardar Entreno
            </button>
          </div>
        </div>
      </form>

      {/* Histórico de Entrenamientos Registrados */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          Historial de Entrenamientos Recientes
        </h3>
        <div className="space-y-2.5">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {w.modality}
                  </span>
                  <span className="text-xs text-slate-400">{w.session_date}</span>
                </div>
                <p className="text-sm font-bold text-white mt-1">{w.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {w.duration_minutes} min • RPE {w.session_rpe}/10 • Carga:{" "}
                  <strong>{w.internal_load_au} AU</strong>
                  {w.distance_km > 0
                    ? ` • ${w.distance_km} km (${formatPace(w.avg_pace_sec_per_km)})`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-amber-400">
                  {w.estimated_kcal_burned} kcal
                </span>
                <span className="block text-[10px] text-slate-500">
                  quemadas (METs/FC)
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
