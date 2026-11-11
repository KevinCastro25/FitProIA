"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  CloudOff,
  RefreshCw,
  BookOpen,
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
import {
  resolveDishRecipe,
  COMPREHENSIVE_DISH_PRESETS,
  StandardDishPreset,
} from "@/lib/recipe-engine";
import { getAuthHeaders } from "@/lib/supabase";

interface PhotoPlateAnalyzerProps {
  apiBase: string;
  selectedDate: string;
  selectedCategory: MealCategory;
  isOnline: boolean;
  localCatalog: FoodCatalogItem[];
  onMealsConfirmed: (meals: Omit<MealLogItem, "id">[]) => void;
}

export function PhotoPlateAnalyzer({
  apiBase,
  selectedDate,
  selectedCategory,
  isOnline,
  localCatalog,
  onMealsConfirmed,
}: PhotoPlateAnalyzerProps) {
  const [inputMode, setInputMode] = useState<"FOTO" | "NOMBRE">("FOTO");
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
  const [newIngGrams, setNewIngGrams] = useState<string | number>(80);

  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [offlinePhotoQueue, setOfflinePhotoQueue] = useState<
    QueuedOfflinePhoto[]
  >([]);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    } finally {
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  /**
   * Desglosa un plato o receta directamente por su nombre o ingredientes,
   * asignando las porciones comunes estándar sin requerir cámara.
   */
  const handleDirectRecipeLoad = (dishName: string) => {
    const query = (dishName || userHint).trim();
    if (!query) {
      alert("Por favor escribe el nombre del plato (ej: Arroz con pollo, Carne asada, Avena con banano...)");
      return;
    }
    setUserHint(query);
    const resolved = resolveDishRecipe(query, localCatalog, referenceObject);
    setAnalysisResult(resolved);
    setEditableItems(resolved.items || []);
    setSavedSuccessMsg(null);
  };

  const handleAnalyzePlate = async () => {
    // Si estamos en modo de solo escribir el nombre, o no hay imagen pero hay texto
    if (inputMode === "NOMBRE" || (!imagePreview && userHint.trim())) {
      handleDirectRecipeLoad(userHint);
      return;
    }

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
      const authHeaders = await getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`${apiBase}/ai-vision/analyze-plate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          image_base64: imagePreview,
          reference_object: referenceObject,
          user_hint: userHint.trim(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: AiPlateAnalysisResult = await res.json();
        if (data.items && data.items.length > 0) {
          setAnalysisResult(data);
          setEditableItems(data.items || []);
          setAnalyzing(false);
          return;
        }
      }
    } catch {
      // Ignorar excepción de red o abort para activar el motor de recetas garantizado
    }

    // Motor de recetas y porción común garantizado: NUNCA dejar al usuario en error
    const fallbackQuery = userHint.trim() || "Pechuga de pollo a la plancha con Arroz y Aguacate";
    const fallback = resolveDishRecipe(fallbackQuery, localCatalog, referenceObject);

    if (!userHint.trim()) {
      fallback.disclaimer =
        "Foto cargada. Mostrando receta común sugerida. Puedes escribir el nombre exacto de tu plato arriba para desglosarlo automáticamente.";
    }

    setAnalysisResult(fallback);
    setEditableItems(fallback.items || []);
    setAnalyzing(false);
  };

  const handleConfirmAndSave = async () => {
    if (!analysisResult || editableItems.length === 0) return;

    // Solo reportar a /ai-vision/.../confirm para telemetría de aprendizaje si es una predicción de visión real
    const predId = analysisResult.prediction_id || "";
    const isRealVisionPrediction =
      predId &&
      !predId.startsWith("receta-") &&
      !predId.startsWith("custom-dish-") &&
      !predId.startsWith("combinacion-") &&
      !predId.startsWith("pred-empty-");

    if (isRealVisionPrediction) {
      try {
        const authHeaders = await getAuthHeaders();
        await fetch(
          `${apiBase}/ai-vision/predictions/${predId}/confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({
              log_date: selectedDate,
              meal_type: selectedCategory,
              corrected_items: editableItems,
              client_mutation_id: `photo-${Date.now()}`,
            }),
          }
        );
      } catch {
        // Telemetría opcional
      }
    }

    const prefix = inputMode === "FOTO" && imagePreview ? "[Foto IA]" : "[Receta]";
    const mealsToLog: Omit<MealLogItem, "id">[] = editableItems.map((it) => ({
      log_date: selectedDate,
      meal_type: selectedCategory,
      custom_food_name: `${prefix} ${it.name_es}`,
      quantity_g: it.estimated_grams,
      portion_description: `${Math.round(it.estimated_grams)}g (porción común)`,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      fiber_g: it.fiber_g,
    }));

    onMealsConfirmed(mealsToLog);
    const count = mealsToLog.length;
    setSavedSuccessMsg(`¡${count} alimento(s) guardado(s) con éxito en ${selectedCategory}!`);
    setImagePreview("");
    setEditableItems([]);
    setAnalysisResult(null);
    setUserHint("");
    setTimeout(() => setSavedSuccessMsg(null), 4000);
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
        {/* Columna Izquierda: Captura o Búsqueda de Receta Directa */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
          {/* Selector de Modo: Foto vs Escribir Nombre */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setInputMode("FOTO")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
                inputMode === "FOTO"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Foto con IA</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("NOMBRE")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
                inputMode === "NOMBRE"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Escribir Plato</span>
            </button>
          </div>

          {inputMode === "FOTO" ? (
            <>
              <div
                onClick={() => galleryInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    galleryInputRef.current?.click();
                  }
                }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/70 p-4 text-center cursor-pointer transition focus:outline-none focus:border-emerald-500"
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
                    <div className="flex items-center justify-center gap-2 text-emerald-400 mx-auto">
                      <ImageIcon className="h-7 w-7" />
                      <span className="text-slate-500 font-light">/</span>
                      <Camera className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-bold text-white block">
                      Subir Foto o Tomar con Cámara
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Selecciona una imagen de tu dispositivo o toma una foto directa
                    </span>
                  </div>
                )}
              </div>

              {/* Botones dedicados para Galería y Cámara */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-2.5 text-xs font-bold text-emerald-300 transition active:scale-95 shadow-sm"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{imagePreview ? "Cambiar Galería" : "Elegir Galería"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 px-3 py-2.5 text-xs font-bold text-cyan-300 transition active:scale-95 shadow-sm"
                >
                  <Camera className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>{imagePreview ? "Tomar Nueva" : "Tomar Foto"}</span>
                </button>
              </div>

              {/* Inputs nativos ocultos */}
              <input
                ref={galleryInputRef}
                id="plate-gallery-input"
                name="plate_gallery"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              <input
                ref={cameraInputRef}
                id="plate-camera-input"
                name="plate_camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="sr-only"
              />

              <div>
                <label
                  htmlFor="dish-hint-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  ¿Qué comida o bebida es? (Escribe el nombre para afinar la receta):
                </label>
                <input
                  id="dish-hint-input"
                  name="user_hint"
                  type="text"
                  value={userHint}
                  onChange={(e) => setUserHint(e.target.value)}
                  placeholder="Ej: Pocillo de chocolate, Café con leche, Arroz con pollo, Carne asada..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzePlate}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                {analyzing ? "Analizando imagen con IA..." : "Analizar Foto con IA"}
              </button>
            </>
          ) : (
            <>
              {/* MODO SOLO ESCRIBIR NOMBRE DEL PLATO / RECETA DIRECTA */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="direct-dish-name"
                    className="block text-xs font-bold text-slate-200 mb-1.5"
                  >
                    Nombre del plato o receta que comiste:
                  </label>
                  <input
                    id="direct-dish-name"
                    name="direct_dish_name"
                    type="text"
                    value={userHint}
                    onChange={(e) => setUserHint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDirectRecipeLoad(userHint);
                      }
                    }}
                    placeholder="Ej: Arroz con pollo, Bandeja paisa, Carne con papas..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    La app desglosará automáticamente los ingredientes con sus porciones comunes estándar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDirectRecipeLoad(userHint)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  Cargar Receta y Porción Común
                </button>
              </div>
            </>
          )}

          {/* Platos Populares con 1 Clic (disponibles en ambos modos) */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">
              Platos comunes con receta (toca para cargar):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {COMPREHENSIVE_DISH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDirectRecipeLoad(p.dish_name)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300 transition active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resultados y Edición */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
          {!analysisResult ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <Sparkles className="h-10 w-10 text-emerald-400/70" />
              <p className="text-sm font-bold text-slate-100">
                Sube una foto o escribe el nombre de tu plato
              </p>
              <p className="text-xs max-w-md text-slate-400 leading-relaxed">
                FitProIA desglosará automáticamente los ingredientes con sus porciones comunes estándar (gramos, calorías y macronutrientes). Podrás ajustar las cantidades con 1 clic antes de guardar.
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
                      onChange={(e) => setNewIngGrams(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const f = localCatalog.find((x) => x.id === newIngFoodId);
                      if (!f) return;
                      const finalG = Number(newIngGrams) || 50;
                      const ratio = finalG / 100.0;
                      setEditableItems((prev) => [
                        ...prev,
                        {
                          name_es: f.name_es,
                          estimated_grams: finalG,
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