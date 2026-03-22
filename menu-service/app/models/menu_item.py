# app/models/menu_item.py
#
# MenuItem models.
# The GET /menu/items/:id endpoint is the most important one here —
# it is called by the ORDER SERVICE during order creation to:
#   1. Verify the item actually exists
#   2. Get the CURRENT price (we never trust the client-sent price)
#   3. Check isAvailable before accepting the order

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class MenuItemCreate(BaseModel):
    """Data required to create a menu item — used in the seed script."""
    restaurantId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    price: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=50)
    isAvailable: bool = True


class MenuItem(BaseModel):
    """Full menu item returned in API responses."""
    id: str
    restaurantId: str
    name: str
    description: Optional[str] = None
    price: float
    category: str
    isAvailable: bool

    model_config = ConfigDict(from_attributes=True)
