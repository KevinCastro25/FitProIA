"""
FitProIA — Fase 4 (Módulos 10 y 11):
- Módulo 10: Recomendaciones Médicas, Chequeos de Laboratorio (Hemograma, Ferritina,
  Vitamina D, Tiroides, Perfil Lipídico, Glicemia, ECG/Prueba de Esfuerzo),
  Calibración DEXA/Nutricionista y Detector de Señales de Alarma (Banderas Rojas).
- Módulo 11: Sugerencias Inteligentes para Cerrar Macros, Planificador Semanal
  con Lista de Compras Colombiana, Gamificación y Asistente IA Conversacional.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any


MEDICAL_DISCLAIMER_TEXT = (
    "AVISO MÉDICO Y LEGAL (Ley 1581 / Ética en Salud Deportiva): FitProIA es una herramienta "
    "informativa y de apoyo nutricional/deportivo. Sus cálculos fisiológicos, proyecciones de "
    "composición corporal y sugerencias NO constituyen diagnóstico, prescripción ni tratamiento "
    "médico. Consulta siempre a un médico deportólogo y a un nutricionista dietista certificado "
    "antes de iniciar déficits calóricos o preparar competencias de fondo."
)


def evaluate_medical_safety_and_checkups(
    age: int,
    sex: str,
    current_weight_kg: float,
    recent_weekly_weight_loss_kg: float,
    reported_symptoms: list[str] | None,
    has_high_intensity_competition: bool = True,
    last_bloodwork_date: date | None = None,
    last_dexa_or_isak_date: date | None = None,
    ferritin_ng_ml: float | None = None,
    vitamin_d_ng_ml: float | None = None,
) -> dict[str, Any]:
    """
    Evalúa recordatorios médicos preventivos (anuales y pre-competencia),
    calibración de composición corporal y detecta señales clínicas de alarma.
    """
    today = date.today()
    symptoms = [s.strip().upper() for s in (reported_symptoms or []) if s.strip()]

    # 1. Detección de Señales de Alarma (Red Flags Clínicas)
    red_flags: list[dict[str, str]] = []
    weekly_loss_pct = (
        round((recent_weekly_weight_loss_kg / max(40.0, current_weight_kg)) * 100.0, 2)
        if recent_weekly_weight_loss_kg > 0
        else 0.0
    )

    if weekly_loss_pct > 1.2:
        red_flags.append(
            {
                "code": "PERDIDA_PESO_EXCESIVA",
                "severity": "CRITICA",
                "title": f"Pérdida de peso demasiado rápida ({weekly_loss_pct}% en 1 semana)",
                "clinical_action": (
                    "Superar el 1.0-1.2% del peso corporal por semana en atletas conlleva alta pérdida de tejido muscular magro, "
                    "deshidratación y riesgo de colelitiasis/fatiga hormonal. Sube +300 a +400 kcal/día y agenda control nutricional."
                ),
            }
        )

    symptom_map = {
        "MAREOS": (
            "Mareos o presíncope durante/después del ejercicio",
            "Suspende entrenamientos de alta intensidad (VO2max/Hyrox) inmediatamente. Solicita valoración médica con presión arterial, glicemia y electrocardiograma (ECG).",
        ),
        "DOLOR_PERSISTENTE": (
            "Dolor articular o tendinoso persistente (>7 días)",
            "No entrenes sobre dolor agudo. Aplica descarga inmediata del segmento afectado y consulta fisioterapia deportiva / medicina del deporte.",
        ),
        "FATIGA_EXTREMA": (
            "Fatiga extrema desproporcionada o insomnio con FC en reposo alta",
            "Posible síndrome de sobreentrenamiento no funcional o deficiencia de hierro/ferritina. Realiza analítica sanguínea completa y 5-7 días de descarga a mantenimiento calórico.",
        ),
        "CONDUCTA_RESTRICTIVA": (
            "Ansiedad severa con la comida o restricción compensatoria",
            "Tu salud mental y relación con la comida son prioritarias sobre cualquier meta estética. Desactiva objetivos de déficit estricto y consulta un profesional especializado.",
        ),
    }

    for sym in symptoms:
        if sym in symptom_map:
            title, action = symptom_map[sym]
            red_flags.append(
                {
                    "code": sym,
                    "severity": "ALTA",
                    "title": title,
                    "clinical_action": action,
                }
            )

    if ferritin_ng_ml is not None and ferritin_ng_ml < 35.0:
        red_flags.append(
            {
                "code": "FERRITINA_BAJA_RUNNER",
                "severity": "MEDIA_ALTA",
                "title": f"Ferritina sérica subóptima para corredor ({ferritin_ng_ml} ng/mL < 35 ng/mL)",
                "clinical_action": (
                    "La hemólisis por impacto en running reduce los depósitos de hierro y cae el VO2max. "
                    "Consulta a tu médico para suplementación supervisada y prioriza hierro hemo + vitamina C lejos del café."
                ),
            }
        )

    if vitamin_d_ng_ml is not None and vitamin_d_ng_ml < 30.0:
        red_flags.append(
            {
                "code": "VITAMINA_D_INSUFICIENTE",
                "severity": "MEDIA",
                "title": f"Vitamina D 25-OH baja ({vitamin_d_ng_ml} ng/mL < 30 ng/mL)",
                "clinical_action": (
                    "Niveles <30 ng/mL aumentan el riesgo de fracturas por estrés tibial en corredores y reducen la síntesis proteica muscular."
                ),
            }
        )

    # 2. Panel de Exámenes Médicos Anuales y Pre-Competencia Recomendados
    bloodwork_due = (
        (last_bloodwork_date + timedelta(days=365)).isoformat()
        if last_bloodwork_date
        else (today + timedelta(days=30)).isoformat()
    )
    dexa_due = (
        (last_dexa_or_isak_date + timedelta(days=112)).isoformat()
        if last_dexa_or_isak_date
        else (today + timedelta(days=60)).isoformat()
    )

    recommended_panels = [
        {
            "category": "Panel Sanguíneo Anual / Semestral del Atleta",
            "next_due_date": bloodwork_due,
            "biomarkers": [
                "Hemograma completo (Hemoglobina, Hematocrito, VCM)",
                "Ferritina sérica + Hierro sérico + Saturación de transferrina (clave en running por impacto plantar)",
                "Perfil lipídico completo (Colesterol Total, HDL, LDL, Triglicéridos, ApoB)",
                "Glicemia en ayunas + HbA1c + Insulina basal",
                "Vitamina D (25-OH Colecalciferol) y Vitamina B12",
                "Perfil tiroideo (TSH y T3 libre — vigilar adaptación metabólica en déficit)",
            ],
            "clinical_why": (
                "Detecta a tiempo anemia del corredor, déficits micronutricionales y desaceleración tiroidea durante fases de definición."
            ),
        },
        {
            "category": "Chequeo Cardiológico Pre-Competencia (Media Maratón / Maratón / Hyrox)",
            "next_due_date": (today + timedelta(days=45)).isoformat(),
            "biomarkers": [
                "Electrocardiograma (ECG) de 12 derivaciones en reposo",
                (
                    "Prueba de esfuerzo (Ergometría con gases / VO2max) obligatoria sugerida por edad ≥35 o alta exigencia competitiva"
                    if age >= 35 or has_high_intensity_competition
                    else "Prueba de esfuerzo deportiva para determinar zonas reales de FC (VT1 / VT2)"
                ),
                "Ecocardiograma Doppler si preparas Maratón, Ultra o Hyrox Pro",
            ],
            "clinical_why": (
                "Descarta cardiopatías silentes o arritmias inducidas por esfuerzo antes de someter al miocardio a picos de >90% FC máx."
            ),
        },
        {
            "category": "Calibración de Composición Corporal y Nutrición Deportiva",
            "next_due_date": dexa_due,
            "biomarkers": [
                "Antropometría ISAK Nivel 2/3 (6-8 pliegues cutáneos + perímetros corregidos) o Densitometría DEXA cada 16 semanas",
                "Consulta presencial/virtual con Nutricionista Deportivo certificado",
            ],
            "clinical_why": (
                "Las básculas de bioimpedancia varían hasta ±4% según tu glucógeno e hidratación; calibrar con pliegues ISAK o DEXA valida la ganancia real de masa magra."
            ),
        },
    ]

    return {
        "medical_disclaimer": MEDICAL_DISCLAIMER_TEXT,
        "red_flags": red_flags,
        "has_active_red_flags": len(red_flags) > 0,
        "recommended_panels": recommended_panels,
    }


def generate_smart_meal_suggestions(
    remaining_kcal: int,
    remaining_protein_g: float,
    remaining_carbs_g: float,
    remaining_fat_g: float,
) -> dict[str, Any]:
    """
    Sugiere alimentos y combinaciones exactas de la gastronomía colombiana y fitness
    para cerrar la proteína y los macros restantes del día, más tabla de sustituciones.
    """
    rem_p = max(0.0, remaining_protein_g)
    rem_c = max(0.0, remaining_carbs_g)
    rem_f = max(0.0, remaining_fat_g)
    rem_k = max(0, remaining_kcal)

    suggestions: list[dict[str, Any]] = []

    if rem_p >= 35:
        suggestions.append(
            {
                "title": "Combo Alta Síntesis Proteica (Cierre de Proteína Magra)",
                "tag": "PRIORIDAD PROTEÍNA",
                "description": (
                    "Pechuga de pollo a la plancha (180g) o Lomito de res magro + "
                    "Arepa de maíz blanco asada (90g) + Ensalada verde con limón."
                ),
                "kcal": 445,
                "protein_g": 54.0,
                "carbs_g": 34.0,
                "fat_g": 8.5,
                "why": f"Cubre de inmediato {min(54, int(rem_p))}g de los {int(rem_p)}g de proteína que te faltan hoy con muy poca grasa.",
            }
        )
        suggestions.append(
            {
                "title": "Snack Rápido Post-Entreno / Noche (Sin Cocinar)",
                "tag": "RÁPIDO 2 MIN",
                "description": (
                    "Yogur Griego Natural Sin Azúcar (200g) + 1 scoop de Whey Isolate (30g) "
                    "+ 1 Banano Urabá picado (100g)."
                ),
                "kcal": 335,
                "protein_g": 46.0,
                "carbs_g": 31.0,
                "fat_g": 2.0,
                "why": "Aporta leucina de rápida absorción + caseína láctea para evitar catabolismo nocturno.",
            }
        )
    elif rem_p >= 15:
        suggestions.append(
            {
                "title": "Toma Ligera de Proteína para Completar Meta",
                "tag": "AJUSTE FINO",
                "description": (
                    "3 claras de huevo + 1 huevo entero revueltos con tomate y cebolla (pericos) "
                    "+ 1 tajada de quesito bajo en grasa (40g)."
                ),
                "kcal": 215,
                "protein_g": 25.5,
                "carbs_g": 3.0,
                "fat_g": 11.0,
                "why": "Completa tu cuota proteica casi sin añadir carbohidratos extras.",
            }
        )
    else:
        suggestions.append(
            {
                "title": "Meta Proteica Cubierta — Hidratación y Recuperación",
                "tag": "META LOGRADA",
                "description": (
                    "Infusión relajante o agua con electrolitos + porción medida de fruta (fresas o papaya 150g) si tienes hambre."
                ),
                "kcal": 65,
                "protein_g": 1.0,
                "carbs_g": 15.0,
                "fat_g": 0.2,
                "why": "Ya alcanzaste tu objetivo de proteína hoy; mantén el déficit limpio para oxidar grasa.",
            }
        )

    if rem_c >= 45 and rem_k >= 250:
        suggestions.append(
            {
                "title": "Recarga de Glucógeno Limpia para Running / Hyrox",
                "tag": "ENERGÍA ENTRENO",
                "description": (
                    "Papa criolla al horno o cocida (200g) o Arroz blanco (150g) + "
                    "1 Bocadillo veleño (30g) pre-entreno."
                ),
                "kcal": 310,
                "protein_g": 5.5,
                "carbs_g": 68.0,
                "fat_g": 0.8,
                "why": "Reemplaza el glucógeno muscular sin pasarte en grasas.",
            }
        )

    substitutions = [
        {
            "category": "Carbohidratos (~30g Carbos netos)",
            "equivalences": [
                "1 Arepa de maíz blanco mediana asada (90g)",
                "110g de Arroz blanco cocido",
                "150g de Papa criolla o papa sabanera cocida",
                "100g de Plátano maduro o verde al horno/airfryer",
                "40g de Hojuelas de avena en crudo",
            ],
        },
        {
            "category": "Proteína Magra (~35g Proteína pura)",
            "equivalences": [
                "150g de Pechuga de pollo pesada en cocido (185g cruda)",
                "160g de Lomo o posta de res magra",
                "180g de Filete de tilapia o trucha a la plancha",
                "1.3 scoops (40g) de Proteína Whey Isolate",
                "2 latas de Atún en agua escurrido",
            ],
        },
        {
            "category": "Grasas Saludables (~12g Grasa)",
            "equivalences": [
                "80g de Aguacate Hass o Papelillo (1/2 unidad mediana)",
                "1 cucharada sopera (13 ml) de Aceite de oliva extra virgen",
                "22g de Almendras o maní natural sin azúcar",
                "2 yemas de huevo adicionales",
            ],
        },
    ]

    return {
        "remaining_summary": {
            "remaining_kcal": rem_k,
            "remaining_protein_g": round(rem_p, 1),
            "remaining_carbs_g": round(rem_c, 1),
            "remaining_fat_g": round(rem_f, 1),
        },
        "suggestions": suggestions,
        "colombian_substitutions": substitutions,
    }


def generate_weekly_plan_and_grocery_list(
    training_day_kcal: int,
    rest_day_kcal: int,
    protein_target_g: float,
    carbs_training_g: float,
    carbs_rest_g: float,
    fat_target_g: float,
) -> dict[str, Any]:
    """
    Genera un plan semanal estructurado de 7 días (5 días de entreno + 2 de descanso/descarga)
    con platos colombianos saludables y calcula automáticamente la lista de compras semanal.
    """
    days_schedule = [
        {
            "day": "Lunes",
            "day_type": "ENTRENO_FUERZA_SUPERIOR",
            "target_kcal": training_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "3 huevos pericos + 2 claras + 1 arepa blanca asada + 40g quesito + café",
                "Almuerzo": "200g pechuga a la plancha + 150g arroz blanco + 120g fríjol rojo + 70g aguacate Hass",
                "Pre/Post Entreno": "1.5 scoops Whey Isolate + 1 banano Urabá + 1 bocadillo veleño",
                "Cena": "180g lomo de res magro + 160g papa criolla en airfryer + ensalada fresca",
            },
        },
        {
            "day": "Martes",
            "day_type": "ENTRENO_RUNNING_SERIES",
            "target_kcal": training_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "60g avena cocida con 1 scoop Whey + fresas + 2 huevos cocidos",
                "Almuerzo": "200g filete de tilapia/trucha + 150g arroz con coco ligero + patacón en airfryer + aguacate",
                "Pre/Post Entreno": "200g yogur griego sin azúcar + 1 banano + 20g miel",
                "Cena": "180g pechuga desmechada + 1 arepa blanca + verduras salteadas",
            },
        },
        {
            "day": "Miércoles",
            "day_type": "ENTRENO_FUERZA_PIERNA",
            "target_kcal": training_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "Calentado fit: 120g arroz y fríjol + 3 huevos a la plancha + arepa pequeña",
                "Almuerzo": "200g posta/lomo de res + 180g papa sabanera al vapor + aguacate Hass + ensalada",
                "Pre/Post Entreno": "1.5 scoops Whey Isolate + 1 banano + 30g avena",
                "Cena": "Ajiaco santafereño fit (220g pechuga desmechada + papa criolla + mazorca, sin crema pesada)",
            },
        },
        {
            "day": "Jueves",
            "day_type": "DESCANSO_ACTIVO_PASOS",
            "target_kcal": rest_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "Omelette de 3 huevos + 2 claras con espinaca, champiñones y 50g quesito + 1/2 arepa",
                "Almuerzo": "200g pechuga al limón + 100g arroz + brócoli al vapor + 80g aguacate",
                "Snack Tarde": "200g yogur griego natural + 15g almendras",
                "Cena": "180g atún/tilapia a la plancha + ensalada grande con aceite de oliva",
            },
        },
        {
            "day": "Viernes",
            "day_type": "ENTRENO_SIMULACION_HYROX",
            "target_kcal": training_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "3 huevos revueltos + 1 arepa de maíz blanco + 1 banano maduro",
                "Almuerzo": "Bowl Paisa Fit: 200g pollo/lomo + 140g fríjol + 130g arroz + aguacate + plátano maduro asado",
                "Pre/Post Entreno": "1.5 scoops Whey Isolate + 1 bocadillo veleño",
                "Cena": "180g solomito de cerdo magro + 150g yuca cocida + ensalada de tomate",
            },
        },
        {
            "day": "Sábado",
            "day_type": "FONDO_LARGO_RUNNING",
            "target_kcal": training_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "2 arepas blancas asadas con miel y quesito + 1 scoop Whey + café (pre-fondo)",
                "Almuerzo": "Sancocho de pollo fit (220g pechuga + mazorca + plátano + yuca medida) + aguacate",
                "Pre/Post Entreno": "Batido recuperación: 200g yogur griego + 1 scoop Whey + banano",
                "Cena": "180g lomo de res + ensalada mediterránea + 100g papa criolla",
            },
        },
        {
            "day": "Domingo",
            "day_type": "DESCANSO_Y_MOVILIDAD",
            "target_kcal": rest_day_kcal,
            "target_protein_g": protein_target_g,
            "meals": {
                "Desayuno": "3 huevos pericos + 2 claras + 1 arepa blanca + aguacate",
                "Almuerzo": "200g trucha o salmón a la plancha + 100g arroz + espárragos/ensalada",
                "Snack Tarde": "1 scoop Whey Isolate + 150g fresas o papaya",
                "Cena": "180g pechuga en fajitas con pimentón y cebolla + quesito bajo en grasa",
            },
        },
    ]

    grocery_list = [
        {
            "section": "Carnes Magras, Aves, Pescados y Huevos (Base Proteica)",
            "items": [
                {"item": "Pechuga de pollo sin piel", "quantity": "1.6 kg", "checked": False},
                {"item": "Lomo / Posta de res magra", "quantity": "900 g", "checked": False},
                {"item": "Filetes de tilapia, trucha o atún", "quantity": "600 g", "checked": False},
                {"item": "Solomito de cerdo magro", "quantity": "250 g", "checked": False},
                {"item": "Cubeta de huevos AA / AAA", "quantity": "30 unidades", "checked": False},
            ],
        },
        {
            "section": "Lácteos Altos en Proteína y Suplementación",
            "items": [
                {"item": "Yogur Griego Natural Sin Azúcar", "quantity": "1.0 kg (5 vasos)", "checked": False},
                {"item": "Quesito antioqueño / Cuajada baja en grasa", "quantity": "350 g", "checked": False},
                {"item": "Proteína Whey Isolate", "quantity": "10 servicios (~300 g)", "checked": False},
            ],
        },
        {
            "section": "Carbohidratos, Tubérculos y Despensa Colombiana",
            "items": [
                {"item": "Arepas de maíz blanco sin grasa añadida", "quantity": "2 paquetes (10 und)", "checked": False},
                {"item": "Arroz blanco / parbolizado", "quantity": "1.0 kg", "checked": False},
                {"item": "Fríjol cargamanto rojo", "quantity": "500 g", "checked": False},
                {"item": "Papa criolla y papa sabanera", "quantity": "1.2 kg", "checked": False},
                {"item": "Plátano verde / maduro y yuca", "quantity": "4 unidades + 400 g yuca", "checked": False},
                {"item": "Avena en hojuelas y Bocadillo veleño (pre-entreno)", "quantity": "400 g + 1 caja bocadillos", "checked": False},
            ],
        },
        {
            "section": "Frutas, Verduras y Grasas Saludables",
            "items": [
                {"item": "Aguacate Hass o Papelillo", "quantity": "4 unidades medianas", "checked": False},
                {"item": "Banano Urabá / Criollo", "quantity": "8 unidades", "checked": False},
                {"item": "Fresas o Papaya", "quantity": "500 g", "checked": False},
                {"item": "Tomate chonto, cebolla larga, espinaca, brócoli y limones", "quantity": "1 mercado semanal", "checked": False},
            ],
        },
    ]

    return {
        "plan_name": "Plan Híbrido Recomposición Colombiano (5 Días Entreno / 2 Descanso)",
        "target_training_kcal": training_day_kcal,
        "target_rest_kcal": rest_day_kcal,
        "target_protein_g": protein_target_g,
        "days": days_schedule,
        "grocery_list": grocery_list,
    }


def answer_coach_question(
    question: str,
    user_context: dict[str, Any],
) -> dict[str, Any]:
    """
    Asistente IA Conversacional contextualizado con el progreso real del atleta
    (% grasa actual vs meta, masa magra, calorías Katch-McArdle, ACWR/Deload y competencia).
    Usa Google Gemini 2.5 Flash si GEMINI_API_KEY está presente o el motor fisiológico determinista.
    """
    q_lower = question.lower().strip()
    bf_current = user_context.get("current_body_fat_pct", 15.8)
    bf_target = user_context.get("target_body_fat_pct", 11.5)
    lbm_kg = user_context.get("lean_body_mass_kg", 64.3)
    weight_kg = user_context.get("current_weight_kg", 76.4)
    protein_g = user_context.get("protein_target_g", 168.0)
    train_kcal = user_context.get("training_day_kcal", 2480)
    rest_kcal = user_context.get("rest_day_kcal", 2150)
    acwr = user_context.get("acwr_ratio", 1.08)
    comp_name = user_context.get("next_competition_name", "Media Maratón de Bogotá")

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and not api_key.startswith("your-"):
        try:
            from google import genai  # type: ignore

            client = genai.Client(api_key=api_key)
            prompt = (
                "Eres el Coach Fisiológico y Nutricional de FitProIA en Colombia. "
                "Responde en español conciso, basándote en los datos reales del usuario: "
                f"Peso={weight_kg}kg, %Grasa actual={bf_current}%, Meta %Grasa={bf_target}%, "
                f"Masa Magra={lbm_kg}kg, Proteína diaria={protein_g}g, "
                f"Kcal día entreno={train_kcal}, Kcal descanso={rest_kcal}, ACWR={acwr}, "
                f"Próxima competencia={comp_name}.\n\n"
                f"Pregunta del usuario: {question}"
            )
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if resp and resp.text:
                return {
                    "answer": resp.text.strip(),
                    "context_metrics_used": [
                        f"% Grasa: {bf_current}% → {bf_target}%",
                        f"Masa Magra: {lbm_kg} kg",
                        f"Meta Proteína: {protein_g} g/día",
                        f"ACWR Carga: {acwr}",
                    ],
                    "engine": "GEMINI_2_5_FLASH_COACH",
                }
        except Exception:
            pass

    # Respuestas contextualizadas basadas en los datos reales del usuario
    if any(k in q_lower for k in ("peso", "báscula", "bascula", "estancado", "no bajo")):
        answer = (
            f"Revisando tu historial en FitProIA: tu peso actual es **{weight_kg} kg**, pero tu **Masa Magra subió a {lbm_kg} kg** "
            f"y tu porcentaje de grasa ya bajó a **{bf_current}%** (camino a tu meta de **{bf_target}%**). "
            "Recuerda que en recomposición corporal el peso en la báscula es secundario: cuando ganas glucógeno intramuscular y tejido magro "
            "mientras pierdes grasa visceral (cintura a la baja), la báscula puede moverse poco aunque tu composición mejore. "
            f"Mantén tus **{train_kcal} kcal** en días de entreno y **{protein_g}g de proteína** sin recortar más calorías."
        )
    elif any(k in q_lower for k in ("competencia", "maratón", "maraton", "hyrox", "carrera", "tapering")):
        answer = (
            f"Para tu competencia objetivo (**{comp_name}**), FitProIA aplica periodización por bloques: "
            f"el déficit calórico solo se mantiene en la Fase Base (>8 semanas antes). "
            f"Cuando entres a las últimas 4 semanas (Pico de Carga y Tapering), el sistema bloquea automáticamente el déficit "
            f"y sube tus carbohidratos a **6–8 g/kg** para blindar tu glucógeno, proteger tus **{lbm_kg} kg de masa magra** y prevenir RED-S."
        )
    elif any(k in q_lower for k in ("descarga", "deload", "cansado", "fatiga", "pierna", "rodilla")):
        answer = (
            f"Tu ratio de carga aguda:crónica actual es **ACWR = {acwr}**. "
            "Si sientes pesadez en piernas tras combinar sentadilla/peso muerto con fondos de running, activa un **Deload de Tren Inferior de 5 días**: "
            "reduce 40% las series de pierna, baja el kilometraje 35% a Zona 2 suave, y **sube las calorías a mantenimiento** "
            f"manteniendo **{protein_g}g de proteína/día** para que el tejido conectivo supercompense sin perder músculo."
        )
    else:
        answer = (
            f"Con tu composición actual (**{bf_current}% de grasa** y **{lbm_kg} kg de masa magra**), "
            f"tu presupuesto Katch-McArdle está calibrado en **{train_kcal} kcal** los días de entreno y **{rest_kcal} kcal** los días de descanso, "
            f"priorizando **{protein_g}g de proteína** (~{round(protein_g / 4)}g en 4 comidas). "
            "Si hoy te faltan proteínas, un combo de 180g de pechuga + arepa blanca o 200g de yogur griego + 1 scoop de Whey cierra tu meta limpia."
        )

    return {
        "answer": answer,
        "context_metrics_used": [
            f"% Grasa: {bf_current}% → Meta {bf_target}%",
            f"Masa Magra: {lbm_kg} kg",
            f"Presupuesto Ciclado: {train_kcal} / {rest_kcal} kcal",
            f"Proteína Priorizada: {protein_g} g/día",
        ],
        "engine": "FITPROIA_PHYSIOLOGY_COACH",
    }
