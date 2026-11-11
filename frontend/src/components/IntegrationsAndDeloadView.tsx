'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Dumbbell,
  Heart,
  Moon,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
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
  const currentSleepVal = sleepHours ?? report.autonomic_recovery.sleep_hours ?? 7.5;
  const currentRhrVal = restingHrBpm ?? report.autonomic_recovery.resting_hr_bpm ?? 56;

  const [sleepInput, setSleepInput] = useState<string>(String(currentSleepVal));
  const [restingHrInput, setRestingHrInput] = useState<string>(String(currentRhrVal));
  const [savingMarkers, setSavingMarkers] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default: Hoy

  // Historial de sueño de 7 días (persiste en localStorage)
  interface SleepDayPoint {
    dayLabel: string;
    dateStr: string;
    sleepHours: number;
    restingHrBpm: number;
  }

  const [sleepHistory, setSleepHistory] = useState<SleepDayPoint[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fitproia_sleep_history_7d');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 7) {
            return parsed;
          }
        }
      } catch {}
    }
    // Si no existe, generamos los 7 días de referencia terminando en el valor de hoy
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const varianceSleep = [-0.4, 0.3, -0.6, 0.5, 0.2, -0.3, 0];
    const varianceRhr = [2, -1, 3, 0, -2, 1, 0];
    const initialPoints: SleepDayPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = i === 0 ? 'Hoy' : dayNames[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];
      const s = Math.max(4.0, Math.min(10.5, Number((currentSleepVal + varianceSleep[6 - i]).toFixed(1))));
      const r = Math.max(45, Math.min(90, Math.round(currentRhrVal + varianceRhr[6 - i])));
      initialPoints.push({
        dayLabel,
        dateStr,
        sleepHours: i === 0 ? currentSleepVal : s,
        restingHrBpm: i === 0 ? currentRhrVal : r,
      });
    }
    return initialPoints;
  });

  // Mantener sincronizado el input si el prop cambia desde el exterior
  useEffect(() => {
    if (sleepHours !== undefined) {
      setSleepInput(String(sleepHours));
    }
  }, [sleepHours]);

  useEffect(() => {
    if (restingHrBpm !== undefined) {
      setRestingHrInput(String(restingHrBpm));
    }
  }, [restingHrBpm]);

  const handleSaveMarkers = async () => {
    const sleep = parseFloat(sleepInput);
    const hr = parseInt(restingHrInput, 10);
    if (isNaN(sleep) || sleep <= 0 || sleep > 24) return;
    if (isNaN(hr) || hr < 30 || hr > 220) return;

    setSavingMarkers(true);
    setSaveSuccess(false);
    try {
      await onUpdateRecoveryMarkers(sleep, hr, hrvMs ?? 68);

      // Actualizar el historial de 7 días con el valor de Hoy (índice 6)
      setSleepHistory((prev) => {
        const next = [...prev];
        if (next.length === 7) {
          next[6] = {
            ...next[6],
            sleepHours: sleep,
            restingHrBpm: hr,
          };
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('fitproia_sleep_history_7d', JSON.stringify(next));
          } catch {}
        }
        return next;
      });

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

      {/* APARTADO 2: SUEÑO Y FRECUENCIA CARDÍACA AL DESPERTAR (SECCIÓN INDEPENDIENTE CON GRÁFICAS Y MÉTRICAS) */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800/80 p-5 shadow-lg space-y-6">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Biomarcadores de Sueño y Recuperación (7 Días)
              </h3>
              <p className="text-xs text-neutral-400">
                Monitorea horas dormidas, deuda acumulada y frecuencia cardíaca basal al despertar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Meta diaria: 8.0 h
            </span>
          </div>
        </div>

        {/* 4 TARJETAS DE MÉTRICAS CLAVE */}
        {(() => {
          const currentSleep = parseFloat(sleepInput) || currentSleepVal;
          const currentRhr = parseInt(restingHrInput, 10) || currentRhrVal;
          const totalSleep7d = sleepHistory.reduce((acc, p) => acc + p.sleepHours, 0);
          const avgSleep7d = Number((totalSleep7d / Math.max(1, sleepHistory.length)).toFixed(1));
          const sleepDebt7d = Number((totalSleep7d - 7 * 8.0).toFixed(1));
          const optimalDaysCount = sleepHistory.filter((p) => p.sleepHours >= 7.5).length;
          const sleepScorePct = Math.min(100, Math.round((currentSleep / 8.0) * 100));

          return (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Score de Sueño Hoy */}
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5 text-cyan-400" />
                      Sueño Hoy
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      sleepScorePct >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                      sleepScorePct >= 75 ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {sleepScorePct}%
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black text-white">
                      {currentSleep.toFixed(1)} <span className="text-xs font-normal text-neutral-400">h / 8.0h</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          currentSleep >= 7.5 ? 'bg-emerald-400' :
                          currentSleep >= 6.5 ? 'bg-cyan-400' :
                          'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, (currentSleep / 8.0) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {currentSleep >= 7.5 ? 'Óptimo para hipertrofia' : currentSleep >= 6.5 ? 'Recuperación moderada' : 'Déficit de sueño activo'}
                  </span>
                </div>

                {/* 2. Deuda / Balance Semanal */}
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Balance Semanal
                    </span>
                    {sleepDebt7d >= 0 ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> Superávit
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" /> Deuda
                      </span>
                    )}
                  </div>
                  <div className="my-2">
                    <div className={`text-2xl font-black ${sleepDebt7d >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sleepDebt7d >= 0 ? `+${sleepDebt7d}` : sleepDebt7d} <span className="text-xs font-normal text-neutral-400">horas</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {sleepDebt7d >= 0 ? 'Sin fatiga central acumulada' : 'Compensa con siestas o +45min'}
                  </span>
                </div>

                {/* 3. Promedio 7 Días */}
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      Promedio 7 Días
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium">
                      {optimalDaysCount}/7 óptimos
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black text-white">
                      {avgSleep7d.toFixed(1)} <span className="text-xs font-normal text-neutral-400">h / noche</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate">
                    Total: {totalSleep7d.toFixed(1)}h dormidas
                  </span>
                </div>

                {/* 4. FC al Despertar */}
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      FC Reposo Basal
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      currentRhr <= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                      currentRhr <= 72 ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {currentRhr <= 60 ? 'Parasimpático' : currentRhr <= 72 ? 'Estable' : 'Elevada'}
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black text-white">
                      {currentRhr} <span className="text-xs font-normal text-neutral-400">ppm</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {currentRhr <= 60 ? 'Excelente recuperación vagal' : currentRhr <= 72 ? 'Línea base adecuada' : 'Alerta fatiga / sobreentreno'}
                  </span>
                </div>
              </div>

              {/* GRÁFICA SVG INTERACTIVA DE 7 DÍAS */}
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      Tendencia Semanal de Sueño y FC al Despertar
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      &ge; 7.5h Óptimo
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                      6.5 - 7.4h Regular
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                      &lt; 6.5h Déficit
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <div className="min-w-[480px]">
                    <svg viewBox="0 0 560 185" className="w-full h-44 select-none">
                      <defs>
                        <linearGradient id="sleepGradEmerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="sleepGradCyan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="sleepGradRose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                      </defs>

                      {/* LÍNEA GUÍA 8.0H (META) */}
                      <line
                        x1="20"
                        y1="58"
                        x2="540"
                        y2="58"
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        strokeWidth="1.2"
                        strokeOpacity="0.6"
                      />
                      <text x="535" y="54" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">
                        Meta 8.0h
                      </text>

                      {/* LÍNEA GUÍA 6.0H (LÍMITE DÉFICIT) */}
                      <line
                        x1="20"
                        y1="85"
                        x2="540"
                        y2="85"
                        stroke="#64748b"
                        strokeDasharray="2 4"
                        strokeWidth="1"
                        strokeOpacity="0.4"
                      />
                      <text x="535" y="81" fill="#64748b" fontSize="9" textAnchor="end">
                        6.0h
                      </text>

                      {/* LÍNEA BASE HORIZONTAL */}
                      <line x1="20" y1="140" x2="540" y2="140" stroke="#334155" strokeWidth="1" />

                      {/* BARRAS DE LOS 7 DÍAS */}
                      {sleepHistory.map((point, idx) => {
                        const isToday = idx === 6;
                        const isSelected = idx === selectedDayIndex;
                        const x = 32 + idx * 73;
                        const width = 48;
                        const maxVal = 11.0;
                        const barHeight = Math.max(14, Math.min(115, (point.sleepHours / maxVal) * 125));
                        const y = 140 - barHeight;

                        const fillUrl =
                          point.sleepHours >= 7.5
                            ? 'url(#sleepGradEmerald)'
                            : point.sleepHours >= 6.5
                            ? 'url(#sleepGradCyan)'
                            : 'url(#sleepGradRose)';

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer transition-opacity hover:opacity-90"
                            onClick={() => setSelectedDayIndex(idx)}
                          >
                            {/* Fondo de selección */}
                            {isSelected && (
                              <rect
                                x={x - 4}
                                y="18"
                                width={width + 8}
                                height="155"
                                rx="8"
                                fill="#ffffff"
                                fillOpacity="0.06"
                              />
                            )}

                            {/* Valor de horas arriba de la barra */}
                            <text
                              x={x + width / 2}
                              y={y - 6}
                              fill={isToday ? '#38bdf8' : '#e2e8f0'}
                              fontSize="11"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {point.sleepHours.toFixed(1)}h
                            </text>

                            {/* Barra vertical de sueño */}
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={barHeight}
                              rx="6"
                              fill={fillUrl}
                              stroke={isSelected ? '#ffffff' : isToday ? '#38bdf8' : 'none'}
                              strokeWidth={isSelected ? '2' : isToday ? '1.5' : '0'}
                            />

                            {/* Etiqueta del Día */}
                            <text
                              x={x + width / 2}
                              y="155"
                              fill={isToday ? '#38bdf8' : '#94a3b8'}
                              fontSize={isToday ? '11' : '10'}
                              fontWeight={isToday ? 'bold' : 'normal'}
                              textAnchor="middle"
                            >
                              {point.dayLabel}
                            </text>

                            {/* Frecuencia Cardíaca al despertar */}
                            <text
                              x={x + width / 2}
                              y="170"
                              fill={point.restingHrBpm > 70 ? '#fb7185' : '#64748b'}
                              fontSize="9.5"
                              fontWeight={isToday ? '600' : 'normal'}
                              textAnchor="middle"
                            >
                              {point.restingHrBpm} ppm
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* DETALLE DEL DÍA SELECCIONADO */}
                {sleepHistory[selectedDayIndex] && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        Día: {sleepHistory[selectedDayIndex].dayLabel} ({sleepHistory[selectedDayIndex].dateStr})
                      </span>
                      <span className="text-neutral-400">·</span>
                      <span className="text-cyan-300 font-semibold">
                        {sleepHistory[selectedDayIndex].sleepHours.toFixed(1)} horas de descanso
                      </span>
                      <span className="text-neutral-400">·</span>
                      <span className="text-rose-300 font-semibold">
                        {sleepHistory[selectedDayIndex].restingHrBpm} ppm FC basal
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {sleepHistory[selectedDayIndex].sleepHours >= 7.5
                        ? '✅ Recuperación parasimpática y hormonal completa'
                        : sleepHistory[selectedDayIndex].sleepHours >= 6.5
                        ? '⚠️ Sueño regular: mantén buen volumen de hidratación'
                        : '🛑 Déficit de descanso: modula la intensidad del entrenamiento'}
                    </span>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* CONTROLES DE REGISTRO RÁPIDO */}
        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Actualizar Marcadores de Hoy
            </span>
            <span className="text-[11px] text-neutral-400">
              Afecta el cálculo inmediato de la necesidad de semana de descarga
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HORAS DE SUEÑO */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span>Horas de Sueño</span>
                </span>
                <span className="text-[11px] text-neutral-400">Meta: 7.5 - 9.0 h</span>
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
              {/* Botones de ajuste rápido */}
              <div className="flex gap-1.5 pt-1">
                {[-0.5, 0.5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(sleepInput) || 7.5;
                      const next = Math.max(0, Math.min(24, Number((cur + delta).toFixed(1))));
                      setSleepInput(String(next));
                    }}
                    className="flex-1 py-1 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-300 transition"
                  >
                    {delta > 0 ? `+${delta}h` : `${delta}h`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSleepInput('8.0')}
                  className="py-1 px-2.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 transition"
                >
                  8.0h (Meta)
                </button>
              </div>
            </div>

            {/* FRECUENCIA CARDÍACA AL DESPERTAR */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Frecuencia Cardíaca al Despertar (FC Reposo)</span>
                </span>
                <span className="text-[11px] text-neutral-400">Normal: 50-65 ppm</span>
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
              {/* Botones de ajuste rápido */}
              <div className="flex gap-1.5 pt-1">
                {[52, 56, 60, 65].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRestingHrInput(String(preset))}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold transition ${
                      parseInt(restingHrInput, 10) === preset
                        ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SAVE BUTTON & FEEDBACK */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {saveSuccess ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcadores guardados, gráfica actualizada y aplicados al cálculo de descarga</span>
              </div>
            ) : (
              <span className="text-xs text-neutral-400">
                Valores registrados: {report.autonomic_recovery.sleep_hours}h sueño · {report.autonomic_recovery.resting_hr_bpm} ppm FC reposo
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveMarkers}
              disabled={savingMarkers}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {savingMarkers ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{savingMarkers ? 'Guardando...' : 'Guardar y Actualizar Gráfica'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
