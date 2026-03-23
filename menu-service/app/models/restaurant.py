# app/models/restaurant.py
#
# Pydantic models define the shape of data going INTO and OUT OF the API.
# We use two models per resource:
#   RestaurantCreate  — what the client sends (no id, no timestamps)
#   Restaurant        — what we return  (includes id, timestamps)
#
# WHY TWO MODELS?
# This prevents accidentally exposing internal MongoDB fields (_id, __v)
# and lets the response shape differ from the stored shape safely.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class RestaurantCreate(BaseModel):
    """Data required to create a new restaurant — used in the seed script."""
    name: str = Field(..., min_length=1, max_length=100)
    cuisine: str = Field(..., min_length=1, max_length=50)
    address: str = Field(..., min_length=1, max_length=200)
    imageUrl: Optional[str] = None
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    isOpen: bool = True
    deliveryTime: Optional[str] = "30-45 min"
    minimumOrder: Optional[float] = 0.0


class Restaurant(BaseModel):
    """Full restaurant object returned in API responses."""
    id: str
    name: str
    cuisine: str
    address: str
    imageUrl: Optional[str] = None
    rating: float
    isOpen: bool
    deliveryTime: Optional[str] = None
    minimumOrder: Optional[float] = None

    # from_attributes allows building this model from a MongoDB dict
    model_config = ConfigDict(from_attributes=True)
