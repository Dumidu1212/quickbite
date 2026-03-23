# app/routers/restaurants.py

from typing import Optional, Annotated
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import restaurants_collection, menu_items_collection

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

# S1192 fix: extract repeated string as a constant
_RESTAURANT_NOT_FOUND = "Restaurant not found"

NOT_FOUND_RESPONSE = {404: {"description": "Restaurant not found"}}
ITEM_NOT_FOUND_RESPONSE = {404: {"description": "Menu item not found"}}


def doc_to_restaurant(doc: dict) -> dict:
    """
    Converts a raw MongoDB document to a clean API response dict.
    MongoDB stores _id as ObjectId — we convert to string and rename to id.
    """
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "cuisine": doc["cuisine"],
        "address": doc["address"],
        "imageUrl": doc.get("imageUrl"),
        "rating": doc.get("rating", 0.0),
        "isOpen": doc.get("isOpen", True),
        "deliveryTime": doc.get("deliveryTime", "30-45 min"),
        "minimumOrder": doc.get("minimumOrder", 0.0),
    }


@router.get(
    "/",
    summary="Get all restaurants",
    description="Returns all restaurants. Filter by cuisine with ?cuisine=italian",
)
async def get_restaurants(
    # S8410 fix: use Annotated type hint for FastAPI Query dependency
    cuisine: Annotated[Optional[str], Query(description="Filter by cuisine type")] = None,
):
    """GET /restaurants — returns all restaurants with optional cuisine filter."""
    query_filter = {}
    if cuisine:
        query_filter["cuisine"] = {"$regex": cuisine, "$options": "i"}

    cursor = restaurants_collection.find(query_filter)
    restaurants = []
    async for doc in cursor:
        restaurants.append(doc_to_restaurant(doc))

    return {"restaurants": restaurants, "count": len(restaurants)}


@router.get(
    "/{restaurant_id}",
    summary="Get a single restaurant by ID",
    responses=NOT_FOUND_RESPONSE,  # S8415 fix: document 404 in responses
)
async def get_restaurant(restaurant_id: str):
    """GET /restaurants/:id — returns 404 if not found or invalid ID."""
    try:
        object_id = ObjectId(restaurant_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail=_RESTAURANT_NOT_FOUND)

    doc = await restaurants_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail=_RESTAURANT_NOT_FOUND)

    return {"restaurant": doc_to_restaurant(doc)}


@router.get(
    "/{restaurant_id}/menu",
    summary="Get all menu items for a restaurant",
    description="Returns items grouped by category.",
    responses=NOT_FOUND_RESPONSE,  # S8415 fix
)
async def get_restaurant_menu(restaurant_id: str):
    """GET /restaurants/:id/menu — items grouped by category."""
    try:
        object_id = ObjectId(restaurant_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail=_RESTAURANT_NOT_FOUND)

    restaurant = await restaurants_collection.find_one({"_id": object_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail=_RESTAURANT_NOT_FOUND)

    cursor = menu_items_collection.find({"restaurantId": restaurant_id})

    grouped: dict = {}
    async for doc in cursor:
        category = doc.get("category", "Other")
        if category not in grouped:
            grouped[category] = []
        grouped[category].append({
            "id": str(doc["_id"]),
            "restaurantId": doc["restaurantId"],
            "name": doc["name"],
            "description": doc.get("description"),
            "price": doc["price"],
            "category": doc["category"],
            "isAvailable": doc.get("isAvailable", True),
        })

    return {
        "restaurantId": restaurant_id,
        "restaurantName": restaurant["name"],
        "menu": grouped,
    }
