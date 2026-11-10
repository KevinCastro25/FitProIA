from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.api_schemas import UserProfileInput
from app.services.nutrition_engine import calculate_nutrition_plan


def test_katch_mcardle_and_maintenance_range():
    profile = UserProfileInput(
        sex="M",
        age=29,
        height_cm=176.0,
        current_weight_kg=76.0,
        current_body_fat_pct=16.0,
        bf_measurement_method="PLIEGUES",
        target_body_fat_pct=11.5,
        activity_level="ACTIVE",
        target_weekly_loss_pct=0.5,
        carb_cycling_enabled=True,
        protein_g_per_kg=2.2,
    )
    res = calculate_nutrition_plan(profile)
    assert res.formula_used == "KATCH_MCARDLE"
    # LBM = 76 * (1 - 0.16) = 63.84 kg
    assert abs(res.lean_body_mass_kg - 63.84) < 0.05
    # Rango de mantenimiento ±5%
    assert res.tdee_lower_bound_kcal < res.tdee_base_kcal < res.tdee_upper_bound_kcal
    # Ciclado de carbohidratos activo
    assert res.training_day_kcal > res.rest_day_kcal
    assert res.carbs_training_day_g > res.carbs_rest_day_g
    # Proteína alta priorizada (76 * 2.2 = 167g)
    assert res.protein_target_g == 167


def test_mifflin_st_jeor_fallback_and_safety_floor():
    profile = UserProfileInput(
        sex="F",
        age=27,
        height_cm=164.0,
        current_weight_kg=58.0,
        current_body_fat_pct=None,
        target_body_fat_pct=19.0,
        activity_level="MODERATE",
        target_weekly_loss_pct=1.1,
    )
    res = calculate_nutrition_plan(profile)
    assert res.formula_used == "MIFFLIN_ST_JEOR"
    assert res.target_daily_kcal >= res.min_safe_kcal
    assert len(res.warnings) >= 1


def test_api_endpoints_end_to_end():
    with TestClient(app) as client:
        # 1. Health check
        r_health = client.get("/health")
        assert r_health.status_code == 200
        assert r_health.json()["pwa_ios_ready"] is True

        # 2. Catálogo de alimentos colombianos
        r_foods = client.get("/api/v1/foods?q=arepa")
        assert r_foods.status_code == 200
        foods = r_foods.json()
        assert len(foods) >= 2
        assert any("Arepa" in f["name_es"] for f in foods)

        # 3. Perfil y cálculo nutricional
        r_prof = client.get("/api/v1/profile")
        assert r_prof.status_code == 200
        data_prof = r_prof.json()
        assert data_prof["targets"]["formula_used"] == "KATCH_MCARDLE"

        # 4. Registrar comida con clave de idempotencia offline
        meal_payload = {
            "log_date": date.today().isoformat(),
            "meal_type": "CENA",
            "custom_food_name": "Ajiaco Santafereño con pechuga extra",
            "quantity_g": 450,
            "portion_description": "1 tazón grande",
            "kcal": 550,
            "protein_g": 42.0,
            "carbs_g": 58.0,
            "fat_g": 16.0,
            "fiber_g": 8.5,
            "client_mutation_id": "offline-test-mut-001",
        }
        r_meal1 = client.post("/api/v1/meals", json=meal_payload)
        assert r_meal1.status_code == 200
        # Repetir envío offline debe ser idempotente (mismo ID)
        r_meal2 = client.post("/api/v1/meals", json=meal_payload)
        assert r_meal2.status_code == 200
        assert r_meal1.json()["id"] == r_meal2.json()["id"]

        # 5. Registrar entrenamiento de Hyrox / Fuerza
        workout_payload = {
            "session_date": date.today().isoformat(),
            "title": "Simulacro Hyrox + Fuerza Pierna",
            "modality": "HYROX",
            "duration_minutes": 55,
            "session_rpe": 9,
            "distance_km": 6.0,
            "avg_pace_sec_per_km": 290,
            "avg_hr_bpm": 171,
            "elevation_gain_m": 20,
            "strength_sets": [
                {
                    "exercise_name": "Sentadilla Trasera",
                    "muscle_group": "PIERNA",
                    "set_number": 1,
                    "reps": 5,
                    "weight_kg": 115.0,
                    "rpe": 8.5,
                }
            ],
            "notes": "Wall balls + Sled push pesados",
        }
        r_work = client.post("/api/v1/workouts", json=workout_payload)
        assert r_work.status_code == 200
        assert r_work.json()["internal_load_au"] == 55 * 9
        assert r_work.json()["estimated_kcal_burned"] > 350

        # 6. Chequeo corporal con recomposición activa (peso estable, cintura y % grasa bajan)
        checkin_payload = {
            "checkin_date": date.today().isoformat(),
            "weight_kg": 76.3,
            "body_fat_pct": 15.3,
            "bf_method": "PLIEGUES",
            "measurement_conditions": "AYUNAS_MANANA",
            "waist_cm": 79.1,
            "hip_cm": 94.8,
            "chest_cm": 103.8,
            "arm_cm": 38.0,
            "thigh_cm": 58.6,
            "energy_level": 4,
            "sleep_quality": 4,
            "strength_performance": 5,
            "notes": "Más definido en abdomen y mejorando marcas en sentadilla",
        }
        r_chk = client.post("/api/v1/checkins", json=checkin_payload)
        assert r_chk.status_code == 200
        chk_data = r_chk.json()
        assert chk_data["assessment_status"] in ("RECOMPOSICION_ACTIVA", "OPTIMO_DEFINICION")
        assert chk_data["lean_mass_kg"] > 64.0


