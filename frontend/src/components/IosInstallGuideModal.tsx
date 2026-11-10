"use client";

import React, { useRef, useEffect } from "react";
import { Smartphone, Share, PlusSquare, CheckCircle2, X } from "lucide-react";

interface IosInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalone: boolean;
}

export function IosInstallGuideModal({
  isOpen,
  onClose,
  isStandalone,
}: IosInstallGuideModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ios-install-title"
      onClose={onClose}
      className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h2 id="ios-install-title" className="text-lg font-bold">
              Instalar FitProIA en tu iPhone
            </h2>
            <p className="text-xs text-slate-400">
              Modo App Nativa (Pantalla completa, sin barra de Safari y Offline)
            </p>
          </div>
        </div>
        <form method="dialog">
          <button
            value="cancel"
            aria-label="Cerrar guía de instalación"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>

      {isStandalone ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
          <span>
            ¡Excelente! Ya estás ejecutando <strong>FitProIA</strong> instalada en modo
            pantalla completa (Standalone).
          </span>
        </div>
      ) : (
        <ol className="space-y-3 text-sm text-slate-200 my-4">
          <li className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              1
            </span>
            <div>
              <p className="font-semibold flex items-center gap-1.5">
                Toca el botón Compartir en Safari{" "}
                <Share className="h-4 w-4 text-sky-400 inline" />
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Ubicado en la barra inferior (o superior en iPad) de Safari iOS.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              2
            </span>
            <div>
              <p className="font-semibold flex items-center gap-1.5">
                Selecciona &ldquo;Añadir a la pantalla de inicio&rdquo;{" "}
                <PlusSquare className="h-4 w-4 text-emerald-400 inline" />
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Desliza el menú hacia abajo y toca &ldquo;Añadir&rdquo; en la esquina superior derecha.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              3
            </span>
            <div>
              <p className="font-semibold">Ábrela desde el ícono de FitProIA</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Tus datos viven seguros en el servidor (PostgreSQL/Supabase) y la cola
                local IndexedDB te permite registrar comidas y series aún sin señal en el
                gimnasio.
              </p>
            </div>
          </li>
        </ol>
      )}

      <form method="dialog">
        <button
          value="ok"
          autoFocus
          className="mt-2 w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
        >
          Entendido
        </button>
      </form>
    </dialog>
  );
}
