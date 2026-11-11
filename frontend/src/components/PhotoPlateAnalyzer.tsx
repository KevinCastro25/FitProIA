"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import {
  FoodCatalogItem,
  MealCategory,
  MealLogItem,
} from "@/lib/fitproia-store";
import {
  AiDetectedIngredient,
  AiPlateAnalysisResult,
  QueuedOfflinePhoto,
  compressPlateImageClient,
  enqueueOfflinePhoto,
  getOfflinePhotoQueue,
  removeOfflinePhoto,
  recalculateIngredientForGrams,
} from "@/lib/image-vision-utils";

interface PhotoPlateAnalyzerProps {
  apiBase: string;
  selectedDate: string;
  selectedCategory: MealCategory;
  isOnline: boolean;
  localCatalog: FoodCatalogItem[];
  onMealsConfirmed: (meals: Omit<MealLogItem, "id">[]) => void;
}

const QUICK_DISH_PRESETS = [
  {
    id: "almuerzo_ejecutivo_pollo",
    label: "Almuerzo: Pollo a la plancha con Arroz y Aguacate",
  },
  {
    id: "bandeja_paisa",
    label: "Bandeja Paisa",
  },
  {
    id: "desayuno_arepa_pericos",
    label: "Desayuno: Huevos Pericos + Arepa + Quesito",
  },
  {
    id: "ajiaco_santafereno",
    label: "Ajiaco Santafereño con Pollo",
  },
];

