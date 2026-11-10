"use client";

import React, { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AUTH_ENABLED, getSupabase, installAuthFetch } from "@/lib/supabase";

type Mode = "login" | "signup";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!AUTH_ENABLED);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    installAuthFetch();
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!AUTH_ENABLED || session) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-400" role="status">
        Cargando…
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (mode === "signup" && !consent) {
      setMsg({
        kind: "error",
        text: "Debes aceptar el tratamiento de datos de salud (Ley 1581 de 2012) para crear tu cuenta.",
      });
      return;
    }
    setBusy(true);
    const sb = getSupabase();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "error", text: "Correo o contraseña incorrectos." });
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, privacy_consent_ley1581: true },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setMsg({ kind: "error", text: error.message });
      else if (!data.session)
        setMsg({ kind: "info", text: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a iniciar sesión." });
    }
    setBusy(false);
  };

  const oauth = async (provider: "google" | "apple") => {
    setMsg(null);
    if (mode === "signup" && !consent) {
      setMsg({
        kind: "error",
        text: "Acepta primero el tratamiento de datos (Ley 1581) para continuar.",
      });
      return;
    }
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setMsg({ kind: "error", text: error.message });
  };

  const input =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-safe pb-safe">
      <div className="w-full max-w-sm space-y-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black">
            FP
          </div>
          <h1 className="text-xl font-black text-white">FitProIA</h1>
          <p className="text-xs text-slate-400">
            {mode === "login" ? "Inicia sesión para continuar" : "Crea tu cuenta"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => oauth("google")}
            className="rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-xs font-bold text-white hover:border-emerald-500"
          >
            Continuar con Google
          </button>
          <button
            type="button"
            onClick={() => oauth("apple")}
            className="rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-xs font-bold text-white hover:border-emerald-500"
          >
            Continuar con Apple
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label htmlFor="auth-name" className="block text-xs text-slate-300 mb-1">Nombre</label>
              <input id="auth-name" name="name" autoComplete="name" required value={fullName}
                onChange={(e) => setFullName(e.target.value)} className={input} />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-xs text-slate-300 mb-1">Correo</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="auth-pass" className="block text-xs text-slate-300 mb-1">Contraseña</label>
            <input id="auth-pass" name="password" type="password" required minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </div>
          {mode === "signup" && (
            <label htmlFor="auth-consent" className="flex items-start gap-2 text-[11px] text-slate-300">
              <input id="auth-consent" type="checkbox" checked={consent}
                onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>
                Autorizo el tratamiento de mis datos personales y de salud (peso, composición corporal,
                entrenamiento) conforme a la Ley 1581 de 2012 (habeas data).
              </span>
            </label>
          )}
          {msg && (
            <p role="alert"
              className={`rounded-xl p-2.5 text-xs ${
                msg.kind === "error"
                  ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
            {busy ? "Procesando…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <button type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
          className="w-full text-center text-xs font-semibold text-emerald-400 hover:underline">
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </main>
  );
}
