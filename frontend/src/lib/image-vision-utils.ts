// ============================================================================
// FitProIA — Fase 2: Compresión de Imagen en Cliente (iPhone Safari),
// Cola Offline de Fotos en IndexedDB, Visión IA y Open Food Facts
// ============================================================================

import { FoodCatalogItem, idbGet, idbSet } from "./fitproia-store";

export interface AiDetectedIngredient {
  name_es: string;
  estimated_grams: number;
  confidence: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
}

export interface AiPlateAnalysisResult {
  prediction_id: string;
  model_version: string;
  dish_name: string;
  reference_object: "PLATE_26CM" | "HAND" | "CUTLERY" | "NONE";
  overall_confidence: number;
  is_colombian_dish: boolean;
  flagged_for_review: boolean;
  items: AiDetectedIngredient[];
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  disclaimer: string;
}

export interface QueuedOfflinePhoto {
  id: string;
  image_base64: string;
  compressed_kb: number;
  reference_object: "PLATE_26CM" | "HAND" | "CUTLERY" | "NONE";
  user_hint: string;
  meal_type: string;
  created_at: string;
}

/**
 * Redimensiona y comprime en el navegador del iPhone (máx 1280px, JPEG q=0.78)
 * antes de subir al servidor o guardar en la cola offline de IndexedDB.
 */
export async function compressPlateImageClient(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  compressedSizeKb: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagen no soportado"));
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D no disponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        resolve({
          dataUrl,
          width,
          height,
          compressedSizeKb: Math.max(1, Math.round(approxBytes / 1024)),
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// --- Gestión de Cola Offline de Fotos en IndexedDB ---
const PHOTO_QUEUE_KEY = "fitproia_offline_photo_queue";

export async function getOfflinePhotoQueue(): Promise<QueuedOfflinePhoto[]> {
  return (await idbGet<QueuedOfflinePhoto[]>(PHOTO_QUEUE_KEY)) ?? [];
}

export async function enqueueOfflinePhoto(photo: QueuedOfflinePhoto): Promise<void> {
  const current = await getOfflinePhotoQueue();
  await idbSet(PHOTO_QUEUE_KEY, [photo, ...current]);
}

export async function removeOfflinePhoto(id: string): Promise<void> {
  const current = await getOfflinePhotoQueue();
  await idbSet(
    PHOTO_QUEUE_KEY,
    current.filter((item) => item.id !== id)
  );
}

// --- Recalcular macros de un ingrediente al cambiar gramos en la UI ---
export function recalculateIngredientForGrams(
  ing: AiDetectedIngredient,
  newGrams: number
): AiDetectedIngredient {
  const g = Math.max(0, newGrams);
  const ratio = g / 100.0;
  return {
    ...ing,
    estimated_grams: g,
    kcal: Math.round(ing.kcal_per_100g * ratio),
    protein_g: Number((ing.protein_g_per_100g * ratio).toFixed(1)),
    carbs_g: Number((ing.carbs_g_per_100g * ratio).toFixed(1)),
    fat_g: Number((ing.fat_g_per_100g * ratio).toFixed(1)),
    fiber_g: Number((ing.fiber_g_per_100g * ratio).toFixed(1)),
  };
}

// --- Consulta de Código de Barras (Servidor FastAPI + Fallback directo a Open Food Facts) ---
export async function lookupFoodByBarcode(
  ean: string,
  apiBase: string,
  localCatalog: FoodCatalogItem[]
): Promise<{
  found: boolean;
  source: string;
  food: FoodCatalogItem | null;
}> {
  const clean = ean.replace(/\D/g, "");
  if (!clean) return { found: false, source: "INVALID", food: null };

  // 1. Intentar vía Backend FastAPI (/foods/barcode/{ean})
  try {
    const res = await fetch(`${apiBase}/foods/barcode/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.food) {
        return {
          found: true,
          source: data.lookup_source,
          food: data.food as FoodCatalogItem,
        };
      }
    }
  } catch {
    // Continuar con búsqueda local + Open Food Facts directo desde cliente
  }

  // 2. Búsqueda en catálogo local en memoria / IndexedDB
  const localMatch = localCatalog.find((f) => f.barcode_ean13 === clean);
  if (localMatch) {
    return { found: true, source: "LOCAL_CATALOG", food: localMatch };
  }

  // 3. Consulta directa a Open Food Facts API v2 desde el navegador
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${clean}.json`
    );
    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        const p = offData.product;
        const n = p.nutriments || {};
        const servingG = Number(p.serving_quantity) || 100;
        const foodItem: FoodCatalogItem = {
          id: `off-${clean}`,
          name_es:
            p.product_name_es || p.product_name || `Producto (${clean})`,
          category: "Open Food Facts",
          region: clean.startsWith("770") ? "CO" : "GLOBAL",
          source: "OPENFOODFACTS",
          barcode_ean13: clean,
          serving_label: p.serving_size || `1 porción (${servingG}g)`,
          serving_weight_g: servingG,
          kcal_per_100g: Number(
            (n["energy-kcal_100g"] || n["energy-kcal"] || 0).toFixed(1)
          ),
          protein_g_per_100g: Number((n.proteins_100g || 0).toFixed(1)),
          carbs_g_per_100g: Number((n.carbohydrates_100g || 0).toFixed(1)),
          fat_g_per_100g: Number((n.fat_100g || 0).toFixed(1)),
          fiber_g_per_100g: Number((n.fiber_100g || 0).toFixed(1)),
        };
        return { found: true, source: "OPENFOODFACTS_LIVE", food: foodItem };
      }
    }
  } catch {
    // Sin red o producto no encontrado
  }

  return { found: false, source: "NOT_FOUND", food: null };
}