def test_phase2_barcode_and_ai_plate_vision():
    with TestClient(app) as client:
        # 1. Escaneo de código de barras EAN-13 colombiano (Arepa de maíz blanco)
        r_bar = client.get("/api/v1/foods/barcode/7702001001011")
        assert r_bar.status_code == 200
        bar_data = r_bar.json()
        assert bar_data["found"] is True
        assert bar_data["lookup_source"] == "LOCAL_CATALOG"
        assert "Arepa" in bar_data["food"]["name_es"]

        # 2. Análisis de foto de plato colombiano con IA y objeto de referencia
        r_ai = client.post(
            "/api/v1/ai-vision/analyze-plate",
            json={
                "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                "reference_object": "PLATE_26CM",
                "user_hint": "almuerzo ejecutivo pollo con arroz, frijoles y aguacate",
            },
        )
        assert r_ai.status_code == 200
        ai_data = r_ai.json()
        pred_id = ai_data["prediction_id"]
        assert ai_data["is_colombian_dish"] is True
        assert ai_data["overall_confidence"] >= 0.75
        assert len(ai_data["items"]) >= 3
        assert ai_data["total_protein_g"] >= 50.0

        # 3. Confirmación Human-in-the-Loop corrigiendo los gramos de la pechuga de 185g a 210g
        corrected_items = ai_data["items"]
        corrected_items[0]["estimated_grams"] = 210.0
        corrected_items[0]["kcal"] = 346
        corrected_items[0]["protein_g"] = 65.1

        r_conf = client.post(
            f"/api/v1/ai-vision/predictions/{pred_id}/confirm",
            json={
                "log_date": date.today().isoformat(),
                "meal_type": "ALMUERZO",
                "corrected_items": corrected_items,
                "client_mutation_id": "ai-confirm-mut-001",
            },
        )
        assert r_conf.status_code == 200
        conf_data = r_conf.json()
        assert conf_data["logged_meals_count"] == len(corrected_items)
        assert conf_data["estimation_error_pct"] > 0.0

        # 4. Consultar métricas del dataset Human-in-the-Loop
        r_hist = client.get("/api/v1/ai-vision/predictions")
        assert r_hist.status_code == 200
        hist_data = r_hist.json()
        assert hist_data["confirmed_count"] >= 1
        assert hist_data["colombian_priority_samples"] >= 1


