"use client";

import React, { useState } from "react";
import {
  Bot,
  ShieldAlert,
  Stethoscope,
  ShoppingCart,
  Lightbulb,
  Send,
  Brain,
  Download,
} from "lucide-react";

interface Props {
  apiBase: string;
  remainingKcal: number;
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  bodyFatPct: number;
  targetBodyFatPct: number;
  leanMassKg: number;
  weightKg: number;
  proteinTargetG: number;
  trainingKcal: number;
  restKcal: number;
  streakDays: number;
  onExportCsv: () => void;
}

type Json = Record<string, any>;

async function api<T = Json>(base: string, path: string, method = "GET", body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export function CoachHealthExtrasView(p: Props) {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "coach"; text: string }[]>([]);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [suggestions, setSuggestions] = useState<Json | null>(null);
  const [plan, setPlan] = useState<Json | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [medical, setMedical] = useState<Json | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [weeklyLoss, setWeeklyLoss] = useState(0.35);
  const [mlRun, setMlRun] = useState<Json | null>(null);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  const note = () => setOfflineNote("Sin conexión al servidor: esta función requiere la API activa.");

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setChat((c) => [...c, { role: "user", text: q }]);
    setQuestion("");
    setLoadingCoach(true);
    const r = await api(p.apiBase, "/coach/ask", "POST", {
      question: q,
      current_body_fat_pct: p.bodyFatPct,
      target_body_fat_pct: p.targetBodyFatPct,
      lean_body_mass_kg: p.leanMassKg,
      current_weight_kg: p.weightKg,
      protein_target_g: p.proteinTargetG,
      training_day_kcal: p.trainingKcal,
      rest_day_kcal: p.restKcal,
    });
    setLoadingCoach(false);
    if (r) setChat((c) => [...c, { role: "coach", text: r.answer }]);
    else note();
  };

  const loadSuggestions = async () => {
    const r = await api(p.apiBase, "/meals/smart-suggestions", "POST", {
      remaining_kcal: p.remainingKcal,
      remaining_protein_g: p.remainingProteinG,
      remaining_carbs_g: p.remainingCarbsG,
      remaining_fat_g: p.remainingFatG,
    });
    r ? setSuggestions(r) : note();
  };

  const loadPlan = async () => {
    const r = await api(p.apiBase, "/meals/weekly-plan");
    r ? setPlan(r) : note();
  };

  const evalMedical = async () => {
    const r = await api(p.apiBase, "/medical/evaluate", "POST", {
      recent_weekly_weight_loss_kg: weeklyLoss,
      reported_symptoms: symptoms,
    });
    r ? setMedical(r) : note();
  };

  const runMl = async () => {
    const r = await api(p.apiBase, "/vision/retraining/run", "POST");
    r ? setMlRun(r) : note();
  };

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const card = "rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3";
  const btn =
    "rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400";

  const badges = [
    { label: "Racha 7 días", on: p.streakDays >= 7 },
    { label: "Racha 14 días", on: p.streakDays >= 14 },
    { label: "Racha 30 días", on: p.streakDays >= 30 },
    { label: "Proteína cubierta", on: p.remainingProteinG <= 20 },
  ];

  return (
    <div className="space-y-5">
      {offlineNote && (
        <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          {offlineNote}
        </p>
      )}

      {/* Gamificación */}
      <section className={card}>
        <h3 className="text-sm font-bold text-white">Constancia: {p.streakDays} días seguidos registrando</h3>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`rounded-full px-3 py-1 text-[11px] font-bold border ${
                b.on
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
            >
              {b.on ? "🏅" : "🔒"} {b.label}
            </span>
          ))}
        </div>
      </section>

      {/* Coach IA */}
      <section className={card}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Asistente IA con tus datos</h3>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto" aria-live="polite">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl p-3 text-xs whitespace-pre-wrap ${
                m.role === "user" ? "bg-slate-800 text-white ml-8" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-100 mr-8"
              }`}
            >
              {m.text}
            </div>
          ))}
          {loadingCoach && <p className="text-xs text-slate-400">Analizando tu progreso…</p>}
        </div>
        <form onSubmit={ask} className="flex gap-2">
          <label htmlFor="coach-q" className="sr-only">Pregunta al coach</label>
          <input
            id="coach-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: ¿Por qué no baja mi peso si la cintura sí?"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
          />
          <button type="submit" className={btn} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500">Orientativo; no reemplaza a tu médico o nutricionista.</p>
      </section>

      {/* Sugerencias para cerrar macros */}
      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Cerrar el día: faltan {Math.round(p.remainingProteinG)}g proteína · {Math.max(0, Math.round(p.remainingKcal))} kcal
            </h3>
          </div>
          <button type="button" onClick={loadSuggestions} className={btn}>Sugerir</button>
        </div>
        {suggestions?.suggestions?.map((s: Json) => (
          <div key={s.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200 space-y-1">
            <p className="font-bold text-white">{s.title} <span className="text-emerald-400">· {s.tag}</span></p>
            <p>{s.description}</p>
            <p className="text-slate-400">{s.kcal} kcal · {s.protein_g}g P · {s.carbs_g}g C · {s.fat_g}g G</p>
            <p className="text-emerald-300">{s.why}</p>
          </div>
        ))}
        {suggestions?.colombian_substitutions?.map((c: Json) => (
          <details key={c.category} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
            <summary className="cursor-pointer font-bold text-white">Sustituciones: {c.category}</summary>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {c.equivalences.map((e: string) => <li key={e}>{e}</li>)}
            </ul>
          </details>
        ))}
      </section>

      {/* Plan semanal y lista de compras */}
      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Plan semanal y lista de compras</h3>
          </div>
          <button type="button" onClick={loadPlan} className={btn}>Generar</button>
        </div>
        {plan && (
          <>
            <div className="space-y-2">
              {plan.days.map((d: Json) => (
                <details key={d.day} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                  <summary className="cursor-pointer font-bold text-white">
                    {d.day} · {d.day_type.replaceAll("_", " ")} · {d.target_kcal} kcal
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(d.meals).map(([k, v]) => (
                      <li key={k}><strong className="text-emerald-400">{k}:</strong> {String(v)}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
            <div className="space-y-2">
              {plan.grocery_list.map((sec: Json) => (
                <fieldset key={sec.section} className="rounded-2xl border border-slate-800 p-3">
                  <legend className="px-2 text-[11px] font-bold text-sky-300">{sec.section}</legend>
                  {sec.items.map((it: Json) => {
                    const id = `g-${it.item}`;
                    return (
                      <label key={id} htmlFor={id} className="flex items-center gap-2 text-xs text-slate-200 py-0.5">
                        <input
                          id={id}
                          type="checkbox"
                          checked={!!checked[id]}
                          onChange={(e) => setChecked((c) => ({ ...c, [id]: e.target.checked }))}
                        />
                        <span className={checked[id] ? "line-through text-slate-500" : ""}>
                          {it.item} — {it.quantity}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Salud y seguridad */}
      <section className={card}>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-rose-400" />
          <h3 className="text-sm font-bold text-white">Salud, chequeos médicos y señales de alarma</h3>
        </div>
        <fieldset className="rounded-2xl border border-slate-800 p-3">
          <legend className="px-2 text-[11px] text-slate-400">¿Has sentido alguno de estos síntomas?</legend>
          <div className="flex flex-wrap gap-3 text-xs text-slate-200">
            {[
              ["MAREOS", "Mareos"],
              ["DOLOR_PERSISTENTE", "Dolor persistente"],
              ["FATIGA_EXTREMA", "Fatiga extrema"],
              ["CONDUCTA_RESTRICTIVA", "Ansiedad con la comida"],
            ].map(([v, l]) => (
              <label key={v} htmlFor={`sym-${v}`} className="inline-flex items-center gap-1.5">
                <input id={`sym-${v}`} type="checkbox" checked={symptoms.includes(v)} onChange={() => toggleSymptom(v)} />
                {l}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label htmlFor="wk-loss" className="block text-[11px] text-slate-400 mb-1">
              Pérdida de peso última semana: {weeklyLoss.toFixed(2)} kg
            </label>
            <input
              id="wk-loss"
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={weeklyLoss}
              onChange={(e) => setWeeklyLoss(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </fieldset>
        <button type="button" onClick={evalMedical} className={btn}>Evaluar</button>
        {medical && (
          <div className="space-y-2">
            {medical.red_flags.length === 0 && (
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                Sin señales de alarma detectadas.
              </p>
            )}
            {medical.red_flags.map((f: Json) => (
              <div key={f.code} className="flex gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="font-bold">{f.title} ({f.severity})</p>
                  <p>{f.clinical_action}</p>
                </div>
              </div>
            ))}
            {medical.recommended_panels.map((pn: Json) => (
              <details key={pn.category} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                <summary className="cursor-pointer font-bold text-white">
                  {pn.category} · próximo: {pn.next_due_date}
                </summary>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {pn.biomarkers.map((b: string) => <li key={b}>{b}</li>)}
                </ul>
                <p className="mt-1 text-slate-400">{pn.clinical_why}</p>
              </details>
            ))}
            <p className="text-[10px] text-slate-500">{medical.medical_disclaimer}</p>
          </div>
        )}
      </section>

      {/* Pipeline ML y exportación */}
      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Evaluación del modelo de visión (foto de platos)</h3>
          </div>
          <button type="button" onClick={runMl} className={btn}>Evaluar ahora</button>
        </div>
        {mlRun && (
          <div className="text-xs text-slate-300 space-y-1">
            <p className="text-emerald-300">{mlRun.summary_note}</p>
            <p>Muestras: {mlRun.total_samples_evaluated} · Colombianas: {mlRun.colombian_dishes_count} · Baja confianza: {mlRun.low_confidence_prioritized_count}</p>
            <ul className="list-disc pl-5">
              {Object.entries(mlRun.category_metrics).map(([k, v]: [string, any]) => (
                <li key={k}>{k}: MAPE {v.gram_mape_pct}% · F1 {v.identification_f1_pct}%</li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={p.onExportCsv}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500"
        >
          <Download className="h-4 w-4 text-emerald-400" /> Exportar CSV para nutricionista/coach
        </button>
      </section>
    </div>
  );
}
