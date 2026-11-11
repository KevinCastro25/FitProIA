"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Utensils,
  ChefHat,
  Trash2,
  Sparkles,
  Check,
  Camera,
  Barcode,
} from "lucide-react";
import {
  FoodCatalogItem,
  MealCategory,
  MealLogItem,
  RecipeItem,
} from "@/lib/fitproia-store";
import { PhotoPlateAnalyzer } from "@/components/PhotoPlateAnalyzer";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

interface NutritionMealsViewProps {
  apiBase: string;
  isOnline: boolean;
  foods: FoodCatalogItem[];
  recipes: RecipeItem[];
  mealsToday: MealLogItem[];
  onLogMeal: (meal: Omit<MealLogItem, "id">) => void;
  onLogMultipleMeals: (meals: Omit<MealLogItem, "id">[]) => void;
  onDeleteMeal: (id: string) => void;
  onCreateCustomFood: (food: Omit<FoodCatalogItem, "id" | "source">) => void;
  onCreateRecipe: (recipe: Omit<RecipeItem, "id">) => void;
  selectedDate: string;
}

const MEAL_CATEGORIES: { value: MealCategory; label: string }[] = [
  { value: "DESAYUNO", label: "Desayuno" },
  { value: "ALMUERZO", label: "Almuerzo" },
  { value: "CENA", label: "Cena" },
  { value: "PRE_ENTRENO", label: "Pre-Entreno" },
  { value: "POST_ENTRENO", label: "Post-Entreno" },
  { value: "SNACK", label: "Snack" },
];