def test_phase3_dynamic_budget_integrations_deload_and_push():
    with TestClient(app) as client:
        # 1. Sincronización desde Atajo de iOS (Apple Health)
        r_ios = client.post(
            "/api/v1/integrations/ios-shortcut",
            json={
                "steps_count": 13400,
                "active_kcal": 620,
                "sleep_hours": 7.9,
                "resting_hr_bpm": 51,
                "hrv_ms": 74.5,
                "workout_title": "Atajo iOS: Carrera Matutina Parque Simón Bolívar",
                "workout_modality": "RUNNING",
                "workout_duration_min": 48,
                "workout_distance_km": 9.6,
            },
        )
        assert r_ios.status_code == 200
        ios_data = r_ios.json()
        assert ios_data["steps_count"] >= 13400
        assert ios_data["hrv_ms"] == 74.5

        # 2. Importación de archivo .GPX real con cálculo Haversine
        gpx_xml = """<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Garmin">
          <trk><name>Bogota 10K</name><trkseg>
            <trkpt lat="4.6580" lon="-74.0930"><ele>2550</ele></trkpt>
            <trkpt lat="4.6680" lon="-74.0930"><ele>2585</ele></trkpt>
            <trkpt lat="4.6780" lon="-74.0930"><ele>2610</ele></trkpt>
          </trkseg></trk>
        </gpx>"""
        r_gpx = client.post(
            "/api/v1/integrations/import-file",
            json={
                "filename": "entrenamiento_bogota.gpx",
                "content_text": gpx_xml,
            },
        )
        assert r_gpx.status_code == 200
        gpx_data = r_gpx.json()
        assert gpx_data["parsed_summary"]["file_type"] == "GPX_TRACK"
        assert gpx_data["parsed_summary"]["elevation_gain_m"] >= 50

        # 3. Recálculo dinámico de calorías por actividad (60% backfill conservador)
        r_dyn = client.get("/api/v1/activity/dynamic-budget?backfill_override=0.60")
        assert r_dyn.status_code == 200
        dyn_data = r_dyn.json()
        assert dyn_data["steps_extra_kcal"] > 0
        assert dyn_data["reimbursed_bonus_kcal"] > 0
        assert dyn_data["effective_target_kcal"] > dyn_data["base_target_kcal"]

        # 4. Estado de carga aguda/crónica (ACWR) y recomendación de Descarga (Deload)
        r_rec = client.get("/api/v1/recovery/status")
        assert r_rec.status_code == 200
        rec_data = r_rec.json()
        assert "acwr_ratio" in rec_data
        assert rec_data["recommendation"]["deload_type"] in (
            "DELOAD_TREN_INFERIOR",
            "DELOAD_TREN_SUPERIOR",
            "DELOAD_GENERAL_SEMANA",
            "RECUPERACION_OPTIMA",
        )

        # 5. Suscripción Web Push iOS 16.4+ Standalone
        r_push = client.post(
            "/api/v1/notifications/subscribe",
            json={
                "endpoint": "https://web.push.apple.com/Q1test-ios-standalone",
                "p256dh_key": "test-p256dh",
                "auth_key": "test-auth",
                "device_platform": "IOS_STANDALONE_PWA",
                "protein_reminder_enabled": True,
                "deload_alert_enabled": True,
            },
        )
        assert r_push.status_code == 200
        assert r_push.json()["status"] == "subscribed"


