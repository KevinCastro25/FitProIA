// ============================================================================
// FitProIA — Motor de Recetas, Platos Colombianos y Desglose por Porción Común
// Permite desglosar automáticamente platos típicos y comidas fitness en sus
// ingredientes constituyentes con su porción común estándar (en gramos).
// ============================================================================

import { AiDetectedIngredient, AiPlateAnalysisResult } from "./image-vision-utils";
import { FoodCatalogItem } from "./fitproia-store";

export interface StandardDishPreset {
  id: string;
  label: string;
  category: "Almuerzo/Cena" | "Desayuno" | "Snack/Post-Entreno" | "Comida Rápida/Fit";
  dish_name: string;
  is_colombian_dish: boolean;
  overall_confidence: number;
  keywords: string[];
  items: AiDetectedIngredient[];
}

export const COMPREHENSIVE_DISH_PRESETS: StandardDishPreset[] = [
  {
    id: "sopa_minestrone",
    label: "🥣 Sopa de Minestrone / Minestrong",
    category: "Almuerzo/Cena",
    dish_name: "Sopa Minestrone Tradicional con Verduras, Frijoles y Pasta",
    is_colombian_dish: true,
    overall_confidence: 0.95,
    keywords: [
      "minestrone",
      "minestrong",
      "sopa de minestrone",
      "sopa de minestrong",
      "sopa minestrone",
      "sopa minestrong",
      "sopa minestrón",
      "minestron"
    ],
    items: [
      {
        name_es: "Sopa Minestrone casera (caldo, verduras, alubias y pasta corta)",
        estimated_grams: 350,
        confidence: 0.95,
        kcal: 186,
        protein_g: 9.8,
        carbs_g: 29.4,
        fat_g: 3.5,
        fiber_g: 6.3,
        kcal_per_100g: 53,
        protein_g_per_100g: 2.8,
        carbs_g_per_100g: 8.4,
        fat_g_per_100g: 1.0,
        fiber_g_per_100g: 1.8,
      },
    ],
  },
  {
    id: "carne_en_rollo_ciruela",
    label: "🥩 Carne en Rollo con Salsa de Ciruela",
    category: "Almuerzo/Cena",
    dish_name: "Carne en Rollo Rellena Bañada en Salsa de Ciruela",
    is_colombian_dish: true,
    overall_confidence: 0.94,
    keywords: [
      "carne en rollo",
      "carne en rollo con salsa de ciruela",
      "rollo de carne",
      "rollo de carne en salsa de ciruela",
      "carne en rollo agridulce",
      "rollo de carne con ciruela",
      "carne rollo ciruela",
      "rollo de carne de res"
    ],
    items: [
      {
        name_es: "Carne en rollo rellena (res/cerdo, jamón, verduras y tocineta)",
        estimated_grams: 170,
        confidence: 0.94,
        kcal: 338,
        protein_g: 37.4,
        carbs_g: 3.5,
        fat_g: 19.5,
        fiber_g: 0.8,
        kcal_per_100g: 199,
        protein_g_per_100g: 22.0,
        carbs_g_per_100g: 2.1,
        fat_g_per_100g: 11.5,
        fiber_g_per_100g: 0.5,
      },
      {
        name_es: "Salsa de ciruelas pasas caramelizada",
        estimated_grams: 50,
        confidence: 0.93,
        kcal: 98,
        protein_g: 0.6,
        carbs_g: 23.5,
        fat_g: 0.3,
        fiber_g: 1.5,
        kcal_per_100g: 196,
        protein_g_per_100g: 1.2,
        carbs_g_per_100g: 47.0,
        fat_g_per_100g: 0.6,
        fiber_g_per_100g: 3.0,
      },
    ],
  },
  {
    id: "pocillo_chocolate",
    label: "☕ Pocillo de Chocolate Caliente",
    category: "Desayuno",
    dish_name: "Pocillo de Chocolate Caliente Tradicional",
    is_colombian_dish: true,
    overall_confidence: 0.95,
    keywords: ["chocolate", "pocillo de chocolate", "taza de chocolate", "chocolate caliente", "chocolate en leche", "chocolate con leche", "cacao", "cocoa", "chocolatada", "corona"],
    items: [
      {
        name_es: "Chocolate caliente tradicional en leche",
        estimated_grams: 240,
        confidence: 0.95,
        kcal: 188,
        protein_g: 7.4,
        carbs_g: 22.5,
        fat_g: 7.2,
        fiber_g: 1.8,
        kcal_per_100g: 78,
        protein_g_per_100g: 3.1,
        carbs_g_per_100g: 9.4,
        fat_g_per_100g: 3.0,
        fiber_g_per_100g: 0.8,
      },
    ],
  },
  {
    id: "cafe_con_leche",
    label: "☕ Café con Leche / Perico",
    category: "Desayuno",
    dish_name: "Pocillo de Café con Leche (Perico)",
    is_colombian_dish: true,
    overall_confidence: 0.94,
    keywords: ["cafe con leche", "café con leche", "perico", "pintado", "taza de cafe con leche", "pocillo de cafe con leche", "cafe en leche"],
    items: [
      {
        name_es: "Café con leche / Perico (1 pocillo)",
        estimated_grams: 200,
        confidence: 0.94,
        kcal: 110,
        protein_g: 6.2,
        carbs_g: 9.6,
        fat_g: 5.0,
        fiber_g: 0,
        kcal_per_100g: 55,
        protein_g_per_100g: 3.1,
        carbs_g_per_100g: 4.8,
        fat_g_per_100g: 2.5,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "tinto_cafe_negro",
    label: "☕ Tinto Colombiano (Café Negro)",
    category: "Desayuno",
    dish_name: "Pocillo de Tinto / Café Negro",
    is_colombian_dish: true,
    overall_confidence: 0.96,
    keywords: ["tinto", "cafe", "café", "cafe negro", "café negro", "pocillo de tinto", "taza de cafe", "taza de café", "americano"],
    items: [
      {
        name_es: "Café negro / Tinto tradicional (1 pocillo)",
        estimated_grams: 150,
        confidence: 0.96,
        kcal: 5,
        protein_g: 0.3,
        carbs_g: 0.8,
        fat_g: 0.1,
        fiber_g: 0,
        kcal_per_100g: 3,
        protein_g_per_100g: 0.2,
        carbs_g_per_100g: 0.5,
        fat_g_per_100g: 0.05,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "aguapanela_queso",
    label: "🧀 Aguapanela con Queso",
    category: "Desayuno",
    dish_name: "Agua de Panela Caliente con Queso Campesino",
    is_colombian_dish: true,
    overall_confidence: 0.92,
    keywords: ["aguapanela", "agua de panela", "aguapanela con queso", "agua de panela con queso", "panela"],
    items: [
      {
        name_es: "Agua de panela tradicional (1 pocillo)",
        estimated_grams: 240,
        confidence: 0.93,
        kcal: 125,
        protein_g: 0.2,
        carbs_g: 31.0,
        fat_g: 0.0,
        fiber_g: 0,
        kcal_per_100g: 52,
        protein_g_per_100g: 0.1,
        carbs_g_per_100g: 12.9,
        fat_g_per_100g: 0.0,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Queso campesino fresco",
        estimated_grams: 45,
        confidence: 0.90,
        kcal: 108,
        protein_g: 8.1,
        carbs_g: 1.2,
        fat_g: 8.0,
        fiber_g: 0,
        kcal_per_100g: 240,
        protein_g_per_100g: 18.0,
        carbs_g_per_100g: 2.7,
        fat_g_per_100g: 17.8,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "arroz_con_pollo",
    label: "🍗 Arroz con Pollo Colombiano",
    category: "Almuerzo/Cena",
    dish_name: "Arroz con Pollo Tradicional Colombiano (con verduras y pechuga)",
    is_colombian_dish: true,
    overall_confidence: 0.92,
    keywords: ["arroz con pollo", "arroz pollo", "arroz con pechuga"],
    items: [
      {
        name_es: "Pechuga de pollo desmechada",
        estimated_grams: 140,
        confidence: 0.93,
        kcal: 231,
        protein_g: 43.4,
        carbs_g: 0,
        fat_g: 5.0,
        fiber_g: 0,
        kcal_per_100g: 165,
        protein_g_per_100g: 31,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 3.6,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 160,
        confidence: 0.91,
        kcal: 208,
        protein_g: 4.3,
        carbs_g: 45.1,
        fat_g: 0.5,
        fiber_g: 0.6,
        kcal_per_100g: 130,
        protein_g_per_100g: 2.7,
        carbs_g_per_100g: 28.2,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 0.4,
      },
      {
        name_es: "Verduras salteadas (arveja, zanahoria, pimentón)",
        estimated_grams: 70,
        confidence: 0.88,
        kcal: 35,
        protein_g: 1.8,
        carbs_g: 6.8,
        fat_g: 0.3,
        fiber_g: 2.2,
        kcal_per_100g: 50,
        protein_g_per_100g: 2.5,
        carbs_g_per_100g: 9.7,
        fat_g_per_100g: 0.4,
        fiber_g_per_100g: 3.1,
      },
    ],
  },
  {
    id: "pechuga_arroz_ensalada",
    label: "🥗 Pechuga a la Plancha + Arroz + Aguacate",
    category: "Almuerzo/Cena",
    dish_name: "Pechuga de Pollo a la Plancha con Arroz, Ensalada y Aguacate",
    is_colombian_dish: true,
    overall_confidence: 0.94,
    keywords: ["pechuga", "pollo a la plancha", "pollo con arroz", "pollo arroz", "almuerzo ejecutivo"],
    items: [
      {
        name_es: "Pechuga de pollo a la plancha",
        estimated_grams: 180,
        confidence: 0.95,
        kcal: 297,
        protein_g: 55.8,
        carbs_g: 0,
        fat_g: 6.5,
        fiber_g: 0,
        kcal_per_100g: 165,
        protein_g_per_100g: 31,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 3.6,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 150,
        confidence: 0.92,
        kcal: 195,
        protein_g: 4.1,
        carbs_g: 42.3,
        fat_g: 0.5,
        fiber_g: 0.6,
        kcal_per_100g: 130,
        protein_g_per_100g: 2.7,
        carbs_g_per_100g: 28.2,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 0.4,
      },
      {
        name_es: "Aguacate Hass",
        estimated_grams: 60,
        confidence: 0.9,
        kcal: 96,
        protein_g: 1.2,
        carbs_g: 5.1,
        fat_g: 8.8,
        fiber_g: 4.0,
        kcal_per_100g: 160,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 8.5,
        fat_g_per_100g: 14.7,
        fiber_g_per_100g: 6.7,
      },
      {
        name_es: "Ensalada fresca (tomate, lechuga, cebolla)",
        estimated_grams: 80,
        confidence: 0.88,
        kcal: 20,
        protein_g: 1.0,
        carbs_g: 3.8,
        fat_g: 0.2,
        fiber_g: 1.5,
        kcal_per_100g: 25,
        protein_g_per_100g: 1.2,
        carbs_g_per_100g: 4.7,
        fat_g_per_100g: 0.2,
        fiber_g_per_100g: 1.9,
      },
    ],
  },
  {
    id: "bandeja_paisa",
    label: "🍲 Bandeja Paisa Completa",
    category: "Almuerzo/Cena",
    dish_name: "Bandeja Paisa Antioqueña (Fríjoles, Arroz, Carne, Huevo, Arepa y Aguacate)",
    is_colombian_dish: true,
    overall_confidence: 0.89,
    keywords: ["bandeja paisa", "paisa", "frijoles con carne", "frijoles", "fríjoles"],
    items: [
      {
        name_es: "Fríjoles rojos colombianos cocidos",
        estimated_grams: 180,
        confidence: 0.88,
        kcal: 229,
        protein_g: 15.7,
        carbs_g: 41.0,
        fat_g: 0.9,
        fiber_g: 11.5,
        kcal_per_100g: 127,
        protein_g_per_100g: 8.7,
        carbs_g_per_100g: 22.8,
        fat_g_per_100g: 0.5,
        fiber_g_per_100g: 6.4,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 150,
        confidence: 0.91,
        kcal: 195,
        protein_g: 4.1,
        carbs_g: 42.3,
        fat_g: 0.5,
        fiber_g: 0.6,
        kcal_per_100g: 130,
        protein_g_per_100g: 2.7,
        carbs_g_per_100g: 28.2,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 0.4,
      },
      {
        name_es: "Carne molida magra de res",
        estimated_grams: 130,
        confidence: 0.86,
        kcal: 250,
        protein_g: 37.1,
        carbs_g: 0,
        fat_g: 10.7,
        fiber_g: 0,
        kcal_per_100g: 192,
        protein_g_per_100g: 28.5,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 8.2,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Huevo a la plancha",
        estimated_grams: 60,
        confidence: 0.92,
        kcal: 90,
        protein_g: 7.5,
        carbs_g: 0.4,
        fat_g: 6.5,
        fiber_g: 0,
        kcal_per_100g: 150,
        protein_g_per_100g: 12.5,
        carbs_g_per_100g: 0.7,
        fat_g_per_100g: 10.8,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Arepa de maíz blanco asada",
        estimated_grams: 85,
        confidence: 0.94,
        kcal: 166,
        protein_g: 3.9,
        carbs_g: 34.4,
        fat_g: 1.2,
        fiber_g: 2.4,
        kcal_per_100g: 195,
        protein_g_per_100g: 4.6,
        carbs_g_per_100g: 40.5,
        fat_g_per_100g: 1.4,
        fiber_g_per_100g: 2.8,
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
    ],
  },
  {
    id: "desayuno_pericos_arepa",
    label: "🍳 Huevos Pericos + Arepa + Quesito",
    category: "Desayuno",
    dish_name: "Desayuno Típico Colombiano: Huevos Pericos, Arepa Blanca y Quesito",
    is_colombian_dish: true,
    overall_confidence: 0.95,
    keywords: ["huevos pericos", "pericos", "desayuno colombiano", "huevos con arepa", "arepa con huevo"],
    items: [
      {
        name_es: "Huevos pericos (con tomate y cebolla)",
        estimated_grams: 180,
        confidence: 0.94,
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
        confidence: 0.95,
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
        name_es: "Quesito antioqueño / campesino",
        estimated_grams: 60,
        confidence: 0.91,
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
    ],
  },
  {
    id: "carne_asada_papas",
    label: "🥩 Carne Asada + Papas + Aguacate",
    category: "Almuerzo/Cena",
    dish_name: "Lomo de Res Asado con Papas Cocidas y Aguacate Hass",
    is_colombian_dish: true,
    overall_confidence: 0.91,
    keywords: ["carne asada", "lomo de res", "carne con papa", "carne con papas", "res asada", "churrasco"],
    items: [
      {
        name_es: "Lomo de res asado magro",
        estimated_grams: 180,
        confidence: 0.93,
        kcal: 346,
        protein_g: 51.3,
        carbs_g: 0,
        fat_g: 14.8,
        fiber_g: 0,
        kcal_per_100g: 192,
        protein_g_per_100g: 28.5,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 8.2,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Papas cocidas al vapor",
        estimated_grams: 180,
        confidence: 0.9,
        kcal: 157,
        protein_g: 3.6,
        carbs_g: 36.0,
        fat_g: 0.2,
        fiber_g: 3.2,
        kcal_per_100g: 87,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 20.0,
        fat_g_per_100g: 0.1,
        fiber_g_per_100g: 1.8,
      },
      {
        name_es: "Aguacate Hass",
        estimated_grams: 60,
        confidence: 0.89,
        kcal: 96,
        protein_g: 1.2,
        carbs_g: 5.1,
        fat_g: 8.8,
        fiber_g: 4.0,
        kcal_per_100g: 160,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 8.5,
        fat_g_per_100g: 14.7,
        fiber_g_per_100g: 6.7,
      },
    ],
  },
  {
    id: "pasta_bolonesa",
    label: "🍝 Pasta Boloñesa de Res",
    category: "Almuerzo/Cena",
    dish_name: "Pasta con Carne Molida de Res en Salsa Boloñesa y Queso",
    is_colombian_dish: false,
    overall_confidence: 0.93,
    keywords: ["pasta boloñesa", "pasta bolonesa", "espaguetis", "pasta con carne", "spaghetti", "pasta"],
    items: [
      {
        name_es: "Pasta cocida (espaguetis)",
        estimated_grams: 220,
        confidence: 0.93,
        kcal: 345,
        protein_g: 11.0,
        carbs_g: 68.2,
        fat_g: 2.2,
        fiber_g: 3.3,
        kcal_per_100g: 157,
        protein_g_per_100g: 5.0,
        carbs_g_per_100g: 31.0,
        fat_g_per_100g: 1.0,
        fiber_g_per_100g: 1.5,
      },
      {
        name_es: "Carne molida en salsa boloñesa casera",
        estimated_grams: 160,
        confidence: 0.9,
        kcal: 256,
        protein_g: 32.0,
        carbs_g: 6.4,
        fat_g: 11.2,
        fiber_g: 1.6,
        kcal_per_100g: 160,
        protein_g_per_100g: 20.0,
        carbs_g_per_100g: 4.0,
        fat_g_per_100g: 7.0,
        fiber_g_per_100g: 1.0,
      },
      {
        name_es: "Queso parmesano rallado",
        estimated_grams: 15,
        confidence: 0.88,
        kcal: 65,
        protein_g: 5.4,
        carbs_g: 0.5,
        fat_g: 4.4,
        fiber_g: 0,
        kcal_per_100g: 431,
        protein_g_per_100g: 36.0,
        carbs_g_per_100g: 3.2,
        fat_g_per_100g: 29.0,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "atun_arroz_maiz",
    label: "🐟 Atún con Arroz Blanco y Maíz",
    category: "Almuerzo/Cena",
    dish_name: "Bowl Rápido: Atún en Agua con Arroz Blanco y Maíz Tierno",
    is_colombian_dish: true,
    overall_confidence: 0.94,
    keywords: ["atun", "atún", "arroz con atun", "atun con arroz", "bowl de atun"],
    items: [
      {
        name_es: "Atún en agua escurrido",
        estimated_grams: 140,
        confidence: 0.96,
        kcal: 168,
        protein_g: 39.2,
        carbs_g: 0,
        fat_g: 1.1,
        fiber_g: 0,
        kcal_per_100g: 120,
        protein_g_per_100g: 28.0,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 0.8,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 160,
        confidence: 0.92,
        kcal: 208,
        protein_g: 4.3,
        carbs_g: 45.1,
        fat_g: 0.5,
        fiber_g: 0.6,
        kcal_per_100g: 130,
        protein_g_per_100g: 2.7,
        carbs_g_per_100g: 28.2,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 0.4,
      },
      {
        name_es: "Maíz tierno dulce",
        estimated_grams: 60,
        confidence: 0.89,
        kcal: 52,
        protein_g: 1.8,
        carbs_g: 11.4,
        fat_g: 0.7,
        fiber_g: 1.4,
        kcal_per_100g: 86,
        protein_g_per_100g: 3.0,
        carbs_g_per_100g: 19.0,
        fat_g_per_100g: 1.2,
        fiber_g_per_100g: 2.4,
      },
    ],
  },
  {
    id: "avena_leche_banano",
    label: "🥣 Avena con Leche + Banano",
    category: "Desayuno",
    dish_name: "Tazón de Avena en Hojuelas con Leche Descremada y Banano",
    is_colombian_dish: false,
    overall_confidence: 0.96,
    keywords: ["avena", "oatmeal", "avena con leche", "avena con banano", "tazon de avena", "avena trasnochada"],
    items: [
      {
        name_es: "Avena en hojuelas (peso seco)",
        estimated_grams: 50,
        confidence: 0.95,
        kcal: 194,
        protein_g: 6.8,
        carbs_g: 33.8,
        fat_g: 3.5,
        fiber_g: 5.0,
        kcal_per_100g: 389,
        protein_g_per_100g: 13.5,
        carbs_g_per_100g: 67.5,
        fat_g_per_100g: 6.9,
        fiber_g_per_100g: 10.0,
      },
      {
        name_es: "Leche descremada o deslactosada light",
        estimated_grams: 240,
        confidence: 0.94,
        kcal: 84,
        protein_g: 8.2,
        carbs_g: 12.0,
        fat_g: 0.5,
        fiber_g: 0,
        kcal_per_100g: 35,
        protein_g_per_100g: 3.4,
        carbs_g_per_100g: 5.0,
        fat_g_per_100g: 0.2,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Banano mediano en rodajas",
        estimated_grams: 100,
        confidence: 0.92,
        kcal: 89,
        protein_g: 1.1,
        carbs_g: 22.8,
        fat_g: 0.3,
        fiber_g: 2.6,
        kcal_per_100g: 89,
        protein_g_per_100g: 1.1,
        carbs_g_per_100g: 22.8,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 2.6,
      },
    ],
  },
  {
    id: "batido_proteina_avena",
    label: "🥤 Batido de Proteína Whey + Avena + Banano",
    category: "Snack/Post-Entreno",
    dish_name: "Batido Post-Entreno: Proteína Whey, Avena en Polvo y Banano",
    is_colombian_dish: false,
    overall_confidence: 0.97,
    keywords: ["batido", "proteina", "whey", "shake", "batido proteina", "post entreno", "post-entreno"],
    items: [
      {
        name_es: "Proteína Whey Isolate (1 scoop)",
        estimated_grams: 30,
        confidence: 0.98,
        kcal: 115,
        protein_g: 25.0,
        carbs_g: 1.5,
        fat_g: 1.0,
        fiber_g: 0,
        kcal_per_100g: 383,
        protein_g_per_100g: 83.3,
        carbs_g_per_100g: 5.0,
        fat_g_per_100g: 3.3,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Avena en hojuelas molida",
        estimated_grams: 40,
        confidence: 0.95,
        kcal: 156,
        protein_g: 5.4,
        carbs_g: 27.0,
        fat_g: 2.8,
        fiber_g: 4.0,
        kcal_per_100g: 389,
        protein_g_per_100g: 13.5,
        carbs_g_per_100g: 67.5,
        fat_g_per_100g: 6.9,
        fiber_g_per_100g: 10.0,
      },
      {
        name_es: "Banano mediano",
        estimated_grams: 90,
        confidence: 0.93,
        kcal: 80,
        protein_g: 1.0,
        carbs_g: 20.5,
        fat_g: 0.3,
        fiber_g: 2.3,
        kcal_per_100g: 89,
        protein_g_per_100g: 1.1,
        carbs_g_per_100g: 22.8,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 2.6,
      },
      {
        name_es: "Leche deslactosada light",
        estimated_grams: 250,
        confidence: 0.94,
        kcal: 88,
        protein_g: 8.5,
        carbs_g: 12.5,
        fat_g: 0.5,
        fiber_g: 0,
        kcal_per_100g: 35,
        protein_g_per_100g: 3.4,
        carbs_g_per_100g: 5.0,
        fat_g_per_100g: 0.2,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "calentado_paisa",
    label: "🍳 Calentado Paisa con Huevos",
    category: "Desayuno",
    dish_name: "Calentado Paisa (Fríjol y Arroz) con 2 Huevos a la Plancha y Arepa",
    is_colombian_dish: true,
    overall_confidence: 0.92,
    keywords: ["calentado", "calentao", "arroz con frijol", "calentado con huevo"],
    items: [
      {
        name_es: "Mezcla de fríjol y arroz calentado",
        estimated_grams: 240,
        confidence: 0.9,
        kcal: 312,
        protein_g: 13.6,
        carbs_g: 55.7,
        fat_g: 1.7,
        fiber_g: 8.2,
        kcal_per_100g: 130,
        protein_g_per_100g: 5.7,
        carbs_g_per_100g: 23.2,
        fat_g_per_100g: 0.7,
        fiber_g_per_100g: 3.4,
      },
      {
        name_es: "2 Huevos a la plancha",
        estimated_grams: 110,
        confidence: 0.93,
        kcal: 165,
        protein_g: 13.8,
        carbs_g: 0.8,
        fat_g: 11.9,
        fiber_g: 0,
        kcal_per_100g: 150,
        protein_g_per_100g: 12.5,
        carbs_g_per_100g: 0.7,
        fat_g_per_100g: 10.8,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Arepa de maíz blanco asada",
        estimated_grams: 80,
        confidence: 0.94,
        kcal: 156,
        protein_g: 3.7,
        carbs_g: 32.4,
        fat_g: 1.1,
        fiber_g: 2.2,
        kcal_per_100g: 195,
        protein_g_per_100g: 4.6,
        carbs_g_per_100g: 40.5,
        fat_g_per_100g: 1.4,
        fiber_g_per_100g: 2.8,
      },
    ],
  },
  {
    id: "ajiaco_santafereno",
    label: "🥣 Ajiaco Santafereño con Pollo",
    category: "Almuerzo/Cena",
    dish_name: "Ajiaco Santafereño con Pollo Desmechado, Papas, Mazorca y Aguacate",
    is_colombian_dish: true,
    overall_confidence: 0.89,
    keywords: ["ajiaco", "ajiaco bogotano", "ajiaco santafereno", "sopa de ajiaco"],
    items: [
      {
        name_es: "Ajiaco tradicional con pollo y papa criolla",
        estimated_grams: 420,
        confidence: 0.9,
        kcal: 512,
        protein_g: 31.9,
        carbs_g: 58.0,
        fat_g: 17.2,
        fiber_g: 8.8,
        kcal_per_100g: 122,
        protein_g_per_100g: 7.6,
        carbs_g_per_100g: 13.8,
        fat_g_per_100g: 4.1,
        fiber_g_per_100g: 2.1,
      },
      {
        name_es: "Aguacate Hass",
        estimated_grams: 60,
        confidence: 0.91,
        kcal: 96,
        protein_g: 1.2,
        carbs_g: 5.1,
        fat_g: 8.8,
        fiber_g: 4.0,
        kcal_per_100g: 160,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 8.5,
        fat_g_per_100g: 14.7,
        fiber_g_per_100g: 6.7,
      },
    ],
  },
  {
    id: "sancocho_pollo",
    label: "🍲 Sancocho de Pollo / Gallina",
    category: "Almuerzo/Cena",
    dish_name: "Sancocho Colombiano con Pollo, Plátano, Yuca y Mazorca",
    is_colombian_dish: true,
    overall_confidence: 0.89,
    keywords: ["sancocho", "sancocho de pollo", "sancocho de gallina", "sopa de sancocho"],
    items: [
      {
        name_es: "Sancocho con pollo, plátano verde y yuca",
        estimated_grams: 450,
        confidence: 0.9,
        kcal: 518,
        protein_g: 36.9,
        carbs_g: 56.3,
        fat_g: 16.2,
        fiber_g: 8.1,
        kcal_per_100g: 115,
        protein_g_per_100g: 8.2,
        carbs_g_per_100g: 12.5,
        fat_g_per_100g: 3.6,
        fiber_g_per_100g: 1.8,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 120,
        confidence: 0.92,
        kcal: 156,
        protein_g: 3.2,
        carbs_g: 33.8,
        fat_g: 0.4,
        fiber_g: 0.5,
        kcal_per_100g: 130,
        protein_g_per_100g: 2.7,
        carbs_g_per_100g: 28.2,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 0.4,
      },
    ],
  },
  {
    id: "yogurt_griego_granola",
    label: "🥣 Yogurt Griego + Granola + Frutas",
    category: "Snack/Post-Entreno",
    dish_name: "Bowl de Yogurt Griego Natural con Granola y Fresas",
    is_colombian_dish: false,
    overall_confidence: 0.95,
    keywords: ["yogurt", "yogurt griego", "granola", "bowl de frutas", "parfait"],
    items: [
      {
        name_es: "Yogurt griego natural sin azúcar",
        estimated_grams: 180,
        confidence: 0.96,
        kcal: 110,
        protein_g: 18.0,
        carbs_g: 6.5,
        fat_g: 1.2,
        fiber_g: 0,
        kcal_per_100g: 61,
        protein_g_per_100g: 10.0,
        carbs_g_per_100g: 3.6,
        fat_g_per_100g: 0.7,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Granola artesanal",
        estimated_grams: 40,
        confidence: 0.92,
        kcal: 175,
        protein_g: 4.0,
        carbs_g: 26.0,
        fat_g: 6.5,
        fiber_g: 3.0,
        kcal_per_100g: 438,
        protein_g_per_100g: 10.0,
        carbs_g_per_100g: 65.0,
        fat_g_per_100g: 16.2,
        fiber_g_per_100g: 7.5,
      },
      {
        name_es: "Fresas frescas picadas",
        estimated_grams: 80,
        confidence: 0.91,
        kcal: 26,
        protein_g: 0.5,
        carbs_g: 6.1,
        fat_g: 0.2,
        fiber_g: 1.6,
        kcal_per_100g: 32,
        protein_g_per_100g: 0.7,
        carbs_g_per_100g: 7.7,
        fat_g_per_100g: 0.3,
        fiber_g_per_100g: 2.0,
      },
    ],
  },
  {
    id: "sandwich_pollo_queso",
    label: "🥪 Sándwich de Pollo y Queso",
    category: "Desayuno",
    dish_name: "Sándwich de Pan Integral con Pechuga Desmechada y Queso Campesino",
    is_colombian_dish: false,
    overall_confidence: 0.94,
    keywords: ["sandwich", "sanduche", "emparedado", "sandwich de pollo"],
    items: [
      {
        name_es: "Pan tajado integral (2 rebanadas)",
        estimated_grams: 60,
        confidence: 0.95,
        kcal: 150,
        protein_g: 6.0,
        carbs_g: 27.0,
        fat_g: 2.0,
        fiber_g: 3.6,
        kcal_per_100g: 250,
        protein_g_per_100g: 10.0,
        carbs_g_per_100g: 45.0,
        fat_g_per_100g: 3.3,
        fiber_g_per_100g: 6.0,
      },
      {
        name_es: "Pechuga de pollo desmechada",
        estimated_grams: 100,
        confidence: 0.94,
        kcal: 165,
        protein_g: 31.0,
        carbs_g: 0,
        fat_g: 3.6,
        fiber_g: 0,
        kcal_per_100g: 165,
        protein_g_per_100g: 31.0,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 3.6,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Queso campesino o mozzarella",
        estimated_grams: 40,
        confidence: 0.92,
        kcal: 92,
        protein_g: 7.0,
        carbs_g: 1.0,
        fat_g: 6.7,
        fiber_g: 0,
        kcal_per_100g: 230,
        protein_g_per_100g: 17.5,
        carbs_g_per_100g: 2.4,
        fat_g_per_100g: 16.8,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "lentejas_arroz_carne",
    label: "🍲 Lentejas con Arroz + Carne Molida",
    category: "Almuerzo/Cena",
    dish_name: "Plato Casero: Lentejas Guisadas con Arroz Blanco y Carne Molida",
    is_colombian_dish: true,
    overall_confidence: 0.93,
    keywords: ["lentejas", "arroz con lentejas", "lentejas con carne"],
    items: [
      {
        name_es: "Lentejas guisadas cocidas",
        estimated_grams: 200,
        confidence: 0.92,
        kcal: 232,
        protein_g: 17.8,
        carbs_g: 39.8,
        fat_g: 1.2,
        fiber_g: 15.6,
        kcal_per_100g: 116,
        protein_g_per_100g: 8.9,
        carbs_g_per_100g: 19.9,
        fat_g_per_100g: 0.6,
        fiber_g_per_100g: 7.8,
      },
      {
        name_es: "Arroz blanco cocido",
        estimated_grams: 140,
        confidence: 0.93,
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
        name_es: "Carne molida magra de res",
        estimated_grams: 100,
        confidence: 0.9,
        kcal: 192,
        protein_g: 28.5,
        carbs_g: 0,
        fat_g: 8.2,
        fiber_g: 0,
        kcal_per_100g: 192,
        protein_g_per_100g: 28.5,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 8.2,
        fiber_g_per_100g: 0,
      },
    ],
  },
  {
    id: "pescado_patacon_ensalada",
    label: "🐟 Pescado / Mojarra + Patacón + Ensalada",
    category: "Almuerzo/Cena",
    dish_name: "Tilapia o Mojarra a la Plancha con Patacón y Ensalada Costeña",
    is_colombian_dish: true,
    overall_confidence: 0.91,
    keywords: ["pescado", "mojarra", "tilapia", "patacon", "patacón", "filete de pescado"],
    items: [
      {
        name_es: "Filete de tilapia o mojarra a la plancha",
        estimated_grams: 200,
        confidence: 0.92,
        kcal: 256,
        protein_g: 52.4,
        carbs_g: 0,
        fat_g: 5.4,
        fiber_g: 0,
        kcal_per_100g: 128,
        protein_g_per_100g: 26.2,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 2.7,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Patacón de plátano verde (1 unidad)",
        estimated_grams: 80,
        confidence: 0.9,
        kcal: 168,
        protein_g: 1.6,
        carbs_g: 32.0,
        fat_g: 4.2,
        fiber_g: 2.4,
        kcal_per_100g: 210,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 40.0,
        fat_g_per_100g: 5.3,
        fiber_g_per_100g: 3.0,
      },
      {
        name_es: "Ensalada fresca de repollo y tomate",
        estimated_grams: 90,
        confidence: 0.88,
        kcal: 23,
        protein_g: 1.1,
        carbs_g: 4.2,
        fat_g: 0.2,
        fiber_g: 1.8,
        kcal_per_100g: 25,
        protein_g_per_100g: 1.2,
        carbs_g_per_100g: 4.7,
        fat_g_per_100g: 0.2,
        fiber_g_per_100g: 2.0,
      },
    ],
  },
  {
    id: "salmon_vegetales_pure",
    label: "🐟 Salmón a la Plancha + Puré + Vegetales",
    category: "Almuerzo/Cena",
    dish_name: "Filete de Salmón con Puré de Papa y Vegetales Salteados",
    is_colombian_dish: false,
    overall_confidence: 0.94,
    keywords: ["salmon", "salmón", "salmon con verduras", "salmon con pure"],
    items: [
      {
        name_es: "Filete de salmón fresco a la plancha",
        estimated_grams: 170,
        confidence: 0.95,
        kcal: 354,
        protein_g: 34.0,
        carbs_g: 0,
        fat_g: 22.6,
        fiber_g: 0,
        kcal_per_100g: 208,
        protein_g_per_100g: 20.0,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 13.3,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Puré de papa casero",
        estimated_grams: 160,
        confidence: 0.91,
        kcal: 144,
        protein_g: 3.2,
        carbs_g: 27.2,
        fat_g: 2.4,
        fiber_g: 2.4,
        kcal_per_100g: 90,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 17.0,
        fat_g_per_100g: 1.5,
        fiber_g_per_100g: 1.5,
      },
      {
        name_es: "Brócoli y vegetales al vapor",
        estimated_grams: 100,
        confidence: 0.9,
        kcal: 35,
        protein_g: 2.8,
        carbs_g: 6.6,
        fat_g: 0.4,
        fiber_g: 2.6,
        kcal_per_100g: 35,
        protein_g_per_100g: 2.8,
        carbs_g_per_100g: 6.6,
        fat_g_per_100g: 0.4,
        fiber_g_per_100g: 2.6,
      },
    ],
  },
  {
    id: "hamburguesa_casera_papas",
    label: "🍔 Hamburguesa Casera de Res + Papas",
    category: "Comida Rápida/Fit",
    dish_name: "Hamburguesa Casera 100% Res con Queso y Papas al Horno",
    is_colombian_dish: false,
    overall_confidence: 0.92,
    keywords: ["hamburguesa", "burger", "hamburguesa con papas", "hamburguesa de res"],
    items: [
      {
        name_es: "Carne de res magra a la plancha",
        estimated_grams: 160,
        confidence: 0.94,
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
        name_es: "Pan de hamburguesa",
        estimated_grams: 70,
        confidence: 0.93,
        kcal: 196,
        protein_g: 5.9,
        carbs_g: 35.3,
        fat_g: 3.4,
        fiber_g: 1.5,
        kcal_per_100g: 280,
        protein_g_per_100g: 8.4,
        carbs_g_per_100g: 50.4,
        fat_g_per_100g: 4.9,
        fiber_g_per_100g: 2.1,
      },
      {
        name_es: "Queso mozzarella en tajada",
        estimated_grams: 30,
        confidence: 0.91,
        kcal: 87,
        protein_g: 6.6,
        carbs_g: 0.9,
        fat_g: 6.3,
        fiber_g: 0,
        kcal_per_100g: 290,
        protein_g_per_100g: 22.0,
        carbs_g_per_100g: 3.0,
        fat_g_per_100g: 21.0,
        fiber_g_per_100g: 0,
      },
      {
        name_es: "Papas rústicas al horno / freidora",
        estimated_grams: 140,
        confidence: 0.88,
        kcal: 130,
        protein_g: 2.8,
        carbs_g: 29.0,
        fat_g: 0.5,
        fiber_g: 2.8,
        kcal_per_100g: 93,
        protein_g_per_100g: 2.0,
        carbs_g_per_100g: 20.7,
        fat_g_per_100g: 0.4,
        fiber_g_per_100g: 2.0,
      },
    ],
  },
  {
    id: "empanadas_colombianas",
    label: "🥟 Empanadas Colombianas (2 unidades)",
    category: "Comida Rápida/Fit",
    dish_name: "2 Empanadas Tradicionales Colombianas de Carne y Papa",
    is_colombian_dish: true,
    overall_confidence: 0.91,
    keywords: ["empanada", "empanadas", "empanadas de carne", "empanada colombiana"],
    items: [
      {
        name_es: "Empanadas de carne y papa (2 unidades)",
        estimated_grams: 150,
        confidence: 0.92,
        kcal: 360,
        protein_g: 13.5,
        carbs_g: 40.5,
        fat_g: 16.5,
        fiber_g: 3.0,
        kcal_per_100g: 240,
        protein_g_per_100g: 9.0,
        carbs_g_per_100g: 27.0,
        fat_g_per_100g: 11.0,
        fiber_g_per_100g: 2.0,
      },
    ],
  },
];

/**
 * Normaliza cadenas para comparación fonética e insensible a acentos.
 */
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Perfilador culinario inteligente: infiere gramaje realista, calorías y macronutrientes
 * de acuerdo a palabras clave gastronómicas cuando un plato nuevo no se encuentra en presets.
 */
export function estimateSemanticDishProfile(dishQuery: string): {
  items: AiDetectedIngredient[];
  totalKcal: number;
  totalP: number;
  totalC: number;
  totalF: number;
  totalFib: number;
  disclaimer: string;
} {
  const q = cleanText(dishQuery);
  const title = dishQuery.trim().charAt(0).toUpperCase() + dishQuery.trim().slice(1);

  // 1. Sopas, caldos, cremas y cazuelas
  if (/sopa|caldo|crema|consome|consomé|minestrone|minestrong|ramen|cazuela|potaje|mote/.test(q)) {
    const isCrema = /crema|auyama|espinaca|champiñon|champinon|maiz|leche/.test(q);
    const grams = isCrema ? 300 : 350;
    const kcal = isCrema ? 185 : 175;
    const p = isCrema ? 5.5 : 9.5;
    const c = isCrema ? 22.0 : 26.5;
    const f = isCrema ? 8.5 : 3.8;
    const fib = isCrema ? 3.0 : 5.2;

    return createSingleProfile(title, grams, kcal, p, c, f, fib, `Sopa/caldo estimada en tazón estándar (${grams}g). Puedes ajustar los gramos.`);
  }

  // 2. Carnes en rollo, rellenas o con salsas dulces / agridulces
  if (/rollo|relleno|rellena|ciruela|agridulce|bbq|miel|teriyaki|naranja/.test(q)) {
    const meatGrams = 160;
    const sauceGrams = 60;
    const meatKcal = 310;
    const meatP = 34.0;
    const meatC = 3.0;
    const meatF = 18.0;
    const meatFib = 0.8;

    const sauceKcal = 125;
    const sauceP = 1.2;
    const sauceC = 28.5;
    const sauceF = 0.8;
    const sauceFib = 1.2;

    const items: AiDetectedIngredient[] = [
      {
        name_es: `${title} (Carne preparada)`,
        estimated_grams: meatGrams,
        confidence: 0.89,
        kcal: meatKcal,
        protein_g: meatP,
        carbs_g: meatC,
        fat_g: meatF,
        fiber_g: meatFib,
        kcal_per_100g: Math.round((meatKcal / meatGrams) * 100),
        protein_g_per_100g: Number(((meatP / meatGrams) * 100).toFixed(1)),
        carbs_g_per_100g: Number(((meatC / meatGrams) * 100).toFixed(1)),
        fat_g_per_100g: Number(((meatF / meatGrams) * 100).toFixed(1)),
        fiber_g_per_100g: 0.5,
      },
      {
        name_es: `Salsa agridulce / aderezo de ${title}`,
        estimated_grams: sauceGrams,
        confidence: 0.87,
        kcal: sauceKcal,
        protein_g: sauceP,
        carbs_g: sauceC,
        fat_g: sauceF,
        fiber_g: sauceFib,
        kcal_per_100g: Math.round((sauceKcal / sauceGrams) * 100),
        protein_g_per_100g: Number(((sauceP / sauceGrams) * 100).toFixed(1)),
        carbs_g_per_100g: Number(((sauceC / sauceGrams) * 100).toFixed(1)),
        fat_g_per_100g: Number(((sauceF / sauceGrams) * 100).toFixed(1)),
        fiber_g_per_100g: 1.0,
      },
    ];

    const totalKcal = meatKcal + sauceKcal;
    const totalP = Number((meatP + sauceP).toFixed(1));
    const totalC = Number((meatC + sauceC).toFixed(1));
    const totalF = Number((meatF + sauceF).toFixed(1));
    const totalFib = Number((meatFib + sauceFib).toFixed(1));

    return {
      items,
      totalKcal,
      totalP,
      totalC,
      totalF,
      totalFib,
      disclaimer: `Plato desglosado en porción de carne (${meatGrams}g) y salsa (${sauceGrams}g).`,
    };
  }

  // 3. Chicharrón, tocino y fritos grasos
  if (/chicharron|chicharrón|tocino|bacon/.test(q)) {
    return createSingleProfile(title, 100, 520, 35.0, 0.0, 42.0, 0.0, "Porción de chicharrón/tocino crocante.");
  }

  // 4. Cerdo / Costilla / Chuleta
  if (/cerdo|costilla|chuleta|bondiola|lomo de cerdo|pernil/.test(q)) {
    return createSingleProfile(title, 180, 390, 35.0, 2.0, 27.0, 0.0, "Porción de carne de cerdo asada/cocida.");
  }

  // 5. Carnes rojas asadas / magras / bistec
  if (/carne|res|lomo|bife|solomito|churrasco|bistec|punta de anca|sobrebarriga/.test(q)) {
    return createSingleProfile(title, 180, 320, 42.0, 0.5, 16.5, 0.0, "Corte de carne de res magro asado.");
  }

  // 6. Pollo / Pavo / Aves
  if (/pollo|pechuga|muslo|alitas|alita|pavo/.test(q)) {
    const isFrito = /frito|apanado|broaster|alitas/.test(q);
    const isPechuga = /pechuga|plancha|magro/.test(q);
    const grams = isFrito ? 200 : isPechuga ? 160 : 180;
    const kcal = isFrito ? 480 : isPechuga ? 250 : 310;
    const p = isFrito ? 32.0 : isPechuga ? 46.0 : 38.0;
    const c = isFrito ? 16.0 : 0.0;
    const f = isFrito ? 32.0 : isPechuga ? 6.0 : 16.0;
    const fib = isFrito ? 0.8 : 0.0;
    return createSingleProfile(title, grams, kcal, p, c, f, fib, "Porción de ave preparada.");
  }

  // 7. Pescados y mariscos
  if (/pescado|salmon|salmón|tilapia|trucha|atun|atún|camaron|camarones|mariscos|mojarra|robalo/.test(q)) {
    const isSalmon = /salmon|salmón/.test(q);
    const grams = 180;
    const kcal = isSalmon ? 360 : 210;
    const p = isSalmon ? 36.0 : 38.0;
    const c = 0.0;
    const f = isSalmon ? 23.0 : 6.0;
    return createSingleProfile(title, grams, kcal, p, c, f, 0.0, "Filete o porción de pescado/mariscos.");
  }

  // 8. Pastas y lasagnas
  if (/pasta|espagueti|tallarines|lasagna|lasaña|ravioli|macarrones|fideos|canelones/.test(q)) {
    return createSingleProfile(title, 300, 480, 24.0, 64.0, 14.5, 3.5, "Plato de pasta con salsa y proteína.");
  }

  // 9. Arroces preparados
  if (/arroz con|paella|risotto|chaufa|arroz mixto|arroz frito/.test(q)) {
    return createSingleProfile(title, 280, 440, 22.0, 60.0, 12.0, 2.5, "Tazón de arroz compuesto con acompañamientos.");
  }

  // 10. Ensaladas y vegetales
  if (/ensalada|salad|verduras|vegetales|lechuga|cesar/.test(q)) {
    const hasProtein = /pollo|atun|atún|huevo|cesar|aderezo/.test(q);
    const grams = hasProtein ? 240 : 160;
    const kcal = hasProtein ? 260 : 95;
    const p = hasProtein ? 18.0 : 2.8;
    const c = hasProtein ? 14.0 : 11.0;
    const f = hasProtein ? 15.0 : 4.8;
    const fib = hasProtein ? 3.8 : 3.6;
    return createSingleProfile(title, grams, kcal, p, c, f, fib, "Ensalada fresca servida.");
  }

  // 11. Comida rápida y fritos
  if (/hamburguesa|burger|pizza|perro|hot dog|sandwich|sanduche|burrito|tacos|empanada/.test(q)) {
    return createSingleProfile(title, 260, 580, 28.0, 52.0, 30.0, 3.2, "Comida rápida / preparación completa.");
  }

  // 12. Huevos y desayunos
  if (/huevo|huevos|omelette|pericos|revueltos|desayuno|pancakes|waffle/.test(q)) {
    return createSingleProfile(title, 170, 280, 18.0, 15.0, 16.0, 1.5, "Preparación matutina tradicional.");
  }

  // 13. Bebidas e infusiones
  if (/chocolate|cacao|cocoa|cafe|café|tinto|pocillo|taza|vaso|jugo|batido|leche|te|té|aromatica|aromática|infusion|infusión|panela/.test(q)) {
    const isTinto = /tinto|cafe negro|café negro/.test(q);
    const isChoc = /chocolate|cacao|cocoa/.test(q);
    const grams = isTinto ? 150 : 240;
    const kcal = isTinto ? 5 : isChoc ? 188 : 120;
    const p = isTinto ? 0.2 : isChoc ? 7.4 : 3.0;
    const c = isTinto ? 0.8 : isChoc ? 22.5 : 20.0;
    const f = isTinto ? 0.0 : isChoc ? 7.2 : 3.0;
    const fib = isChoc ? 1.5 : 0.0;
    return createSingleProfile(title, grams, kcal, p, c, f, fib, "Bebida estimada por taza estándar.");
  }

  // 14. Fallback gastronómico general equilibrado
  return createSingleProfile(title, 200, 320, 22.0, 30.0, 12.0, 2.0, "Plato estimado con porción estándar equilibrada.");
}

function createSingleProfile(
  name: string,
  grams: number,
  kcal: number,
  p: number,
  c: number,
  f: number,
  fib: number,
  disclaimer: string
) {
  return {
    items: [
      {
        name_es: name,
        estimated_grams: grams,
        confidence: 0.86,
        kcal,
        protein_g: p,
        carbs_g: c,
        fat_g: f,
        fiber_g: fib,
        kcal_per_100g: Math.round((kcal / grams) * 100),
        protein_g_per_100g: Number(((p / grams) * 100).toFixed(1)),
        carbs_g_per_100g: Number(((c / grams) * 100).toFixed(1)),
        fat_g_per_100g: Number(((f / grams) * 100).toFixed(1)),
        fiber_g_per_100g: Number(((fib / grams) * 100).toFixed(1)),
      },
    ],
    totalKcal: kcal,
    totalP: p,
    totalC: c,
    totalF: f,
    totalFib: fib,
    disclaimer,
  };
}

/**
 * Resuelve un plato o receta completa a partir del texto ingresado por el usuario
 * o una coincidencia aproximada con el catálogo local de alimentos.
 */
export function resolveDishRecipe(
  dishQuery: string,
  localCatalog: FoodCatalogItem[] = [],
  refObj: "PLATE_26CM" | "HAND" | "CUTLERY" | "NONE" = "PLATE_26CM"
): AiPlateAnalysisResult {
  const queryClean = cleanText(dishQuery);

  // 1. Buscar coincidencia exacta o por palabras clave en los 25+ platos típicos
  if (queryClean.length >= 2) {
    for (const preset of COMPREHENSIVE_DISH_PRESETS) {
      const matchKeyword = preset.keywords.some((k) => queryClean.includes(cleanText(k)));
      const matchName = cleanText(preset.dish_name).includes(queryClean) || cleanText(preset.label).includes(queryClean);
      if (matchKeyword || matchName) {
        const totalKcal = preset.items.reduce((a, b) => a + b.kcal, 0);
        const totalP = Number(preset.items.reduce((a, b) => a + b.protein_g, 0).toFixed(1));
        const totalC = Number(preset.items.reduce((a, b) => a + b.carbs_g, 0).toFixed(1));
        const totalF = Number(preset.items.reduce((a, b) => a + b.fat_g, 0).toFixed(1));
        const totalFib = Number(preset.items.reduce((a, b) => a + b.fiber_g, 0).toFixed(1));

        return {
          prediction_id: `receta-${preset.id}-${Date.now()}`,
          model_version: "motor-recetas-v2",
          dish_name: preset.dish_name,
          reference_object: refObj,
          overall_confidence: preset.overall_confidence,
          is_colombian_dish: preset.is_colombian_dish,
          flagged_for_review: false,
          items: preset.items,
          total_kcal: totalKcal,
          total_protein_g: totalP,
          total_carbs_g: totalC,
          total_fat_g: totalF,
          total_fiber_g: totalFib,
          disclaimer: "Receta típica desglosada en sus porciones comunes estándar. Puedes ajustar los gramos.",
          error_message: null,
        };
      }
    }
  }

  // 2. Si el usuario escribió ingredientes separados (ej: "arroz, huevo, pechuga" o "pechuga con arroz")
  if (localCatalog.length > 0 && queryClean.length >= 3) {
    // Dividir por comas, signos '+' o conectores 'con' / 'y'
    const parts = queryClean
      .split(/[,+]|\bcon\b|\by\b/gi)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    const detectedItems: AiDetectedIngredient[] = [];

    for (const part of parts) {
      const pClean = cleanText(part);
      const matchFood = localCatalog.find((f) => cleanText(f.name_es).includes(pClean) || pClean.includes(cleanText(f.name_es.slice(0, 10))));

      if (matchFood) {
        // Porción común por defecto: serving_weight_g del catálogo o 120g
        const grams = matchFood.serving_weight_g > 0 ? matchFood.serving_weight_g : 120;
        const ratio = grams / 100;
        detectedItems.push({
          name_es: matchFood.name_es,
          estimated_grams: Math.round(grams),
          confidence: 0.9,
          kcal: Math.round(matchFood.kcal_per_100g * ratio),
          protein_g: Number((matchFood.protein_g_per_100g * ratio).toFixed(1)),
          carbs_g: Number((matchFood.carbs_g_per_100g * ratio).toFixed(1)),
          fat_g: Number((matchFood.fat_g_per_100g * ratio).toFixed(1)),
          fiber_g: Number((matchFood.fiber_g_per_100g * ratio).toFixed(1)),
          kcal_per_100g: matchFood.kcal_per_100g,
          protein_g_per_100g: matchFood.protein_g_per_100g,
          carbs_g_per_100g: matchFood.carbs_g_per_100g,
          fat_g_per_100g: matchFood.fat_g_per_100g,
          fiber_g_per_100g: matchFood.fiber_g_per_100g,
        });
      }
    }

    if (detectedItems.length > 0) {
      const totalKcal = detectedItems.reduce((a, b) => a + b.kcal, 0);
      const totalP = Number(detectedItems.reduce((a, b) => a + b.protein_g, 0).toFixed(1));
      const totalC = Number(detectedItems.reduce((a, b) => a + b.carbs_g, 0).toFixed(1));
      const totalF = Number(detectedItems.reduce((a, b) => a + b.fat_g, 0).toFixed(1));
      const totalFib = Number(detectedItems.reduce((a, b) => a + b.fiber_g, 0).toFixed(1));

      return {
        prediction_id: `combinacion-${Date.now()}`,
        model_version: "motor-catalogo-combinado",
        dish_name: dishQuery.charAt(0).toUpperCase() + dishQuery.slice(1),
        reference_object: refObj,
        overall_confidence: 0.88,
        is_colombian_dish: true,
        flagged_for_review: false,
        items: detectedItems,
        total_kcal: totalKcal,
        total_protein_g: totalP,
        total_carbs_g: totalC,
        total_fat_g: totalF,
        total_fiber_g: totalFib,
        disclaimer: "Plato desglosado automáticamente según los alimentos detectados en tu catálogo.",
        error_message: null,
      };
    }
  }

  // 3. Fallback inteligente semántico: si no se encontró coincidencia exacta pero el usuario escribió algo
  if (queryClean.length > 0) {
    const defaultName = dishQuery.trim();
    const titleCaseName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    const profile = estimateSemanticDishProfile(defaultName);

    return {
      prediction_id: `custom-dish-${Date.now()}`,
      model_version: "perfilador-semantico-gastronomico",
      dish_name: titleCaseName,
      reference_object: refObj,
      overall_confidence: 0.86,
      is_colombian_dish: true,
      flagged_for_review: false,
      items: profile.items,
      total_kcal: profile.totalKcal,
      total_protein_g: profile.totalP,
      total_carbs_g: profile.totalC,
      total_fat_g: profile.totalF,
      total_fiber_g: profile.totalFib,
      disclaimer: profile.disclaimer,
      error_message: null,
    };
  }

  // 4. Si no se pasó nada
  return {
    prediction_id: `pred-empty-${Date.now()}`,
    model_version: "sin-datos",
    dish_name: "Plato no especificado",
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
    disclaimer: "Escribe el nombre de tu plato o selecciona uno de los sugeridos.",
    error_message: "Por favor escribe el nombre de la comida o selecciona un plato sugerido.",
  };
}
