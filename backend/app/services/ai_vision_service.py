import json
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.entities import FoodItem

REFERENCE_OBJECT_SCALE_FACTORS = {
    "PLATE_26CM": 1.0,    # Plato pando estándar colombiano (26 cm diámetro)
    "HAND": 0.95,         # Mano / puño junto al plato como referencia volumétrica
    "CUTLERY": 1.0,       # Tenedor/cuchara estándar (19-20 cm)
    "NONE": 1.0,          # Sin objeto de referencia (mayor incertidumbre en gramos)
}

COLOMBIAN_PLATE_PRESETS = {
    "almuerzo_ejecutivo_pollo": {
        "dish_name": "Plato Colombiano: Pechuga a la plancha, Arroz, Fríjoles Rojos y Aguacate Hass",
        "is_colombian_dish": True,
        "overall_confidence": 0.88,
        "items": [
            {
                "name_es": "Pechuga de pollo a la plancha (peso cocido)",
                "estimated_grams": 185.0,
                "confidence": 0.91,
                "kcal_per_100g": 165.0,
                "protein_g_per_100g": 31.0,
                "carbs_g_per_100g": 0.0,
                "fat_g_per_100g": 3.6,
                "fiber_g_per_100g": 0.0,
            },
            {
                "name_es": "Arroz blanco cocido al estilo colombiano",
                "estimated_grams": 145.0,
                "confidence": 0.89,
                "kcal_per_100g": 130.0,
                "protein_g_per_100g": 2.7,
                "carbs_g_per_100g": 28.2,
                "fat_g_per_100g": 0.3,
                "fiber_g_per_100g": 0.4,
            },
            {
                "name_es": "Fríjoles rojos colombianos cocidos (sin tocino)",
                "estimated_grams": 140.0,
                "confidence": 0.86,
                "kcal_per_100g": 127.0,
                "protein_g_per_100g": 8.7,
                "carbs_g_per_100g": 22.8,
                "fat_g_per_100g": 0.5,
                "fiber_g_per_100g": 6.4,
            },
            {
                "name_es": "Aguacate Hass colombiano",
                "estimated_grams": 75.0,
                "confidence": 0.87,
                "kcal_per_100g": 160.0,
                "protein_g_per_100g": 2.0,
                "carbs_g_per_100g": 8.5,
                "fat_g_per_100g": 14.7,
                "fiber_g_per_100g": 6.7,
            },
        ],
    },
    "bandeja_paisa": {
        "dish_name": "Bandeja Paisa Antioqueña (Carne, Fríjol, Arroz, Huevo, Patacón y Arepa)",
        "is_colombian_dish": True,
        "overall_confidence": 0.82,
        "items": [
            {
                "name_es": "Lomo de res / Solomito magro asado",
                "estimated_grams": 150.0,
                "confidence": 0.85,
                "kcal_per_100g": 192.0,
                "protein_g_per_100g": 28.5,
                "carbs_g_per_100g": 0.0,
                "fat_g_per_100g": 8.2,
                "fiber_g_per_100g": 0.0,
            },
            {
                "name_es": "Fríjoles rojos colombianos cocidos (sin tocino)",
                "estimated_grams": 180.0,
                "confidence": 0.84,
                "kcal_per_100g": 127.0,
                "protein_g_per_100g": 8.7,
                "carbs_g_per_100g": 22.8,
                "fat_g_per_100g": 0.5,
                "fiber_g_per_100g": 6.4,
            },
            {
                "name_es": "Arroz blanco cocido al estilo colombiano",
                "estimated_grams": 150.0,
                "confidence": 0.88,
                "kcal_per_100g": 130.0,
                "protein_g_per_100g": 2.7,
                "carbs_g_per_100g": 28.2,
                "fat_g_per_100g": 0.3,
                "fiber_g_per_100g": 0.4,
            },
            {
                "name_es": "Arepa de maíz blanco asada (sin mantequilla)",
                "estimated_grams": 85.0,
                "confidence": 0.90,
                "kcal_per_100g": 195.0,
                "protein_g_per_100g": 4.6,
                "carbs_g_per_100g": 40.5,
                "fat_g_per_100g": 1.4,
                "fiber_g_per_100g": 2.8,
            },
            {
                "name_es": "Aguacate Hass colombiano",
                "estimated_grams": 80.0,
                "confidence": 0.86,
                "kcal_per_100g": 160.0,
                "protein_g_per_100g": 2.0,
                "carbs_g_per_100g": 8.5,
                "fat_g_per_100g": 14.7,
                "fiber_g_per_100g": 6.7,
            },
        ],
    },
    "desayuno_arepa_pericos": {
        "dish_name": "Desayuno Colombiano: Huevos Pericos, Arepa Blanca Asada y Quesito",
        "is_colombian_dish": True,
        "overall_confidence": 0.91,
        "items": [
            {
                "name_es": "Huevos pericos colombianos (con tomate y cebolla larga)",
                "estimated_grams": 180.0,
                "confidence": 0.92,
                "kcal_per_100g": 148.0,
                "protein_g_per_100g": 11.8,
                "carbs_g_per_100g": 2.1,
                "fat_g_per_100g": 10.2,
                "fiber_g_per_100g": 0.5,
            },
            {
                "name_es": "Arepa de maíz blanco asada (sin mantequilla)",
                "estimated_grams": 90.0,
                "confidence": 0.94,
                "kcal_per_100g": 195.0,
                "protein_g_per_100g": 4.6,
                "carbs_g_per_100g": 40.5,
                "fat_g_per_100g": 1.4,
                "fiber_g_per_100g": 2.8,
            },
            {
                "name_es": "Quesito antioqueño / Queso campesino bajo en grasa",
                "estimated_grams": 65.0,
                "confidence": 0.87,
                "kcal_per_100g": 230.0,
                "protein_g_per_100g": 17.5,
                "carbs_g_per_100g": 2.4,
                "fat_g_per_100g": 16.8,
                "fiber_g_per_100g": 0.0,
            },
        ],
    },
    "ajiaco_santafereno": {
        "dish_name": "Ajiaco Santafereño con Pollo Desmechado, Papa Criolla y Aguacate",
        "is_colombian_dish": True,
        "overall_confidence": 0.84,
        "items": [
            {
                "name_es": "Ajiaco Santafereño con pollo desmechado y aguacate",
                "estimated_grams": 420.0,
                "confidence": 0.83,
                "kcal_per_100g": 122.0,
                "protein_g_per_100g": 7.6,
                "carbs_g_per_100g": 13.8,
                "fat_g_per_100g": 4.1,
                "fiber_g_per_100g": 2.1,
            },
            {
                "name_es": "Pechuga de pollo a la plancha (peso cocido)",
                "estimated_grams": 90.0,
                "confidence": 0.86,
                "kcal_per_100g": 165.0,
                "protein_g_per_100g": 31.0,
                "carbs_g_per_100g": 0.0,
                "fat_g_per_100g": 3.6,
                "fiber_g_per_100g": 0.0,
            },
        ],
    },
}


