# app/routers/menu_items.py
#
# Menu item endpoints.
# GET /menu/items/:id is the most important endpoint in this service
# because the ORDER SERVICE calls it during order creation to:
#   1. Verify the item exists
#   2. Get the current price (we never trust the price sent by the client)
#   3. Check isAvailable before accepting the order

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/menu", tags=["Menu Items"])


@router.get(
    "/items/{item_id}",
    summary="Get a single menu item by ID",
    description="Called by the order-service to validate items and fetch current prices.",
)
async def get_menu_item(item_id: str):
    """
    GET /menu/items/:id
    TODO (Sprint 2): fetch item from MongoDB, return with price and isAvailable
    """
    return JSONResponse(
        content={"message": "Not implemented yet"},
        status_code=501,
    )
