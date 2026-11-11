"use client";

import React, { useState } from "react";
import { Sparkles, Flame, AlertCircle } from "lucide-react";

interface DynamicCalorieRingProps {
  consumedKcal: number;
  budgetKcal: number;
  consumedProteinG: number;
  consumedCarbsG: number;
  consumedFatG: number;
  size?: number;
}

export function DynamicCalorieRing({
  consumedKcal,
  budgetKcal,
  consumedProteinG,
  consumedCarbsG,
  consumedFatG,
  size = 112,
}: DynamicCalorieRingProps) {
  // Alternar entre ver kcal libres o consumidas al tocar el círculo
  const [showConsumed, setShowConsumed] = useState(false);

  const budget = Math.max(1, budgetKcal);
  const consumed = Math.max(0, consumedKcal);
  const remaining = budget - consumed;
  const isOverBudget = consumed > budget;
  const pct = Math.round((consumed / budget) * 100);

  // Kcal aportadas por cada macronutriente
  const proteinKcal = Math.round(consumedProteinG * 4);
  const carbsKcal = Math.round(consumedCarbsG * 4);
  const fatKcal = Math.round(consumedFatG * 9);

  // Geometría SVG
  const r = 40;
  const C = 2 * Math.PI * r; // ~251.327

  const rawMacroSum = proteinKcal + carbsKcal + fatKcal;
  // Si no hay desglose exacto pero sí hay consumedKcal, usar consumedKcal
  const effectiveKcalSum = rawMacroSum > 0 ? rawMacroSum : consumed;

  // Escalar los arcos si superan el 100% para completar el círculo armónicamente
  const rawTotalLength = (effectiveKcalSum / budget) * C;
  const scale = rawTotalLength > C ? C / rawTotalLength : 1;

  let proteinLength = 0;
  let carbsLength = 0;
  let fatLength = 0;

  if (rawMacroSum > 0) {
    proteinLength = ((proteinKcal / budget) * C) * scale;
    carbsLength = ((carbsKcal / budget) * C) * scale;
    fatLength = ((fatKcal / budget) * C) * scale;
  } else if (consumed > 0) {
    // Si no hay macros registrados pero sí calorías generales
    proteinLength = Math.min(C, (consumed / budget) * C);
  }

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => setShowConsumed((prev) => !prev)}
        className="relative cursor-pointer group select-none transition-transform active:scale-95"
        style={{ width: size, height: size }}
        title="Toca para alternar entre kcal libres y kcal consumidas"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90 drop-shadow-md"
        >
          {/* Pista de fondo (fondo oscuro del anillo) */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8.5"
            className="text-slate-800/80"
          />

          {/* Segmento 1: Proteínas (Verde Esmeralda - #10b981) */}
          {proteinLength > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#10b981"
              strokeWidth="8.5"
              strokeDasharray={`${proteinLength} ${C}`}
              strokeDashoffset={0}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Segmento 2: Carbohidratos (Azul Cielo - #38bdf8) */}
          {carbsLength > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="8.5"
              strokeDasharray={`${carbsLength} ${C}`}
              strokeDashoffset={-proteinLength}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Segmento 3: Grasas Saludables (Ámbar Dorado - #fbbf24) */}
          {fatLength > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="8.5"
              strokeDasharray={`${fatLength} ${C}`}
              strokeDashoffset={-(proteinLength + carbsLength)}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Anillo de advertencia si se excede el presupuesto */}
          {isOverBudget && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Contenido Central del Anillo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
          <span
            className={`text-lg font-black block leading-none transition-colors ${
              isOverBudget
                ? "text-rose-400"
                : showConsumed
                ? "text-emerald-300"
                : "text-white"
            }`}
          >
            {showConsumed ? consumed : remaining >= 0 ? remaining : `+${Math.abs(remaining)}`}
          </span>

          <span
            className={`text-[9.5px] font-bold block mt-0.5 tracking-tight ${
              isOverBudget
                ? "text-rose-400"
                : showConsumed
                ? "text-slate-300"
                : "text-emerald-400"
            }`}
          >
            {isOverBudget
              ? "kcal excedidas"
              : showConsumed
              ? "kcal consumidas"
              : "kcal libres"}
          </span>

          <span className="text-[9px] font-mono text-slate-400 mt-0.5 font-semibold">
            {pct}%
          </span>
        </div>
      </div>

      {/* Mini Leyenda de Colores */}
      <div className="flex items-center justify-center gap-2 mt-2 text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>{proteinKcal}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
          <span>{carbsKcal}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>{fatKcal}</span>
        </span>
      </div>
    </div>
  );
}
