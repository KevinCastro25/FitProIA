'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Dumbbell,
  Heart,
  Moon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { WorkoutSessionItem } from '@/lib/fitproia-store';
import {
  calculateRecoveryAndDeloadClient,
  type RecoveryAndDeloadReport,
} from '@/lib/health-bridge';

interface IntegrationsAndDeloadViewProps {
  recentWorkouts?: WorkoutSessionItem[];
  workouts?: WorkoutSessionItem[];
  recoveryStatus?: RecoveryAndDeloadReport | null;
  sleepHours?: number;
  restingHrBpm?: number;
  hrvMs?: number;
  apiBase?: string;
  onUpdateRecoveryMarkers: (sleepHours: number, restingHr: number, hrvMs: number, stepsBonus?: number) => Promise<void> | void;
  onImportWorkout?: (workout: any) => void;
}

export function IntegrationsAndDeloadView({
  recentWorkouts,
  workouts,
  recoveryStatus,
  sleepHours,
  restingHrBpm,
  hrvMs,
  onUpdateRecoveryMarkers,
}: IntegrationsAndDeloadViewProps) {
  const activeWorkouts = workouts || recentWorkouts || [];

  // Use client calculation as primary/fallback based on recent workouts
  const clientStatus = calculateRecoveryAndDeloadClient(
    activeWorkouts,
    recoveryStatus?.autonomic_recovery.sleep_hours ?? sleepHours ?? 7.5,
    recoveryStatus?.autonomic_recovery.resting_hr_bpm ?? restingHrBpm ?? 56
  );

  const report = recoveryStatus || clientStatus;
  const split = report.muscle_split_7d;

  // Dedicated text inputs for Sleep and Resting Heart Rate
  const [sleepInput, setSleepInput] = useState<string>(
    String(sleepHours ?? report.autonomic_recovery.sleep_hours ?? 7.5)
  );
  const [restingHrInput, setRestingHrInput] = useState<string>(
    String(restingHrBpm ?? report.autonomic_recovery.resting_hr_bpm ?? 56)
  );
  const [savingMarkers, setSavingMarkers] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveMarkers = async () => {
    const sleep = parseFloat(sleepInput);
    const hr = parseInt(restingHrInput, 10);
    if (isNaN(sleep) || sleep <= 0 || sleep > 24) return;
    if (isNaN(hr) || hr < 30 || hr > 220) return;

    setSavingMarkers(true);
    setSaveSuccess(false);
    try {
      await onUpdateRecoveryMarkers(sleep, hr, hrvMs ?? 68);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingMarkers(false);
    }
  };

  const isDeload = report.recommendation.deload_type !== 'RECUPERACION_OPTIMA';

  const getStatusColor = () => {
    switch (report.recommendation.urgency) {
      case 'ALTA':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'MEDIA':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'BAJA':
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800/80 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Descargas (Deload) & Recuperación</h2>
              <p className="text-xs text-neutral-400">
                Monitoreo de fatiga, distribución de carga muscular y biomarcadores
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusColor()}`}>
            {report.recommendation.title}
          </span>
        </div>

        {/* ACWR & FATIGUE OVERVIEW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-800/60">
          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Ratio ACWR
            </span>
            <p className="text-xl font-black text-white mt-0.5">
              {report.acwr_ratio ? report.acwr_ratio.toFixed(2) : '1.00'}
            </p>
            <p className="text-[10px] text-neutral-400">Aguda / Crónica</p>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Carga 7 Días
            </span>
            <p className="text-xl font-black text-cyan-400 mt-0.5">
              {Math.round(report.acute_load_7d_au)} <span className="text-xs font-normal text-neutral-400">AU</span>
            </p>
            <p className="text-[10px] text-neutral-400">Volumen agudo</p>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Carga Crónica (28d)
            </span>
            <p className="text-xl font-black text-purple-400 mt-0.5">
              {Math.round(report.chronic_load_28d_weekly_au)} <span className="text-xs font-normal text-neutral-400">AU</span>
            </p>
            <p className="text-[10px] text-neutral-400">Base adaptativa</p>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Índice Recuperación
            </span>
            <p
              className={`text-xl font-black mt-0.5 ${
                report.autonomic_recovery.recovery_score_100 >= 70
                  ? 'text-emerald-400'
                  : report.autonomic_recovery.recovery_score_100 >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {Math.round(report.autonomic_recovery.recovery_score_100)}%
            </p>
            <p className="text-[10px] text-neutral-400">Estado fisiológico</p>
          </div>
        </div>

        {/* DELOAD RECOMMENDATION BANNER */}
        {isDeload && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200">
              <strong className="font-bold text-white block mb-0.5">
                {report.recommendation.title} (Prioridad {report.recommendation.urgency})
              </strong>
              {report.recommendation.explanation}
              {report.recommendation.action_protocol.length > 0 && (
                <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-rose-100">
                  {report.recommendation.action_protocol.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* APARTADO 1: DISTRIBUCIÓN DE CARGA POR NOMBRE (TREN SUPERIOR VS TREN INFERIOR) */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800/80 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Distribución de Carga: Tren Superior vs Tren Inferior
              </h3>
              <p className="text-xs text-neutral-400">
                Identificación calculada según las palabras clave en el nombre de cada entrenamiento
              </p>
            </div>
          </div>
          <span className="text-xs text-neutral-400 font-mono">Últimos 7 días</span>
        </div>

        {/* BARS & METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* TREN SUPERIOR */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                <ArrowUpCircle className="w-4 h-4" />
                <span>Tren Superior</span>
              </div>
              <span className="text-xs font-bold text-sky-400">{split.upper_pct}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-sky-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${split.upper_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Pecho, Espalda, Hombros, Brazos, Torso</span>
              <span className="text-white font-mono font-medium">{Math.round(split.upper_load_au)} AU</span>
            </div>
          </div>

          {/* TREN INFERIOR */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <ArrowDownCircle className="w-4 h-4" />
                <span>Tren Inferior</span>
              </div>
              <span className="text-xs font-bold text-emerald-400">{split.lower_pct}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${split.lower_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Pierna, Cuádriceps, Femoral, Glúteo, Gemelos</span>
              <span className="text-white font-mono font-medium">{Math.round(split.lower_load_au)} AU</span>
            </div>
          </div>
        </div>

        {/* WORKOUT LIST WITH IDENTIFIED SPLIT BADGES */}
        <div className="pt-2">
          <p className="text-xs font-medium text-neutral-400 mb-2">
            Entrenamientos clasificados por nombre ({split.classified_workouts.length}):
          </p>
          {split.classified_workouts.length === 0 ? (
            <p className="text-xs text-neutral-400 italic py-2">
              No hay entrenamientos registrados en los últimos 7 días.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {split.classified_workouts.map((cw) => (
                <div
                  key={cw.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/60 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-white truncate">{cw.title}</span>
                    <span className="text-[10px] text-neutral-400">({cw.date})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {Math.round(cw.load_au)} AU
                    </span>
                    {cw.category === 'TREN_INFERIOR' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {cw.category_label}
                      </span>
                    )}
                    {cw.category === 'TREN_SUPERIOR' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {cw.category_label}
                      </span>
                    )}
                    {cw.category === 'FULL_BODY' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        {cw.category_label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* APARTADO 2: SUEÑO Y FRECUENCIA CARDÍACA AL DESPERTAR (SECCIÓN INDEPENDIENTE) */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800/80 p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Marcadores de Recuperación Diaria
            </h3>
            <p className="text-xs text-neutral-400">
              Ingresa tus horas de sueño y frecuencia cardíaca basal al despertar para modular la fatiga
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* HORAS DE SUEÑO */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>Horas de Sueño</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={sleepInput}
                onChange={(e) => setSleepInput(e.target.value)}
                placeholder="Ej. 7.5"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
                horas
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Óptimo para hipertrofia y adaptación neuromuscular: 7.5 - 9.0 h.
            </p>
          </div>

          {/* FRECUENCIA CARDÍACA AL DESPERTAR */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Frecuencia Cardíaca al Despertar (FC Reposo)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="35"
                max="180"
                value={restingHrInput}
                onChange={(e) => setRestingHrInput(e.target.value)}
                placeholder="Ej. 54"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
                ppm
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Una elevación sostenida de &gt;5-7 ppm sobre tu línea base indica fatiga parasimpática.
            </p>
          </div>
        </div>

        {/* SAVE BUTTON & FEEDBACK */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Marcadores guardados y aplicados al cálculo de descarga</span>
            </div>
          ) : (
            <span className="text-xs text-neutral-400">
              Valores actuales: {report.autonomic_recovery.sleep_hours}h sueño · {report.autonomic_recovery.resting_hr_bpm} ppm FC reposo
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveMarkers}
            disabled={savingMarkers}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            {savingMarkers ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{savingMarkers ? 'Guardando...' : 'Guardar Marcadores'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
