import httpx
from sqlalchemy.orm import Session
from app.models.entities import FoodItem
from app.schemas.api_schemas import FoodItemResponse


def lookup_barcode_ean(ean: str, db: Session) -> tuple[FoodItemResponse | None, str]:
    """
    1. Busca primero en la base de datos local (alimentos colombianos y caché previa).
    2. Si no existe localmente, consulta Open Food Facts API v2 en tiempo real,
       normaliza los macronutrientes por 100g y guarda el producto en la base local
       para que futuras lecturas en iPhone funcionen incluso offline.
    """
    clean_ean = "".join(ch for ch in ean.strip() if ch.isdigit())
    if not clean_ean:
        return None, "INVALID_CODE"

    local_item = (
        db.query(FoodItem).filter(FoodItem.barcode_ean13 == clean_ean).first()
    )
    if local_item:
        return (
            FoodItemResponse(
                id=local_item.id,
                name_es=local_item.name_es,
                category=local_item.category,
                region=local_item.region,
                source=local_item.source,
                barcode_ean13=local_item.barcode_ean13,
                serving_label=local_item.serving_label,
                serving_weight_g=local_item.serving_weight_g,
                kcal_per_100g=local_item.kcal_per_100g,
                protein_g_per_100g=local_item.protein_g_per_100g,
                carbs_g_per_100g=local_item.carbs_g_per_100g,
                fat_g_per_100g=local_item.fat_g_per_100g,
                fiber_g_per_100g=local_item.fiber_g_per_100g,
                is_verified=local_item.is_verified,
            ),
            "LOCAL_CATALOG",
        )

    # Fallback en vivo a Open Food Facts API v2
    url = f"https://world.openfoodfacts.org/api/v2/product/{clean_ean}.json"
    try:
        with httpx.Client(timeout=4.5) as client:
            resp = client.get(
                url,
                headers={"User-Agent": "FitProIA-Colombia-PWA/1.0 (atleta@fitproia.co)"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == 1 and "product" in data:
                    prod = data["product"]
                    nutr = prod.get("nutriments", {})

                    name = (
                        prod.get("product_name_es")
                        or prod.get("product_name")
                        or f"Producto Escaneado ({clean_ean})"
                    ).strip()
                    brand = (prod.get("brands") or "").split(",")[0].strip()
                    full_name = f"{name} ({brand})" if brand and brand.lower() not in name.lower() else name

                    kcal_100 = float(
                        nutr.get("energy-kcal_100g")
                        or nutr.get("energy-kcal")
                        or 0.0
                    )
                    prot_100 = float(nutr.get("proteins_100g") or 0.0)
                    carbs_100 = float(nutr.get("carbohydrates_100g") or 0.0)
                    fat_100 = float(nutr.get("fat_100g") or 0.0)
                    fiber_100 = float(nutr.get("fiber_100g") or 0.0)

                    serving_g = float(prod.get("serving_quantity") or 100.0)
                    if serving_g <= 0 or serving_g > 1000:
                        serving_g = 100.0
                    serving_label = prod.get("serving_size") or f"1 porción ({int(serving_g)}g)"

                    region = "CO" if clean_ean.startswith("770") else "GLOBAL"

                    new_food = FoodItem(
                        name_es=full_name[:195],
                        category="Escaneado Open Food Facts",
                        region=region,
                        source="OPENFOODFACTS",
                        barcode_ean13=clean_ean,
                        serving_label=str(serving_label)[:95],
                        serving_weight_g=round(serving_g, 1),
                        kcal_per_100g=round(kcal_100, 1),
                        protein_g_per_100g=round(prot_100, 1),
                        carbs_g_per_100g=round(carbs_100, 1),
                        fat_g_per_100g=round(fat_100, 1),
                        fiber_g_per_100g=round(fiber_100, 1),
                        is_verified=True,
                    )
                    db.add(new_food)
                    db.commit()
                    db.refresh(new_food)

                    return (
                        FoodItemResponse(
                            id=new_food.id,
                            name_es=new_food.name_es,
                            category=new_food.category,
                            region=new_food.region,
                            source=new_food.source,
                            barcode_ean13=new_food.barcode_ean13,
                            serving_label=new_food.serving_label,
                            serving_weight_g=new_food.serving_weight_g,
                            kcal_per_100g=new_food.kcal_per_100g,
                            protein_g_per_100g=new_food.protein_g_per_100g,
                            carbs_g_per_100g=new_food.carbs_g_per_100g,
                            fat_g_per_100g=new_food.fat_g_per_100g,
                            fiber_g_per_100g=new_food.fiber_g_per_100g,
                            is_verified=new_food.is_verified,
                        ),
                        "OPENFOODFACTS_LIVE",
                    )
    except Exception:
        pass

    return None, "NOT_FOUND"