export function NutritionMealsView({
  apiBase,
  isOnline,
  foods,
  recipes,
  mealsToday,
  onLogMeal,
  onLogMultipleMeals,
  onDeleteMeal,
  onCreateCustomFood,
  onCreateRecipe,
  selectedDate,
}: NutritionMealsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<MealCategory>("ALMUERZO");
  const [selectedFood, setSelectedFood] = useState<FoodCatalogItem | null>(
    foods[0] ?? null
  );
  const [grams, setGrams] = useState<string | number>(foods[0]?.serving_weight_g ?? 100);
  const [activeSubTab, setActiveSubTab] = useState<
    "FOTO_IA" | "BUSCADOR" | "RECETAS" | "NUEVO_ALIMENTO"
  >("FOTO_IA");
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Estado para nuevo alimento colombiano/personalizado
  const [customName, setCustomName] = useState("");
  const [customServingLabel, setCustomServingLabel] = useState(
    "1 porción casera (120g)"
  );
  const [customServingG, setCustomServingG] = useState<string | number>(120);
  const [customKcal100, setCustomKcal100] = useState<string | number>(180);
  const [customP100, setCustomP100] = useState<string | number>(15);
  const [customC100, setCustomC100] = useState<string | number>(20);
  const [customF100, setCustomF100] = useState<string | number>(5);
  const [customFib100, setCustomFib100] = useState<string | number>(3);

  // Estado para creador de recetas propias
  const [recipeName, setRecipeName] = useState("");
  const [recipeServings, setRecipeServings] = useState<string | number>(2);
  const [recipeIngredients, setRecipeIngredients] = useState<
    RecipeItem["ingredients"]
  >([]);
  const [ingFoodId, setIngFoodId] = useState<string>(foods[0]?.id ?? "");
  const [ingWeightG, setIngWeightG] = useState<string | number>(150);

  const filteredFoods = foods.filter(
    (f) =>
      f.name_es.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleSelectFood = (food: FoodCatalogItem) => {
    setSelectedFood(food);
    setGrams(food.serving_weight_g);
  };

  const handleAddSelectedFood = (e: React.FormEvent) => {
    e.preventDefault();
    const numGrams = Number(grams) || 0;
    if (!selectedFood || numGrams <= 0) return;
    const ratio = numGrams / 100.0;
    onLogMeal({
      log_date: selectedDate,
      meal_type: selectedCategory,
      custom_food_name: selectedFood.name_es,
      quantity_g: numGrams,
      portion_description:
        numGrams === selectedFood.serving_weight_g
          ? selectedFood.serving_label
          : `${numGrams}g`,
      kcal: Math.round(selectedFood.kcal_per_100g * ratio),
      protein_g: Number((selectedFood.protein_g_per_100g * ratio).toFixed(1)),
      carbs_g: Number((selectedFood.carbs_g_per_100g * ratio).toFixed(1)),
      fat_g: Number((selectedFood.fat_g_per_100g * ratio).toFixed(1)),
      fiber_g: Number((selectedFood.fiber_g_per_100g * ratio).toFixed(1)),
    });
    showToast(`Añadido a ${selectedCategory}: ${selectedFood.name_es}`);
  };

  const handleCreateCustomFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onCreateCustomFood({
      name_es: customName.trim(),
      category: "Personalizado / Colombiano",
      region: "CO",
      serving_label: customServingLabel,
      serving_weight_g: Number(customServingG) || 100,
      kcal_per_100g: Number(customKcal100) || 0,
      protein_g_per_100g: Number(customP100) || 0,
      carbs_g_per_100g: Number(customC100) || 0,
      fat_g_per_100g: Number(customF100) || 0,
      fiber_g_per_100g: Number(customFib100) || 0,
    });
    setCustomName("");
    setActiveSubTab("BUSCADOR");
    showToast("Alimento guardado en tu catálogo colombiano");
  };

  const handleAddRecipeIngredient = () => {
    const f = foods.find((item) => item.id === ingFoodId);
    const numWeight = Number(ingWeightG) || 0;
    if (!f || numWeight <= 0) return;
    const ratio = numWeight / 100.0;
    setRecipeIngredients((prev) => [
      ...prev,
      {
        food_name: f.name_es,
        weight_g: numWeight,
        kcal: Math.round(f.kcal_per_100g * ratio),
        protein_g: Number((f.protein_g_per_100g * ratio).toFixed(1)),
        carbs_g: Number((f.carbs_g_per_100g * ratio).toFixed(1)),
        fat_g: Number((f.fat_g_per_100g * ratio).toFixed(1)),
        fiber_g: Number((f.fiber_g_per_100g * ratio).toFixed(1)),
      },
    ]);
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim() || recipeIngredients.length === 0) return;
    const servings = Math.max(1, Number(recipeServings) || 1);
    const totalWeight = recipeIngredients.reduce(
      (acc, i) => acc + i.weight_g,
      0
    );
    const totalKcal = recipeIngredients.reduce((acc, i) => acc + i.kcal, 0);
    const totalP = recipeIngredients.reduce((acc, i) => acc + i.protein_g, 0);
    const totalC = recipeIngredients.reduce((acc, i) => acc + i.carbs_g, 0);
    const totalF = recipeIngredients.reduce((acc, i) => acc + i.fat_g, 0);
    const totalFib = recipeIngredients.reduce((acc, i) => acc + i.fiber_g, 0);

    onCreateRecipe({
      name: recipeName.trim(),
      servings,
      total_weight_g: Math.round(totalWeight),
      kcal_per_serving: Math.round(totalKcal / servings),
      protein_g_per_serving: Number((totalP / servings).toFixed(1)),
      carbs_g_per_serving: Number((totalC / servings).toFixed(1)),
      fat_g_per_serving: Number((totalF / servings).toFixed(1)),
      fiber_g_per_serving: Number((totalFib / servings).toFixed(1)),
      ingredients: recipeIngredients,
    });
    setRecipeName("");
    setRecipeIngredients([]);
    showToast("Receta creada con macros por porción calculados");
  };

  return (
    <div className="space-y-5">
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300"
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Selector de Momento de Comida */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          1. Selecciona la comida a registrar
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MEAL_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`rounded-2xl py-2.5 px-2 text-xs font-bold transition ${
                selectedCategory === cat.value
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sub-pestañas Fase 2: Foto IA (Gemini), Código de Barras (ZXing), Catálogo CO, Recetas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("FOTO_IA")}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-bold border transition ${
            activeSubTab === "FOTO_IA"
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
              : "border-slate-800 bg-slate-900/60 text-slate-300"
          }`}
        >
          <Camera className="h-4 w-4 text-emerald-400" />
          Foto con IA (Gemini)
        </button>

        <button
          type="button"
          onClick={() => setBarcodeModalOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-bold border border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 transition"
        >
          <Barcode className="h-4 w-4 text-sky-400" />
          Escanear Código
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("BUSCADOR")}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-bold border transition ${
            activeSubTab === "BUSCADOR"
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
              : "border-slate-800 bg-slate-900/60 text-slate-300"
          }`}
        >
          <Utensils className="h-4 w-4" />
          Base Colombiana
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("RECETAS")}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-bold border transition ${
            activeSubTab === "RECETAS"
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
              : "border-slate-800 bg-slate-900/60 text-slate-300"
          }`}
        >
          <ChefHat className="h-4 w-4" />
          Mis Recetas ({recipes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("NUEVO_ALIMENTO")}
          className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-bold border transition ${
            activeSubTab === "NUEVO_ALIMENTO"
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
              : "border-slate-800 bg-slate-900/60 text-slate-300"
          }`}
        >
          <Plus className="h-4 w-4" />
          Crear Plato
        </button>
      </div>

      {/* SUB-VISTA FASE 2: DETECCIÓN DE COMIDA POR FOTO CON GOOGLE GEMINI VISION */}
      {activeSubTab === "FOTO_IA" && (
        <PhotoPlateAnalyzer
          apiBase={apiBase}
          selectedDate={selectedDate}
          selectedCategory={selectedCategory}
          isOnline={isOnline}
          localCatalog={foods}
          onMealsConfirmed={(confirmedList) => {
            onLogMultipleMeals(confirmedList);
            showToast(
              `Registrados ${confirmedList.length} ingredientes por Foto IA en ${selectedCategory}`
            );
          }}
        />
      )}

      {/* SUB-VISTA 1: BUSCADOR DE ALIMENTOS COLOMBIANOS Y DEPORTIVOS */}
      {activeSubTab === "BUSCADOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <search>
              <form
                action="/foods"
                method="GET"
                onSubmit={(e) => e.preventDefault()}
                aria-labelledby="food-search-heading"
              >
                <label
                  id="food-search-heading"
                  htmlFor="food-search-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Buscar alimento o plato típico colombiano
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="food-search-input"
                    name="q"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej: arepa, bandeja paisa, ajiaco, pechuga, whey..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="search"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                  />
                </div>
              </form>
            </search>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredFoods.map((food) => {
                const isSelected = selectedFood?.id === food.id;
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleSelectFood(food)}
                    className={`w-full text-left rounded-2xl border p-3 transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">
                          {food.name_es}
                        </span>
                        {food.region === "CO" && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            CO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {food.serving_label} •{" "}
                        <strong className="text-emerald-400">
                          {food.protein_g_per_100g}g P
                        </strong>{" "}
                        | {food.carbs_g_per_100g}g C | {food.fat_g_per_100g}g G (por
                        100g)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-white">
                        {Math.round(
                          (food.kcal_per_100g * food.serving_weight_g) / 100
                        )}{" "}
                        kcal
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        por porción
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calculadora de Porción y Registro en 1 Toque */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            {selectedFood ? (
              <form
                method="POST"
                action="/api/v1/meals"
                onSubmit={handleAddSelectedFood}
                className="space-y-4"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Ajustar porción para {selectedCategory}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedFood.name_es}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Medida casera referencia: {selectedFood.serving_label}
                  </p>
                </div>

                {/* Botones rápidos de medida casera con una sola mano */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "½ porción",
                      w: Math.round(selectedFood.serving_weight_g * 0.5),
                    },
                    {
                      label: "1 porción",
                      w: Math.round(selectedFood.serving_weight_g),
                    },
                    {
                      label: "1.5 porciones",
                      w: Math.round(selectedFood.serving_weight_g * 1.5),
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGrams(preset.w)}
                      className={`rounded-xl py-2 text-xs font-semibold border transition ${
                        grams === preset.w
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                          : "border-slate-800 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {preset.label} ({preset.w}g)
                    </button>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="portion-grams-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Cantidad exacta en gramos (g):
                  </label>
                  <input
                    id="portion-grams-input"
                    name="quantity_g"
                    type="number"
                    min={1}
                    max={2500}
                    required
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white"
                  />
                </div>

                {/* Resumen de Macros Calculados en Vivo */}
                <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-950/90 p-3 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Calorías
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {Math.round((selectedFood.kcal_per_100g * (Number(grams) || 0)) / 100)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block">
                      Proteína
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {((selectedFood.protein_g_per_100g * (Number(grams) || 0)) / 100).toFixed(
                        1
                      )}
                      g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-400 block">Carbos</span>
                    <span className="text-sm font-extrabold text-sky-400">
                      {((selectedFood.carbs_g_per_100g * (Number(grams) || 0)) / 100).toFixed(1)}
                      g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block">
                      Grasas
                    </span>
                    <span className="text-sm font-extrabold text-amber-400">
                      {((selectedFood.fat_g_per_100g * (Number(grams) || 0)) / 100).toFixed(1)}g
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Registrar en {selectedCategory}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: RECETAS PROPIAS CON CÁLCULO POR PORCIÓN */}
      {activeSubTab === "RECETAS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Mis Recetas Guardadas
            </h3>
            {recipes.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-white">{r.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1 porción ({Math.round(r.total_weight_g / r.servings)}g) •{" "}
                    <span className="text-emerald-400 font-semibold">
                      {r.protein_g_per_serving}g P
                    </span>{" "}
                    | {r.carbs_g_per_serving}g C | {r.fat_g_per_serving}g G
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLogMeal({
                      log_date: selectedDate,
                      meal_type: selectedCategory,
                      custom_food_name: `${r.name} (1 porción)`,
                      quantity_g: Math.round(r.total_weight_g / r.servings),
                      portion_description: "1 porción de receta",
                      kcal: r.kcal_per_serving,
                      protein_g: r.protein_g_per_serving,
                      carbs_g: r.carbs_g_per_serving,
                      fat_g: r.fat_g_per_serving,
                      fiber_g: r.fiber_g_per_serving,
                    });
                    showToast(`Receta registrada en ${selectedCategory}`);
                  }}
                  className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  + Añadir ({r.kcal_per_serving} kcal)
                </button>
              </div>
            ))}
          </div>

          <form
            method="POST"
            action="/api/v1/recipes"
            onSubmit={handleSaveRecipe}
            className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3"
          >
            <h3 className="text-sm font-bold text-white">
              Crear Nueva Receta con Cálculo Automático
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label
                  htmlFor="recipe-name"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Nombre de la receta
                </label>
                <input
                  id="recipe-name"
                  name="name"
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Ej: Calentado Fit Alto en Proteína"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="recipe-servings"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Porciones
                </label>
                <input
                  id="recipe-servings"
                  name="servings"
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={recipeServings}
                  onChange={(e) => setRecipeServings(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-7">
                <label
                  htmlFor="recipe-ing-select"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Ingrediente
                </label>
                <select
                  id="recipe-ing-select"
                  name="ingredient_id"
                  value={ingFoodId}
                  onChange={(e) => setIngFoodId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name_es}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label
                  htmlFor="recipe-ing-grams"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Gramos
                </label>
                <input
                  id="recipe-ing-grams"
                  name="ing_grams"
                  type="number"
                  min={5}
                  value={ingWeightG}
                  onChange={(e) => setIngWeightG(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleAddRecipeIngredient}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold text-emerald-400"
                >
                  + Ing.
                </button>
              </div>
            </div>

            {recipeIngredients.length > 0 && (
              <div className="rounded-2xl bg-slate-950 p-3 space-y-1.5 text-xs">
                {recipeIngredients.map((ing, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>
                      {ing.food_name} ({ing.weight_g}g)
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {ing.kcal} kcal | {ing.protein_g}g P
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Guardar Receta
            </button>
          </form>
        </div>
      )}

      {/* SUB-VISTA 3: CREAR ALIMENTO PERSONALIZADO / PLATO TÍPICO */}
      {activeSubTab === "NUEVO_ALIMENTO" && (
        <form
          method="POST"
          action="/api/v1/foods"
          onSubmit={handleCreateCustomFoodSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
        >
          <h3 className="text-base font-bold text-white">
            Añadir Alimento o Plato Colombiano al Catálogo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="custom-food-name"
                className="block text-xs text-slate-300 mb-1"
              >
                Nombre del alimento o preparación *
              </label>
              <input
                id="custom-food-name"
                name="name_es"
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej: Cazuela de fríjoles casera / Tamal tolimense"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="custom-serving-label"
                className="block text-xs text-slate-300 mb-1"
              >
                Etiqueta de medida casera
              </label>
              <input
                id="custom-serving-label"
                name="serving_label"
                type="text"
                value={customServingLabel}
                onChange={(e) => setCustomServingLabel(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label
                htmlFor="cf-weight"
                className="block text-xs text-slate-400 mb-1"
              >
                Peso porción (g)
              </label>
              <input
                id="cf-weight"
                name="serving_weight_g"
                type="number"
                value={customServingG}
                onChange={(e) => setCustomServingG(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cf-kcal"
                className="block text-xs text-slate-400 mb-1"
              >
                Kcal / 100g
              </label>
              <input
                id="cf-kcal"
                name="kcal_per_100g"
                type="number"
                value={customKcal100}
                onChange={(e) => setCustomKcal100(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cf-p"
                className="block text-xs text-emerald-400 mb-1"
              >
                Proteína / 100g
              </label>
              <input
                id="cf-p"
                name="protein_g_per_100g"
                type="number"
                step="0.1"
                value={customP100}
                onChange={(e) => setCustomP100(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cf-c"
                className="block text-xs text-sky-400 mb-1"
              >
                Carbos / 100g
              </label>
              <input
                id="cf-c"
                name="carbs_g_per_100g"
                type="number"
                step="0.1"
                value={customC100}
                onChange={(e) => setCustomC100(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cf-f"
                className="block text-xs text-amber-400 mb-1"
              >
                Grasas / 100g
              </label>
              <input
                id="cf-f"
                name="fat_g_per_100g"
                type="number"
                step="0.1"
                value={customF100}
                onChange={(e) => setCustomF100(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cf-fib"
                className="block text-xs text-slate-400 mb-1"
              >
                Fibra / 100g
              </label>
              <input
                id="cf-fib"
                name="fiber_g_per_100g"
                type="number"
                step="0.1"
                value={customFib100}
                onChange={(e) => setCustomFib100(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
          >
            Guardar en Base de Alimentos
          </button>
        </form>
      )}

      {/* Listado de Comidas Registradas Hoy */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Registro Detallado del Día ({mealsToday.length} entradas)
        </h3>
        {mealsToday.length === 0 ? (
          <p className="text-xs text-slate-400">
            Aún no has registrado comidas para esta fecha.
          </p>
        ) : (
          <div className="space-y-2">
            {mealsToday.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3"
              >
                <div>
                  <span className="inline-block rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mr-2">
                    {meal.meal_type}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {meal.custom_food_name}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {meal.portion_description} ({meal.quantity_g}g) •{" "}
                    <strong className="text-emerald-400">
                      {meal.protein_g}g P
                    </strong>{" "}
                    | {meal.carbs_g}g C | {meal.fat_g}g G | {meal.fiber_g}g Fibra
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-white">
                    {meal.kcal} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteMeal(meal.id)}
                    aria-label={`Eliminar ${meal.custom_food_name}`}
                    className="rounded-xl p-2 text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Escáner de Código de Barras (@zxing/browser + Open Food Facts) */}
      <BarcodeScannerModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        apiBase={apiBase}
        localCatalog={foods}
        onFoodScanned={(scannedFood, scannedGrams) => {
          const ratio = scannedGrams / 100.0;
          onLogMeal({
            log_date: selectedDate,
            meal_type: selectedCategory,
            custom_food_name: `[Código EAN] ${scannedFood.name_es}`,
            quantity_g: scannedGrams,
            portion_description: `Escaneado (${scannedGrams}g)`,
            kcal: Math.round(scannedFood.kcal_per_100g * ratio),
            protein_g: Number(
              (scannedFood.protein_g_per_100g * ratio).toFixed(1)
            ),
            carbs_g: Number((scannedFood.carbs_g_per_100g * ratio).toFixed(1)),
            fat_g: Number((scannedFood.fat_g_per_100g * ratio).toFixed(1)),
            fiber_g: Number((scannedFood.fiber_g_per_100g * ratio).toFixed(1)),
          });
          showToast(`Producto escaneado añadido: ${scannedFood.name_es}`);
        }}
      />
    </div>
  );
}