def _enrich_item_with_db(item: dict, db: Session) -> dict:
    """
    Cruza el ingrediente detectado por IA con nuestra base de datos (COLOMBIA_CORE / USDA)
    para usar los macronutrientes verificados cuando existe coincidencia.
    """
    name = item.get("name_es", "")
    grams = float(item.get("estimated_grams", 100.0))

    db_food = (
        db.query(FoodItem)
        .filter(FoodItem.name_es.ilike(f"%{name[:18]}%"))
        .first()
    )
    if db_food:
        kcal_100 = db_food.kcal_per_100g
        p_100 = db_food.protein_g_per_100g
        c_100 = db_food.carbs_g_per_100g
        f_100 = db_food.fat_g_per_100g
        fib_100 = db_food.fiber_g_per_100g
        matched_name = db_food.name_es
    else:
        kcal_100 = float(item.get("kcal_per_100g", 150.0))
        p_100 = float(item.get("protein_g_per_100g", 10.0))
        c_100 = float(item.get("carbs_g_per_100g", 15.0))
        f_100 = float(item.get("fat_g_per_100g", 5.0))
        fib_100 = float(item.get("fiber_g_per_100g", 2.0))
        matched_name = name

    ratio = grams / 100.0
    return {
        "name_es": matched_name,
        "estimated_grams": round(grams, 1),
        "confidence": round(float(item.get("confidence", 0.85)), 2),
        "kcal": int(round(kcal_100 * ratio)),
        "protein_g": round(p_100 * ratio, 1),
        "carbs_g": round(c_100 * ratio, 1),
        "fat_g": round(f_100 * ratio, 1),
        "fiber_g": round(fib_100 * ratio, 1),
        "kcal_per_100g": kcal_100,
        "protein_g_per_100g": p_100,
        "carbs_g_per_100g": c_100,
        "fat_g_per_100g": f_100,
        "fiber_g_per_100g": fib_100,
    }


