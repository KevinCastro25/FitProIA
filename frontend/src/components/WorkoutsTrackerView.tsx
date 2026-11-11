"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Flame,
  Calendar,
  Clock,
  Activity,
  HeartPulse,
  FileText,
  CheckCircle2,
} from "lucide-react";
import {
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

const MODALITY_OPTIONS: { id: WorkoutModality; label: string; defaultKcalPerMin: number }[] = [
  { id: "GYM", label: "Gym", defaultKcalPerMin: 6.5 },
  { id: "RUNNING", label: "Running", defaultKcalPerMin: 10.5 },
  { id: "BICICLETA", label: "Bicicleta", defaultKcalPerMin: 8.5 },
  { id: "BICICLETA ESTATICA", label: "Bicicleta Estática", defaultKcalPerMin: 7.5 },
  { id: "HYROX", label: "Hyrox", defaultKcalPerMin: 11.0 },
  { id: "CROSSFIT", label: "Crossfit", defaultKcalPerMin: 10.0 },
  { id: "BICICLETA ELIPTICA", label: "Bicicleta Elíptica", defaultKcalPerMin: 8.0 },
  { id: "CAMINADORA", label: "Caminadora", defaultKcalPerMin: 6.0 },
  { id: "OTROS EJERCICIOS", label: "Otros Ejercicios", defaultKcalPerMin: 7.0 },
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
  const [sessionDate, setSessionDate] = useState<string>(
    selectedDate || new Date().toISOString().split("T")[0]
  );
  const [modality, setModality] = useState<WorkoutModality>("GYM");
  const [title, setTitle] = useState("Entrenamiento de Gym");
  const [durationMin, setDurationMin] = useState<string | number>(60);
  const [kcalBurned, setKcalBurned] = useState<string | number>(390);
  const [notes, setNotes] = useState<string>("");
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setSessionDate(selectedDate);
    }
  }, [selectedDate]);

  // Actualizar sugerencia de calorías al cambiar duración o modalidad
  const handleModalityChange = (newModality: WorkoutModality) => {
    setModality(newModality);
    const modObj = MODALITY_OPTIONS.find((m) => m.id === newModality);
    const label = modObj ? modObj.label : "Entrenamiento";
    setTitle(`Entrenamiento de ${label}`);
    const rate = modObj ? modObj.defaultKcalPerMin : 7.0;
    const durNum = Number(durationMin) || 0;
    if (durNum > 0) {
      setKcalBurned(Math.round(durNum * rate));
    }
  };

  const handleDurationChange = (val: string) => {
    setDurationMin(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const modObj = MODALITY_OPTIONS.find((m) => m.id === modality);
      const rate = modObj ? modObj.defaultKcalPerMin : 7.0;
      setKcalBurned(Math.round(num * rate));
    }
  };

  const handleSubmitWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `Entrenamiento de ${modality}`;
    const finalDuration = Math.max(1, Number(durationMin) || 30);
    const finalKcal = Math.max(0, Number(kcalBurned) || 200);

    onSaveWorkout({
      session_date: sessionDate,
      title: finalTitle,
      modality,
      duration_minutes: finalDuration,
      session_rpe: 7,
      internal_load_au: finalDuration * 7,
      estimated_kcal_burned: finalKcal,
      distance_km: 0,
      avg_pace_sec_per_km: 0,
      avg_hr_bpm: 0,
      elevation_gain_m: 0,
      strength_sets: [],
      notes: notes.trim(),
    });

    setSavedToast(`¡Entrenamiento "${finalTitle}" (${sessionDate}) guardado con éxito!`);
    setTimeout(() => setSavedToast(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Selector de Pestaña: Registro de Entreno vs Sincronizaciones */}
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
          Registrar Entrenamiento
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
          Descargas (Deload) & Sincronización
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
          {/* Formulario Limpio y Rápido de Registro de Entrenamiento */}
          <form
            onSubmit={handleSubmitWorkout}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Registrar Sesión de Entrenamiento
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Datos rápidos desde tu reloj
              </span>
            </div>

            {/* 1. Selector de Tipo de Ejercicio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Tipo de Ejercicio:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {MODALITY_OPTIONS.map((m) => {
                  const isSelected = modality === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModalityChange(m.id)}
                      className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition text-center border ${
                        isSelected
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Fecha, Nombre, Duración y Calorías */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Fecha editable (Permite días anteriores) */}
              <div>
                <label
                  htmlFor="workout-date"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1"
                >
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  Fecha de la sesión:
                </label>
                <input
                  id="workout-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              {/* Nombre de la sesión */}
              <div>
                <label
                  htmlFor="workout-title"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  Nombre o detalle:
                </label>
                <input
                  id="workout-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Pierna y Glúteo, Rodaje 10K..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              {/* Duración (minutos) */}
              <div>
                <label
                  htmlFor="workout-duration"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1"
                >
                  <Clock className="h-3.5 w-3.5 text-sky-400" />
                  Duración (minutos):
                </label>
                <input
                  id="workout-duration"
                  type="number"
                  min={1}
                  max={720}
                  required
                  value={durationMin}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white"
                />
              </div>

              {/* Calorías quemadas del reloj */}
              <div>
                <label
                  htmlFor="workout-kcal"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1"
                >
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Calorías quemadas (kcal de tu reloj):
                </label>
                <input
                  id="workout-kcal"
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={kcalBurned}
                  onChange={(e) => setKcalBurned(e.target.value)}
                  className="w-full rounded-2xl border border-amber-500/40 bg-slate-950 px-3.5 py-2.5 text-sm font-black text-amber-300"
                />
              </div>
            </div>

            {/* 3. Notas opcionales */}
            <div>
              <label
                htmlFor="workout-notes"
                className="block text-xs font-semibold text-slate-400 mb-1"
              >
                Notas opcionales:
              </label>
              <input
                id="workout-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Buena energía, ritmo suave, etc."
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white"
              />
            </div>

            {/* Botón de Guardado */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-400">
                Se registrará en la fecha: <strong className="text-white">{sessionDate}</strong>
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
              >
                Guardar Entrenamiento
              </button>
            </div>

            {savedToast && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <strong className="text-white">{savedToast}</strong>
              </div>
            )}
          </form>

          {/* Historial de Entrenamientos */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Historial de Entrenamientos
              </h3>
              <span className="text-xs text-slate-400">
                {workouts.length} entrenamiento(s) registrados
              </span>
            </div>

            {workouts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-800">
                No tienes entrenamientos registrados todavía. Registra tu primera sesión arriba.
              </div>
            ) : (
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
                        <span className="text-xs text-slate-400 font-mono">
                          {w.session_date}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mt-1">{w.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {w.duration_minutes} min
                        {w.notes ? ` • ${w.notes}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-amber-400 flex items-center sm:justify-end gap-1">
                        <Flame className="h-4 w-4" /> {w.estimated_kcal_burned} kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}