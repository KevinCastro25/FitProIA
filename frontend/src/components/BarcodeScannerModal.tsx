"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Barcode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Upload,
} from "lucide-react";
import { FoodCatalogItem } from "@/lib/fitproia-store";
import { lookupFoodByBarcode } from "@/lib/image-vision-utils";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  localCatalog: FoodCatalogItem[];
  onFoodScanned: (food: FoodCatalogItem, grams: number) => void;
}

const SAMPLE_BARCODES = [
  { ean: "7702001001011", label: "Arepa Blanca CO (7702001001011)" },
  { ean: "7702001054321", label: "Yogur Griego CO (7702001054321)" },
  { ean: "7702099887766", label: "Bocadillo Veleño (7702099887766)" },
  { ean: "0748927024081", label: "Proteína Whey Isolate (0748927024081)" },
];

export function BarcodeScannerModal({
  isOpen,
  onClose,
  apiBase,
  localCatalog,
  onFoodScanned,
}: BarcodeScannerModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualEan, setManualEan] = useState("7702001001011");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [scannedResult, setScannedResult] = useState<{
    source: string;
    food: FoodCatalogItem;
  } | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [gramsToLog, setGramsToLog] = useState<number>(100);

  // Sincronizar con <dialog> nativo usando showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const stopCameraStream = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {}
      controlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [isOpen]);

  const handleBarcodeLookup = async (code: string) => {
    setLoadingLookup(true);
    setNotFoundMsg(null);
    const res = await lookupFoodByBarcode(code, apiBase, localCatalog);
    setLoadingLookup(false);
    if (res.found && res.food) {
      setScannedResult({ source: res.source, food: res.food });
      setGramsToLog(res.food.serving_weight_g || 100);
      stopCameraStream();
    } else {
      setScannedResult(null);
      setNotFoundMsg(
        `Código o texto detectado: "${code}". No se encontró en el catálogo ni en Open Food Facts.`
      );
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    setNotFoundMsg(null);

    // 1. Intentar primero con BarcodeDetector nativo si está soportado (Chrome / Safari 17+)
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        const supported = (await BarcodeDetectorClass.getSupportedFormats?.()) || [];
        const desired = [
          "qr_code",
          "ean_13",
          "ean_8",
          "code_128",
          "code_39",
          "upc_a",
          "upc_e",
          "data_matrix",
        ].filter((f) => supported.includes(f));

        const detector = new BarcodeDetectorClass({
          formats: desired.length > 0 ? desired : ["qr_code", "ean_13"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);

          let active = true;
          controlsRef.current = {
            stop: () => {
              active = false;
              stream.getTracks().forEach((t) => t.stop());
            },
          };

          const scanFrame = async () => {
            if (!active || !videoRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const val = barcodes[0].rawValue;
                  if (val) {
                    setManualEan(val);
                    handleBarcodeLookup(val);
                    return;
                  }
                }
              }
            } catch {}
            if (active) {
              requestAnimationFrame(scanFrame);
            }
          };
          requestAnimationFrame(scanFrame);
          return;
        }
      } catch (e) {
        console.warn("BarcodeDetector fallback a ZXing:", e);
      }
    }

    // 2. Fallback a ZXing BrowserMultiFormatReader con soporte QR + Códigos de barras
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.AZTEC,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      setCameraActive(true);

      if (!videoRef.current) return;
      const controls = await codeReader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        },
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            setManualEan(text);
            handleBarcodeLookup(text);
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setCameraActive(false);
      setCameraError(
        "No se pudo acceder a la cámara. Puedes subir una foto del código o usar el buscador manual abajo."
      );
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingLookup(true);
    setNotFoundMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Probar primero con BarcodeDetector
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            try {
              const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
              const detector = new BarcodeDetectorClass();
              const codes = await detector.detect(img);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                const val = codes[0].rawValue;
                setManualEan(val);
                await handleBarcodeLookup(val);
                return;
              }
            } catch {}
          }

          // Fallback con ZXing
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.AZTEC,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const codeReader = new BrowserMultiFormatReader(hints);
          const res = await codeReader.decodeFromImageElement(img);
          if (res) {
            const text = res.getText();
            setManualEan(text);
            await handleBarcodeLookup(text);
            return;
          }
        } catch {
          setNotFoundMsg(
            "No se detectó ningún código QR o de barras en la imagen. Intenta con una imagen más nítida o escribe el código manualmente."
          );
        } finally {
          setLoadingLookup(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="barcode-dialog-title"
      onClose={() => {
        stopCameraStream();
        onClose();
      }}
      className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Barcode className="h-5 w-5" />
          </div>
          <div>
            <h2 id="barcode-dialog-title" className="text-base font-bold text-white">
              Escáner de Código de Barras y QR
            </h2>
            <p className="text-xs text-slate-400">
              Escanea productos en vivo con tu cámara o sube una imagen
            </p>
          </div>
        </div>
        <form method="dialog">
          <button
            value="cancel"
            aria-label="Cerrar escáner"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {/* Visor de Cámara */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? "opacity-100" : "opacity-0 absolute pointer-events-none"
            }`}
          />
          {!cameraActive && (
            <div className="text-center p-4 space-y-3 z-10">
              <Camera className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-300">
                Apunta la cámara al código de barras o código QR del empaque
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={startScanner}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Activar Cámara
                </button>
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-emerald-400" />
                  Subir Foto QR / Barra
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileScan}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-40 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
              </div>
              <span className="mt-3 text-[11px] font-semibold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full">
                Buscando código QR o de barras...
              </span>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Entrada Manual de Respaldo */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBarcodeLookup(manualEan);
          }}
          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2.5"
        >
          <label
            htmlFor="manual-ean-input"
            className="block text-xs font-semibold text-slate-300"
          >
            Buscar por número de código o texto:
          </label>
          <div className="flex gap-2">
            <input
              id="manual-ean-input"
              name="ean"
              type="text"
              value={manualEan}
              onChange={(e) => setManualEan(e.target.value)}
              placeholder="Ej: 7702001001011 o nombre del alimento"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={loadingLookup}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Search className="h-4 w-4" />
              {loadingLookup ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {SAMPLE_BARCODES.map((b) => (
              <button
                key={b.ean}
                type="button"
                onClick={() => {
                  setManualEan(b.ean);
                  handleBarcodeLookup(b.ean);
                }}
                className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/50"
              >
                {b.label}
              </button>
            ))}
          </div>
        </form>

        {notFoundMsg && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {notFoundMsg}
          </div>
        )}

        {/* Producto Encontrado */}
        {scannedResult && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Fuente: {scannedResult.source}
              </span>
              {scannedResult.food.barcode_ean13 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {scannedResult.food.barcode_ean13}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                {scannedResult.food.name_es}
              </h3>
              <p className="text-xs text-slate-400">
                Porción sugerida: {scannedResult.food.serving_label}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label
                  htmlFor="scanned-grams-input"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Cantidad a registrar (g):
                </label>
                <input
                  id="scanned-grams-input"
                  name="grams"
                  type="number"
                  min={1}
                  value={gramsToLog}
                  onChange={(e) => setGramsToLog(Number(e.target.value) || 100)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Calorías</span>
                  <strong className="text-white">
                    {Math.round(
                      (scannedResult.food.kcal_per_100g * gramsToLog) / 100
                    )}{" "}
                    kcal
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Proteína</span>
                  <strong className="text-emerald-400">
                    {(
                      (scannedResult.food.protein_g_per_100g * gramsToLog) /
                      100
                    ).toFixed(1)}
                    g
                  </strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onFoodScanned(scannedResult.food, gramsToLog);
                stopCameraStream();
                onClose();
              }}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              Registrar este alimento
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}