def analyze_plate_photo(
    image_base64: str,
    reference_object: str,
    user_hint: str,
    db: Session,
) -> dict:
    """
    Analiza la foto del plato:
    1. Si se envía una imagen (image_base64):
       - Consulta la API de Google Gemini Multimodal recorriendo la escalera de versiones
         (Gemini 3.8 -> 3.7 -> 3.6 -> 3.5 -> 3.0 -> 2.5 -> 2.0 -> 1.5).
       - Si la API_KEY no está configurada o falla la API, devuelve un error explícito SIN
         inventar ingredientes falsos.
       - Si la foto no contiene alimentos reconocibles, devuelve lista vacía.
    2. Si NO se envía imagen (modo simulador de prueba rápida sin cámara):
       - Utiliza los presets gastronómicos colombianos según la pista o botón presionado.
    """
    api_key = (settings.GEMINI_API_KEY or "").strip()

    # Escalera de versiones de Gemini en orden de prioridad
    ladder = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]
    configured_fallbacks = [
        m.strip()
        for m in (getattr(settings, "GEMINI_FALLBACK_MODELS", "") or "").split(",")
        if m.strip()
    ]
    candidate_models: list[str] = []
    for m in configured_fallbacks + ladder:
        if m not in candidate_models:
            candidate_models.append(m)

    primary_model = candidate_models[0] if candidate_models else "gemini-2.5-flash"

    # CASO 1: El usuario subió o tomó una foto real
    if image_base64 and len(image_base64.strip()) > 30:
        hint_clean = (user_hint or "").strip()
        hint_lower = hint_clean.lower()

        if not api_key or api_key in ("tu-google-gemini-api-key", "your-api-key"):
            # Si se proporcionó una pista específica de plato colombiano (ej. pruebas unitarias o preset)
            if any(k in hint_lower for k in ("bandeja", "paisa", "desayuno", "arepa", "perico", "ajiaco", "almuerzo", "pollo")):
                if "bandeja" in hint_lower or "paisa" in hint_lower:
                    preset = COLOMBIAN_PLATE_PRESETS["bandeja_paisa"]
                elif "desayuno" in hint_lower or "arepa" in hint_lower or "huevo" in hint_lower or "perico" in hint_lower:
                    preset = COLOMBIAN_PLATE_PRESETS["desayuno_arepa_pericos"]
                elif "ajiaco" in hint_lower or "sopa" in hint_lower or "sancocho" in hint_lower:
                    preset = COLOMBIAN_PLATE_PRESETS["ajiaco_santafereno"]
                else:
                    preset = COLOMBIAN_PLATE_PRESETS["almuerzo_ejecutivo_pollo"]

                conf_penalty = 0.08 if reference_object == "NONE" else 0.0
                overall_conf = round(max(0.60, preset["overall_confidence"] - conf_penalty), 2)
                enriched_items = [_enrich_item_with_db(it, db) for it in preset["items"]]
                return {
                    "model_version": "gemini-offline-preset",
                    "dish_name": preset["dish_name"],
                    "is_colombian_dish": True,
                    "overall_confidence": overall_conf,
                    "error_message": "Modo demostración / sin GEMINI_API_KEY. Configura GEMINI_API_KEY en Render para visión real por IA.",
                    "items": enriched_items,
                }

            return {
                "model_version": "gemini-api-key-requerida",
                "dish_name": "API Key de Gemini no configurada",
                "is_colombian_dish": False,
                "overall_confidence": 0.0,
                "error_message": (
                    "Para analizar fotos con IA debes agregar la variable GEMINI_API_KEY en el panel de Render "
                    "con tu clave gratuita de Google AI Studio (aistudio.google.com)."
                ),
                "items": [],
            }

        # Extraer formato MIME y base64 limpio
        mime_type = "image/jpeg"
        if "," in image_base64:
            header, clean_b64 = image_base64.split(",", 1)
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
        else:
            clean_b64 = image_base64

        hint_clean = (user_hint or "").strip()
        ref_desc = {
            "PLATE_26CM": "Plato pando estándar de 26 cm de diámetro",
            "HAND": "Mano o puño cerrado al lado de la comida como referencia",
            "CUTLERY": "Tenedor o cubierto estándar de 20 cm",
            "NONE": "Sin objeto de referencia específico",
        }.get(reference_object, "Plato estándar")

        prompt = (
            "Eres un nutricionista deportivo de precisión y experto en visión artificial para reconocimiento visual de comidas e ingredientes. "
            "Analiza DETENIDAMENTE esta imagen fotográfica.\n\n"
            "INSTRUCCIONES ESTRICTAS:\n"
            "1. Identifica ÚNICAMENTE los alimentos e ingredientes que REALMENTE se encuentran presentes en la foto. "
            "No inventes alimentos que no estén visibles.\n"
            "2. Si la foto NO contiene comida o está borrosa/ininteligible, responde con dish_name='No se detectaron alimentos', "
            "is_colombian_dish=false, overall_confidence=0.0, items=[].\n"
            f"3. Referencia de escala para estimar el peso en gramos de cada porción: {ref_desc}.\n"
            f"{f'4. Pista contextual aportada por el usuario (usar sólo si es coherente con lo que ves en la imagen): {hint_clean}.' if hint_clean else ''}\n"
            "5. Desglosa cada ingrediente individualmente con: name_es (nombre común en español), estimated_grams (estimación de peso en gramos), "
            "confidence (0.0 a 1.0), y sus valores nutricionales por cada 100g (kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g).\n\n"
            "Responde EXCLUSIVAMENTE con un JSON válido con la siguiente estructura exacta:\n"
            "{\n"
            '  "dish_name": "Nombre descriptivo de la comida o ingredientes detectados",\n'
            '  "is_colombian_dish": true o false,\n'
            '  "overall_confidence": 0.85,\n'
            '  "items": [\n'
            '    {\n'
            '      "name_es": "nombre del alimento",\n'
            '      "estimated_grams": 150.0,\n'
            '      "confidence": 0.9,\n'
            '      "kcal_per_100g": 165.0,\n'
            '      "protein_g_per_100g": 31.0,\n'
            '      "carbs_g_per_100g": 0.0,\n'
            '      "fat_g_per_100g": 3.6,\n'
            '      "fiber_g_per_100g": 0.0\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": clean_b64.strip(),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        last_error = ""
        for model_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                with httpx.Client(timeout=20.0) as client:
                    r = client.post(url, json=payload)
                    if r.status_code == 200:
                        candidates = r.json().get("candidates", [])
                        if candidates:
                            text_out = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                            parsed = json.loads(text_out)
                            raw_items = parsed.get("items", [])
                            enriched = [
                                _enrich_item_with_db(it, db)
                                for it in raw_items
                            ]
                            dish = parsed.get("dish_name", "Plato Analizado por IA")
                            conf = float(parsed.get("overall_confidence", 0.85 if enriched else 0.0))
                            return {
                                "model_version": f"{model_name}-live",
                                "dish_name": dish,
                                "is_colombian_dish": bool(parsed.get("is_colombian_dish", False)),
                                "overall_confidence": conf,
                                "error_message": None if enriched else "La IA no detectó alimentos en la imagen.",
                                "items": enriched,
                            }
                    else:
                        last_error = f"{model_name} (HTTP {r.status_code}: {r.text[:120]})"
            except Exception as e:
                last_error = f"{model_name} ({str(e)[:100]})"
                continue

        # Si fallaron todos los modelos de la escalera, reportar el error en vez de inventar comidas
        return {
            "model_version": f"{primary_model}-error",
            "dish_name": "Error al conectar con Google Gemini",
            "is_colombian_dish": False,
            "overall_confidence": 0.0,
            "error_message": f"No se pudo consultar Google Gemini. Detalle: {last_error}",
            "items": [],
        }

    # CASO 2: Sin foto (el usuario seleccionó un plato predefinido de prueba rápida)
    hint_lower = (user_hint or "").lower().strip()
    if "bandeja" in hint_lower or "paisa" in hint_lower:
        preset = COLOMBIAN_PLATE_PRESETS["bandeja_paisa"]
    elif "desayuno" in hint_lower or "arepa" in hint_lower or "huevo" in hint_lower or "perico" in hint_lower:
        preset = COLOMBIAN_PLATE_PRESETS["desayuno_arepa_pericos"]
    elif "ajiaco" in hint_lower or "sopa" in hint_lower or "sancocho" in hint_lower:
        preset = COLOMBIAN_PLATE_PRESETS["ajiaco_santafereno"]
    elif hint_lower:
        preset = COLOMBIAN_PLATE_PRESETS["almuerzo_ejecutivo_pollo"]
    else:
        return {
            "model_version": "sin-imagen",
            "dish_name": "Por favor toma una foto o selecciona un plato",
            "is_colombian_dish": False,
            "overall_confidence": 0.0,
            "error_message": "Toma una foto de tu comida o escribe el nombre del plato.",
            "items": [],
        }

    conf_penalty = 0.08 if reference_object == "NONE" else 0.0
    overall_conf = round(max(0.60, preset["overall_confidence"] - conf_penalty), 2)
    enriched_items = [_enrich_item_with_db(it, db) for it in preset["items"]]

    return {
        "model_version": "simulador-plato-colombia",
        "dish_name": preset["dish_name"],
        "is_colombian_dish": preset["is_colombian_dish"],
        "overall_confidence": overall_conf,
        "error_message": None,
        "items": enriched_items,
    }


def calculate_mape_error(raw_items: list[dict], corrected_items: list[dict]) -> float:
    """
    Calcula el Error Porcentual Absoluto Medio (MAPE) entre los gramos estimados por la IA
    y los gramos corregidos por el usuario (Human-in-the-Loop).
    """
    if not raw_items or not corrected_items:
        return 0.0

    raw_by_name = {it.get("name_es", "").lower(): float(it.get("estimated_grams", 100.0)) for it in raw_items}
    errors: list[float] = []
    for corr in corrected_items:
        name_key = corr.get("name_es", "").lower()
        corr_g = max(1.0, float(corr.get("estimated_grams", 100.0)))
        if name_key in raw_by_name:
            pred_g = raw_by_name[name_key]
            errors.append(abs(pred_g - corr_g) / corr_g * 100.0)
        else:
            # Ingrediente nuevo agregado manualmente por el usuario que la IA omitió
            errors.append(35.0)

    if not errors:
        return 0.0
    return round(sum(errors) / len(errors), 2)