def test_phase4_competitions_reds_ml_retraining_medical_and_coach():
    with TestClient(app) as client:
        # 1. Registrar competencia en fase de Tapering (en 10 días) -> Déficit prohibido (False)
        r_comp = client.post(
            "/api/v1/competitions",
            json={
                "name": "Hyrox Medellín Open Pro",
                "event_type": "HYROX",
                "event_date": (date.today() + timedelta(days=10)).isoformat(),
                "distance_km": 8.0,
                "elevation_gain_m": 0,
                "goal_time_minutes": 68,
                "priority_level": "A",
                "notes": "Simulación oficial de 8x1km + 8 estaciones funcionales",
            },
        )
        assert r_comp.status_code == 200
        comp_data = r_comp.json()
        plan = comp_data["periodization_plan"]
        assert plan["current_phase_code"] == "TAPERING_Y_CARGA_CARBOS"
        assert plan["deficit_allowed"] is False
        assert len(plan["periodization_blocks"]) == 5
        assert plan["intra_race_strategy"]["carbs_per_hour_g"] >= 30
        assert "energy_availability_kcal_per_kg_ffm" in plan["reds_evaluation"]

        # 2. Ejecutar Pipeline de Evaluación y Reentrenamiento del Modelo de Visión IA
        r_ml = client.post("/api/v1/vision/retraining/run")
        assert r_ml.status_code == 200
        ml_data = r_ml.json()
        assert ml_data["status"] == "COMPLETED"
        assert ml_data["colombian_dish_accuracy_pct"] >= 75.0
        assert "category_metrics" in ml_data

        # 3. Evaluación Médica y Detector de Señales de Alarma (Banderas Rojas)
        r_med = client.post(
            "/api/v1/medical/evaluate",
            json={
                "recent_weekly_weight_loss_kg": 1.35,  # >1.2% del peso -> bandera roja crítica
                "reported_symptoms": ["MAREOS"],
                "ferritin_ng_ml": 24.0,  # baja para corredor
                "vitamin_d_ng_ml": 26.0,
            },
        )
        assert r_med.status_code == 200
        med_data = r_med.json()
        assert med_data["has_active_red_flags"] is True
        assert len(med_data["red_flags"]) >= 3
        assert len(med_data["recommended_panels"]) == 3

        # 4. Sugerencias Inteligentes de Comidas, Plan Semanal con Lista de Compras y Coach IA
        r_sug = client.post(
            "/api/v1/meals/smart-suggestions",
            json={
                "remaining_kcal": 550,
                "remaining_protein_g": 45.0,
                "remaining_carbs_g": 50.0,
                "remaining_fat_g": 12.0,
            },
        )
        assert r_sug.status_code == 200
        assert len(r_sug.json()["suggestions"]) >= 1
        assert len(r_sug.json()["colombian_substitutions"]) >= 3

        r_plan = client.get("/api/v1/meals/weekly-plan")
        assert r_plan.status_code == 200
        assert len(r_plan.json()["days"]) == 7
        assert len(r_plan.json()["grocery_list"]) == 4

        r_coach = client.post(
            "/api/v1/coach/ask",
            json={
                "question": "¿Por qué mi peso en la báscula casi no baja pero mi cintura sí redujo 2.7 cm?",
                "current_body_fat_pct": 15.8,
                "target_body_fat_pct": 11.5,
                "lean_body_mass_kg": 64.3,
                "current_weight_kg": 76.4,
            },
        )
        assert r_coach.status_code == 200
        assert "Masa Magra" in r_coach.json()["answer"]





def test_supabase_auth_creates_user_and_require_auth(monkeypatch):
    from app.api.v1 import router as router_mod
    from app.core.config import settings

    fake = {
        "id": "11111111-2222-3333-4444-555555555555",
        "email": "nuevo.atleta@example.com",
        "full_name": "Nuevo Atleta",
        "provider": "google",
    }
    monkeypatch.setattr(
        router_mod, "verify_supabase_token", lambda t: fake if t == "tok-ok" else None
    )
    monkeypatch.setattr(settings, "REQUIRE_AUTH", True)

    with TestClient(app) as client:
        # Sin token o con token inválido -> 401 (sin usuario demo)
        assert client.get("/api/v1/workouts").status_code == 401
        bad = client.get("/api/v1/workouts", headers={"Authorization": "Bearer nope"})
        assert bad.status_code == 401

        # Token válido de Supabase -> crea el usuario local y responde 200 con datos vacíos
        ok = client.get("/api/v1/workouts", headers={"Authorization": "Bearer tok-ok"})
        assert ok.status_code == 200
        assert ok.json() == []

        # Un usuario nuevo aún no tiene perfil
        prof = client.get("/api/v1/profile", headers={"Authorization": "Bearer tok-ok"})
        assert prof.status_code == 404

        assert client.get("/health").json()["status"] == "ok"
