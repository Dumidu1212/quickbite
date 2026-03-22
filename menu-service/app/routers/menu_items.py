# app/routers/menu_items.py

from fastapi import APIRouter, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import menu_items_collection

router = APIRouter(prefix="/menu", tags=["Menu Items"])

# S1192 fix: constant for repeated string
_ITEM_NOT_FOUND = "Menu item not found"

NOT_FOUND_RESPONSE = {404: {"description": "Menu item not found"}}


@router.get(
    "/items/{item_id}",
    summary="Get a single menu item by ID",
    description="Called by the order-service to validate items and fetch current prices.",
    responses=NOT_FOUND_RESPONSE,  # S8415 fix: document 404 in responses
)
async def get_menu_item(item_id: str):
    """
    GET /menu/items/:id
    Returns the item with price and isAvailable flag.
    Returns 404 if not found — order-service uses this to reject invalid items.
    """
    try:
        object_id = ObjectId(item_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail=_ITEM_NOT_FOUND)

    doc = await menu_items_collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=404, detail=_ITEM_NOT_FOUND)

    return {
        "id": str(doc["_id"]),
        "restaurantId": doc["restaurantId"],
        "name": doc["name"],
        "description": doc.get("description"),
        "price": doc["price"],
        "category": doc["category"],
        "isAvailable": doc.get("isAvailable", True),
    }
