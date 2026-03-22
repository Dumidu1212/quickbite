# app/routers/restaurants.py
#
# Restaurant endpoints — STUB implementation.
# Routes are defined so the OpenAPI docs (/docs) show them,
# but handlers return 501 Not Implemented.
# Full implementation happens in Sprint 2.
#
# WHY STUBS MATTER:
# Having the routes defined now means:
#   1. OpenAPI spec is accurate for integration planning
#   2. Other services can test their calls will route correctly
#   3. The team can agree on the API contract before implementation

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.get(
    "/",
    summary="Get all restaurants",
    description="Returns a list of all restaurants. Supports filtering by cuisine.",
)
async def get_restaurants(cuisine: str = None):
    """
    GET /restaurants
    Optional query param: ?cuisine=italian
    TODO (Sprint 2): fetch from MongoDB with optional cuisine filter
    """
    return JSONResponse(
        content={"message": "Not implemented yet"},
        status_code=501,
    )


@router.get(
    "/{restaurant_id}",
    summary="Get a single restaurant",
)
async def get_restaurant(restaurant_id: str):
    """
    GET /restaurants/:id
    TODO (Sprint 2): fetch single restaurant by ID
    """
    return JSONResponse(
        content={"message": "Not implemented yet"},
        status_code=501,
    )


@router.get(
    "/{restaurant_id}/menu",
    summary="Get a restaurant's full menu",
    description="Returns all menu items grouped by category.",
)
async def get_restaurant_menu(restaurant_id: str):
    """
    GET /restaurants/:id/menu
    TODO (Sprint 2): fetch and group menu items for this restaurant
    """
    return JSONResponse(
        content={"message": "Not implemented yet"},
        status_code=501,
    )
