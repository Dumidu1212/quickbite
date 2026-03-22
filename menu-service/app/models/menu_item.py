# app/models/menu_item.py
#
# MenuItem models — same input/output separation pattern as Restaurant.
# NOTE: price uses float here. In a real financial system we'd use
# Python's Decimal type. For this prototype float is sufficient.

from pydantic import BaseModel, Field
from typing import Optional


class MenuItemCreate(BaseModel):
    """Data required to create a new menu item."""
    restaurantId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    price: float = Field(..., gt=0)    # gt=0 means price must be > 0
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

    class Config:
        from_attributes = True