export function PhotoPlateAnalyzer({
  apiBase,
  selectedDate,
  selectedCategory,
  isOnline,
  localCatalog,
  onMealsConfirmed,
}: PhotoPlateAnalyzerProps) {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [compressionStats, setCompressionStats] = useState<{
    width: number;
    height: number;
    sizeKb: number;
  } | null>(null);
  const [referenceObject, setReferenceObject] = useState<
    "PLATE_26CM" | "HAND" | "CUTLERY" | "NONE"
  >("PLATE_26CM");
  const [userHint, setUserHint] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AiPlateAnalysisResult | null>(null);
  const [editableItems, setEditableItems] = useState<AiDetectedIngredient[]>([]);
  const [newIngFoodId, setNewIngFoodId] = useState<string>(
    localCatalog[0]?.id ?? ""
  );
  const [newIngGrams, setNewIngGrams] = useState<number>(80);

  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [offlinePhotoQueue, setOfflinePhotoQueue] = useState<
    QueuedOfflinePhoto[]
  >([]);

  useEffect(() => {
    getOfflinePhotoQueue().then(setOfflinePhotoQueue);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPlateImageClient(file);
      setImagePreview(compressed.dataUrl);
      setCompressionStats({
        width: compressed.width,
        height: compressed.height,
        sizeKb: compressed.compressedSizeKb,
      });
      // Limpiar resultado anterior para esperar nuevo análisis
      setAnalysisResult(null);
      setEditableItems([]);
      setSavedSuccessMsg(null);
    } catch {
      // Fallback directo si falla canvas
    }
  };

  const buildLocalFallbackAnalysis = (
    hint: string,
    refObj: "PLATE_26CM" | "HAND" | "CUTLERY" | "NONE"
  ): AiPlateAnalysisResult => {
    const h = hint.toLowerCase();

    if (h.includes("bandeja") || h.includes("paisa")) {
      const items: AiDetectedIngredient[] = [
        {
          name_es: "Lomo de res magro asado",
          estimated_grams: 160,
          confidence: 0.85,
          kcal: 307,
          protein_g: 45.6,
          carbs_g: 0,
          fat_g: 13.1,
          fiber_g: 0,
          kcal_per_100g: 192,
          protein_g_per_100g: 28.5,
          carbs_g_per_100g: 0,
          fat_g_per_100g: 8.2,
          fiber_g_per_100g: 0,
        },
        {
          name_es: "Fríjoles rojos colombianos cocidos",
          estimated_grams: 160,
          confidence: 0.86,
          kcal: 203,
          protein_g: 13.9,
          carbs_g: 36.5,
          fat_g: 0.8,
          fiber_g: 10.2,
          kcal_per_100g: 127,
          protein_g_per_100g: 8.7,
          carbs_g_per_100g: 22.8,
          fat_g_per_100g: 0.5,
          fiber_g_per_100g: 6.4,
        },
        {
          name_es: "Arroz blanco cocido",
          estimated_grams: 140,
          confidence: 0.9,
          kcal: 182,
          protein_g: 3.8,
          carbs_g: 39.5,
          fat_g: 0.4,
          fiber_g: 0.6,
          kcal_per_100g: 130,
          protein_g_per_100g: 2.7,
          carbs_g_per_100g: 28.2,
          fat_g_per_100g: 0.3,
          fiber_g_per_100g: 0.4,
        },
        {
          name_es: "Aguacate Hass",
          estimated_grams: 70,
          confidence: 0.88,
          kcal: 112,
          protein_g: 1.4,
          carbs_g: 6.0,
          fat_g: 10.3,
          fiber_g: 4.7,
          kcal_per_100g: 160,
          protein_g_per_100g: 2.0,
          carbs_g_per_100g: 8.5,
          fat_g_per_100g: 14.7,
          fiber_g_per_100g: 6.7,
        },
      ];
      return {
        prediction_id: `pred-local-${Date.now()}`,
        model_version: "preset-bandeja-paisa",
        dish_name: "Bandeja Paisa Antioqueña",
        reference_object: refObj,
        overall_confidence: 0.88,
        is_colombian_dish: true,
        flagged_for_review: false,
        items,
        total_kcal: items.reduce((a, b) => a + b.kcal, 0),
        total_protein_g: Number(items.reduce((a, b) => a + b.protein_g, 0).toFixed(1)),
        total_carbs_g: Number(items.reduce((a, b) => a + b.carbs_g, 0).toFixed(1)),
        total_fat_g: Number(items.reduce((a, b) => a + b.fat_g, 0).toFixed(1)),
        total_fiber_g: Number(items.reduce((a, b) => a + b.fiber_g, 0).toFixed(1)),
        disclaimer: "Estimación basada en plato típico.",
      };
    } else if (h.includes("desayuno") || h.includes("arepa") || h.includes("perico")) {
      const items: AiDetectedIngredient[] = [
        {
          name_es: "Huevos pericos con tomate y cebolla",
          estimated_grams: 180,
          confidence: 0.92,
          kcal: 266,
          protein_g: 21.2,
          carbs_g: 3.8,
          fat_g: 18.4,
          fiber_g: 0.9,
          kcal_per_100g: 148,
          protein_g_per_100g: 11.8,
          carbs_g_per_100g: 2.1,
          fat_g_per_100g: 10.2,
          fiber_g_per_100g: 0.5,
        },
        {
          name_es: "Arepa de maíz blanco asada",
          estimated_grams: 90,
          confidence: 0.94,
          kcal: 176,
          protein_g: 4.1,
          carbs_g: 36.5,
          fat_g: 1.3,
          fiber_g: 2.5,
          kcal_per_100g: 195,
          protein_g_per_100g: 4.6,
          carbs_g_per_100g: 40.5,
          fat_g_per_100g: 1.4,
          fiber_g_per_100g: 2.8,
        },
        {
          name_es: "Quesito campesino",
          estimated_grams: 60,
          confidence: 0.88,
          kcal: 138,
          protein_g: 10.5,
          carbs_g: 1.4,
          fat_g: 10.1,
          fiber_g: 0,
          kcal_per_100g: 230,
          protein_g_per_100g: 17.5,
          carbs_g_per_100g: 2.4,
          fat_g_per_100g: 16.8,
          fiber_g_per_100g: 0,
        },
      ];
      return {
        prediction_id: `pred-local-${Date.now()}`,
        model_version: "preset-desayuno",
        dish_name: "Desayuno: Huevos Pericos, Arepa y Quesito",
        reference_object: refObj,
        overall_confidence: 0.9,
        is_colombian_dish: true,
        flagged_for_review: false,
        items,
        total_kcal: items.reduce((a, b) => a + b.kcal, 0),
        total_protein_g: Number(items.reduce((a, b) => a + b.protein_g, 0).toFixed(1)),
        total_carbs_g: Number(items.reduce((a, b) => a + b.carbs_g, 0).toFixed(1)),
        total_fat_g: Number(items.reduce((a, b) => a + b.fat_g, 0).toFixed(1)),
        total_fiber_g: Number(items.reduce((a, b) => a + b.fiber_g, 0).toFixed(1)),
        disclaimer: "Estimación basada en plato típico.",
      };
    } else if (h.includes("ajiaco")) {
      const items: AiDetectedIngredient[] = [
        {
          name_es: "Ajiaco Santafereño con pollo y papa",
          estimated_grams: 450,
          confidence: 0.85,
          kcal: 549,
          protein_g: 34.2,
          carbs_g: 62.1,
          fat_g: 18.5,
          fiber_g: 9.5,
          kcal_per_100g: 122,
          protein_g_per_100g: 7.6,
          carbs_g_per_100g: 13.8,
          fat_g_per_100g: 4.1,
          fiber_g_per_100g: 2.1,
        },
      ];
      return {
        prediction_id: `pred-local-${Date.now()}`,
        model_version: "preset-ajiaco",
        dish_name: "Ajiaco Santafereño con Pollo Desmechado",
        reference_object: refObj,
        overall_confidence: 0.85,
        is_colombian_dish: true,
        flagged_for_review: false,
        items,
        total_kcal: items.reduce((a, b) => a + b.kcal, 0),
        total_protein_g: Number(items.reduce((a, b) => a + b.protein_g, 0).toFixed(1)),
        total_carbs_g: Number(items.reduce((a, b) => a + b.carbs_g, 0).toFixed(1)),
        total_fat_g: Number(items.reduce((a, b) => a + b.fat_g, 0).toFixed(1)),
        total_fiber_g: Number(items.reduce((a, b) => a + b.fiber_g, 0).toFixed(1)),
        disclaimer: "Estimación basada en plato típico.",
      };
    }

    // Si no hubo coincidencia y tampoco foto
    return {
      prediction_id: `pred-local-${Date.now()}`,
      model_version: "offline",
      dish_name: "Plato no identificado",
      reference_object: refObj,
      overall_confidence: 0.0,
      is_colombian_dish: false,
      flagged_for_review: false,
      items: [],
      total_kcal: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
      total_fiber_g: 0,
      disclaimer: "Para analizar con precisión, toma una foto clara de tu plato.",
      error_message: "No se identificó el alimento. Toma una foto clara o elige uno de los platos predefinidos.",
    };
  };

  const handleAnalyzePlate = async () => {
    if (!imagePreview && !userHint.trim()) {
      alert("Por favor toma una foto de tu comida o escribe el nombre del plato.");
      return;
    }

    setAnalyzing(true);
    setSavedSuccessMsg(null);

    if (!isOnline && imagePreview) {
      const queued: QueuedOfflinePhoto = {
        id: `offline-photo-${Date.now()}`,
        image_base64: imagePreview,
        compressed_kb: compressionStats?.sizeKb ?? 180,
        reference_object: referenceObject,
        user_hint: userHint,
        meal_type: selectedCategory,
        created_at: new Date().toISOString(),
      };
      await enqueueOfflinePhoto(queued);
      setOfflinePhotoQueue(await getOfflinePhotoQueue());
    }

    try {
      const res = await fetch(`${apiBase}/ai-vision/analyze-plate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imagePreview,
          reference_object: referenceObject,
          user_hint: userHint.trim(),
        }),
      });

      if (res.ok) {
        const data: AiPlateAnalysisResult = await res.json();
        setAnalysisResult(data);
        setEditableItems(data.items || []);
        setAnalyzing(false);
        return;
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error_message || errJson?.detail || "Error en el servidor al analizar la foto.";
        setAnalysisResult({
          prediction_id: `err-${Date.now()}`,
          model_version: "error",
          dish_name: "Error en el análisis",
          reference_object: referenceObject,
          overall_confidence: 0,
          is_colombian_dish: false,
          flagged_for_review: false,
          items: [],
          total_kcal: 0,
          total_protein_g: 0,
          total_carbs_g: 0,
          total_fat_g: 0,
          total_fiber_g: 0,
          disclaimer: "",
          error_message: errMsg,
        });
        setEditableItems([]);
        setAnalyzing(false);
        return;
      }
    } catch {
      // Fallback local solo si hay un hint específico
      const fallback = buildLocalFallbackAnalysis(userHint, referenceObject);
      setAnalysisResult(fallback);
      setEditableItems(fallback.items || []);
      setAnalyzing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!analysisResult || editableItems.length === 0) return;

    try {
      await fetch(
        `${apiBase}/ai-vision/predictions/${analysisResult.prediction_id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            log_date: selectedDate,
            meal_type: selectedCategory,
            corrected_items: editableItems,
            client_mutation_id: `photo-${Date.now()}`,
          }),
        }
      );
    } catch {
      // Se sincroniza vía IndexedDB local
    }

    const mealsToLog: Omit<MealLogItem, "id">[] = editableItems.map((it) => ({
      log_date: selectedDate,
      meal_type: selectedCategory,
      custom_food_name: `[IA Foto] ${it.name_es}`,
      quantity_g: it.estimated_grams,
      portion_description: `${Math.round(it.estimated_grams)}g`,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      fiber_g: it.fiber_g,
    }));

    onMealsConfirmed(mealsToLog);
    setSavedSuccessMsg(`¡${mealsToLog.length} alimento(s) registrados con éxito en tu ${selectedCategory.toLowerCase()}!`);
  };

  const totalEditedKcal = editableItems.reduce((a, b) => a + b.kcal, 0);
  const totalEditedProtein = Number(
    editableItems.reduce((a, b) => a + b.protein_g, 0).toFixed(1)
  );
  const totalEditedCarbs = Number(
    editableItems.reduce((a, b) => a + b.carbs_g, 0).toFixed(1)
  );
  const totalEditedFat = Number(
    editableItems.reduce((a, b) => a + b.fat_g, 0).toFixed(1)
  );

  return (
    <div className="space-y-4">
      {/* Cola de Fotos Offline Pendientes */}
      {offlinePhotoQueue.length > 0 && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/30 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-sky-200">
            <CloudOff className="h-4 w-4 text-sky-400 shrink-0" />
            <span>
              Tienes <strong>{offlinePhotoQueue.length} foto(s) en cola local</strong> guardadas sin señal.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const first = offlinePhotoQueue[0];
              if (first) {
                setUserHint(first.user_hint);
                setReferenceObject(first.reference_object);
                await removeOfflinePhoto(first.id);
                setOfflinePhotoQueue(await getOfflinePhotoQueue());
                handleAnalyzePlate();
              }
            }}
            className="flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Procesar ahora
          </button>
        </div>
      )}

      {/* Panel Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna Izquierda: Captura y Parámetros */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-400" />
            Foto del Plato o Alimento
          </h3>

          <label
            htmlFor="plate-photo-input"
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/70 p-4 text-center cursor-pointer transition"
          >
            {imagePreview ? (
              <div className="space-y-2 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Vista previa del plato"
                  className="max-h-48 mx-auto rounded-xl object-cover"
                />
                {compressionStats && (
                  <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Foto lista ({compressionStats.sizeKb} KB)
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 py-4">
                <Camera className="h-8 w-8 text-emerald-400 mx-auto" />
                <span className="text-xs font-bold text-white block">
                  Tomar Foto o Elegir de Galería
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Apunta a tu comida desde arriba o en ángulo de 45°
                </span>
              </div>
            )}
            <input
              id="plate-photo-input"
              name="plate_photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          <div>
            <label
              htmlFor="ref-object-select"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Objeto de referencia visual en la mesa:
            </label>
            <select
              id="ref-object-select"
              name="reference_object"
              value={referenceObject}
              onChange={(e) =>
                setReferenceObject(
                  e.target.value as
                    | "PLATE_26CM"
                    | "HAND"
                    | "CUTLERY"
                    | "NONE"
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="PLATE_26CM">
                Plato estándar (~26 cm)
              </option>
              <option value="HAND">Mano / Puño al lado del plato</option>
              <option value="CUTLERY">Cubierto estándar (~20 cm)</option>
              <option value="NONE">Sin referencia</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dish-hint-input"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Pista opcional (si deseas guiar a la IA):
            </label>
            <input
              id="dish-hint-input"
              name="user_hint"
              type="text"
              value={userHint}
              onChange={(e) => setUserHint(e.target.value)}
              placeholder="Ej: Salmón con ensalada, Ajiaco..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_DISH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setUserHint(p.label)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/50"
                >
                  {p.label.split(":")[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyzePlate}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Analizando imagen con IA..." : "Analizar Foto con IA"}
          </button>
        </div>

        {/* Columna Derecha: Resultados y Edición */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
          {!analysisResult ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Sparkles className="h-9 w-9 text-emerald-400/60" />
              <p className="text-sm font-bold text-slate-200">
                Toma una foto de tu plato para comenzar
              </p>
              <p className="text-xs max-w-md">
                La IA identificará los ingredientes y calculará las calorías y macronutrientes.
                Podrás revisar o ajustar las porciones antes de guardar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Encabezado del Resultado */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    {analysisResult.model_version.includes("error") ? "Aviso" : `IA: ${analysisResult.model_version}`}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {analysisResult.dish_name}
                  </h4>
                </div>
                {analysisResult.overall_confidence > 0 && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      analysisResult.overall_confidence >= 0.8
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    Confianza: {Math.round(analysisResult.overall_confidence * 100)}%
                  </span>
                )}
              </div>

              {/* Mensaje de error si la API no pudo procesar */}
              {analysisResult.error_message && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{analysisResult.error_message}</span>
                </div>
              )}

              {/* Lista de Ingredientes Detectados */}
              {editableItems.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-300">
                    Ingredientes identificados (puedes ajustar los gramos):
                  </p>
                  {editableItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {item.name_es}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.kcal} kcal •{" "}
                          <strong className="text-emerald-400">
                            {item.protein_g}g P
                          </strong>{" "}
                          | {item.carbs_g}g C | {item.fat_g}g G
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`ai-item-grams-${idx}`}
                          className="text-[11px] text-slate-400"
                        >
                          Gramos:
                        </label>
                        <input
                          id={`ai-item-grams-${idx}`}
                          name={`grams_${idx}`}
                          type="number"
                          min={5}
                          max={2000}
                          value={item.estimated_grams}
                          onChange={(e) => {
                            const g = Number(e.target.value) || 0;
                            setEditableItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? recalculateIngredientForGrams(it, g) : it
                              )
                            );
                          }}
                          className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditableItems((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label={`Quitar ${item.name_es}`}
                          className="rounded-xl p-2 text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar ingrediente extra */}
              {editableItems.length > 0 && (
                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3">
                  <div className="flex-1 min-w-[180px]">
                    <label
                      htmlFor="add-missing-ing"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      ¿Faltó algún ingrediente?
                    </label>
                    <select
                      id="add-missing-ing"
                      name="missing_food_id"
                      value={newIngFoodId}
                      onChange={(e) => setNewIngFoodId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    >
                      {localCatalog.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name_es}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label
                      htmlFor="add-missing-grams"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Gramos
                    </label>
                    <input
                      id="add-missing-grams"
                      name="missing_grams"
                      type="number"
                      min={5}
                      value={newIngGrams}
                      onChange={(e) => setNewIngGrams(Number(e.target.value) || 50)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const f = localCatalog.find((x) => x.id === newIngFoodId);
                      if (!f) return;
                      const ratio = newIngGrams / 100.0;
                      setEditableItems((prev) => [
                        ...prev,
                        {
                          name_es: f.name_es,
                          estimated_grams: newIngGrams,
                          confidence: 1.0,
                          kcal: Math.round(f.kcal_per_100g * ratio),
                          protein_g: Number((f.protein_g_per_100g * ratio).toFixed(1)),
                          carbs_g: Number((f.carbs_g_per_100g * ratio).toFixed(1)),
                          fat_g: Number((f.fat_g_per_100g * ratio).toFixed(1)),
                          fiber_g: Number((f.fiber_g_per_100g * ratio).toFixed(1)),
                          kcal_per_100g: f.kcal_per_100g,
                          protein_g_per_100g: f.protein_g_per_100g,
                          carbs_g_per_100g: f.carbs_g_per_100g,
                          fat_g_per_100g: f.fat_g_per_100g,
                          fiber_g_per_100g: f.fiber_g_per_100g,
                        },
                      ]);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </button>
                </div>
              )}

              {/* Resumen Total y Confirmar */}
              {editableItems.length > 0 && (
                <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total</span>
                      <strong className="text-base font-black text-white">
                        {totalEditedKcal} kcal
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-400 block">Proteína</span>
                      <strong className="text-base font-black text-emerald-400">
                        {totalEditedProtein}g
                      </strong>
                    </div>
                    <div>
                      <span className="text-sky-400 block">Carbos</span>
                      <strong className="text-base font-black text-sky-400">
                        {totalEditedCarbs}g
                      </strong>
                    </div>
                    <div>
                      <span className="text-amber-400 block">Grasas</span>
                      <strong className="text-base font-black text-amber-400">
                        {totalEditedFat}g
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmAndSave}
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                  >
                    Guardar en {selectedCategory}
                  </button>
                </div>
              )}

              {savedSuccessMsg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs text-emerald-200 flex items-center gap-2.5"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <strong className="font-bold text-white">
                    {savedSuccessMsg}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}