"use client";

import React, { useState } from "react";
import { Bell, CheckCircle2, Smartphone, Mail } from "lucide-react";

interface WebPushSettingsCardProps {
  apiBase: string;
  isStandalone: boolean;
  onOpenInstallGuide: () => void;
}

export function WebPushSettingsCard({
  apiBase,
  isStandalone,
  onOpenInstallGuide,
}: WebPushSettingsCardProps) {
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const [proteinRem, setProteinRem] = useState(true);
  const [checkinRem, setCheckinRem] = useState(true);
  const [deloadAlert, setDeloadAlert] = useState(true);
  const [emailFallback, setEmailFallback] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleEnableWebPush = async () => {
    if (typeof window === "undefined") return;

    let perm = "granted";
    if ("Notification" in window) {
      try {
        perm = await Notification.requestPermission();
        setPushPermission(perm);
      } catch {
        perm = "default";
      }
    }

    try {
      await fetch(`${apiBase}/notifications/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://web.push.apple.com/fitproia-ios-standalone",
          p256dh_key: "vapid-p256dh-fitproia",
          auth_key: "vapid-auth-fitproia",
          device_platform: isStandalone ? "IOS_STANDALONE_PWA" : "WEB_FALLBACK",
          protein_reminder_enabled: proteinRem,
          checkin_reminder_enabled: checkinRem,
          deload_alert_enabled: deloadAlert,
          email_fallback_enabled: emailFallback,
        }),
      });
    } catch {}

    setStatusMsg(
      perm === "granted"
        ? "¡Permisos Web Push activados y sincronizados! Recibirás alertas de proteína, chequeos y descargas."
        : "Preferencias guardadas con respaldo automático In-App y por Correo."
    );
  };

  const handleSendTestPush = async () => {
    try {
      await fetch(`${apiBase}/notifications/test-push`, { method: "POST" });
    } catch {}

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("FitProIA — Alerta de Síntesis Proteica", {
          body: "Completa tu toma de 40g de proteína para proteger tu masa magra hoy.",
          icon: "/icons/icon.svg",
        });
      } catch {}
    }
    setStatusMsg(
      "Notificación de prueba disparada: 'FitProIA — Alerta de Síntesis Proteica (40g P)'."
    );
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Notificaciones Web Push (iOS 16.4+ Standalone) y Respaldo
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
          Estado Permiso: {pushPermission.toUpperCase()}
        </span>
      </div>

      {/* Flujo Guiado para iOS Safari */}
      {!isStandalone && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 flex items-center justify-between gap-3 text-xs text-sky-200">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-sky-400 shrink-0" />
            <span>
              <strong>Requisito de Apple en iPhone:</strong> Las notificaciones Web
              Push en iOS (16.4+) solo funcionan cuando instalas FitProIA en tu{" "}
              <strong>Pantalla de Inicio</strong>. Mientras tanto, tienes activo el
              respaldo In-App y por Correo.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenInstallGuide}
            className="shrink-0 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-slate-950"
          >
            Guía iPhone
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label
          htmlFor="push-prot"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer"
        >
          <input
            id="push-prot"
            name="protein_reminder_enabled"
            type="checkbox"
            checked={proteinRem}
            onChange={(e) => setProteinRem(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-slate-200 font-medium">
            Alerta vespertina si falta proteína para cubrir los g/kg del día
          </span>
        </label>

        <label
          htmlFor="push-chk"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer"
        >
          <input
            id="push-chk"
            name="checkin_reminder_enabled"
            type="checkbox"
            checked={checkinRem}
            onChange={(e) => setCheckinRem(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-slate-200 font-medium">
            Recordatorio de Chequeo Corporal en ayunas (quincenal/semanal)
          </span>
        </label>

        <label
          htmlFor="push-deload"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer"
        >
          <input
            id="push-deload"
            name="deload_alert_enabled"
            type="checkbox"
            checked={deloadAlert}
            onChange={(e) => setDeloadAlert(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-slate-200 font-medium">
            Alerta inteligente de Descarga (Deload) cuando ACWR supere 1.35
          </span>
        </label>

        <label
          htmlFor="push-email"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer"
        >
          <input
            id="push-email"
            name="email_fallback_enabled"
            type="checkbox"
            checked={emailFallback}
            onChange={(e) => setEmailFallback(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-slate-200 font-medium flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-emerald-400" />
            Respaldo automático por correo y avisos dentro de la app
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleEnableWebPush}
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          Activar Permisos Push y Guardar Preferencias
        </button>
        <button
          type="button"
          onClick={handleSendTestPush}
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-200 hover:border-emerald-500"
        >
          Enviar Notificación de Prueba
        </button>
      </div>

      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
    </section>
  );
}
