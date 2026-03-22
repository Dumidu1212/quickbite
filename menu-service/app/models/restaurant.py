# app/models/restaurant.py
#
# CLEAN CODE: Models have a single responsibility — define the shape of data.
# Pydantic validates every field automatically:
#   - Wrong type → 422 Unprocessable Entity (FastAPI handles this for us)
#   - Missing required field → 422 with clear field-level error messages
#
# We use two model classes per resource — a pattern called "input/output separation":
#   RestaurantCreate  → what the client sends (POST body)
#   Restaurant        → what we send back (includes id, timestamps)
#
# This prevents accidentally exposing internal fields (like _id) and
# allows the response shape to differ from the stored shape.

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RestaurantCreate(BaseModel):
    """Data required to create a new restaurant."""
    name: str = Field(..., min_length=1, max_length=100)
    cuisine: str = Field(..., min_length=1, max_length=50)
    address: str = Field(..., min_length=1, max_length=200)
    imageUrl: Optional[str] = None
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    isOpen: bool = True


class Restaurant(BaseModel):
    """Full restaurant object returned in API responses."""
    id: str
    name: str
    cuisine: str
    address: str
    imageUrl: Optional[str] = None
    rating: float
    isOpen: bool
    createdAt: datetime

    class Config:
        # Allows the model to be built from a MongoDB document dict
        from_attributes = True
