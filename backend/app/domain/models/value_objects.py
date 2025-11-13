"""Value objects for the domain layer.

Value objects are immutable objects defined by their attributes rather than identity.
They include BoundingBox, ValidationInfo, and other shared data structures.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
import time


class BoundingBox(BaseModel):
    """
    Bounding box in PDF point space (unrotated).
    Origin: top-left, y increases downward.
    Invariant: x2 > x1 and y2 > y1.
    """
    x1: float
    y1: float
    x2: float
    y2: float

    @validator("x1", "y1", "x2", "y2", pre=True)
    def _coerce_float(cls, v):  # type: ignore
        if isinstance(v, (int, float)):
            return float(v)
        raise ValueError("Coordinate must be a number")

    @validator("x2")
    def _check_x(cls, v, values):  # type: ignore
        x1 = values.get("x1")
        if x1 is not None and v <= x1:
            raise ValueError("x2 must be > x1")
        return v

    @validator("y2")
    def _check_y(cls, v, values):  # type: ignore
        y1 = values.get("y1")
        if y1 is not None and v <= y1:
            raise ValueError("y2 must be > y1")
        return v

    def as_list(self) -> List[float]:
        """Convert to [x1, y1, x2, y2] list format."""
        return [self.x1, self.y1, self.x2, self.y2]

    class Config:
        frozen = True  # Value objects should be immutable


StatusLiteral = Literal["incomplete", "complete"]


class MissingValidation(BaseModel):
    """Validation info for tracking missing required relationships."""
    drawing: Optional[bool] = None
    definition: Optional[bool] = None
    scope: Optional[bool] = None

    class Config:
        frozen = True


class ValidationInfo(BaseModel):
    """Validation information for entities."""
    missing: Optional[MissingValidation] = None

    class Config:
        frozen = True


class RenderMeta(BaseModel):
    """Metadata about a rendered page for coordinate transformations."""
    page_width_pts: float
    page_height_pts: float
    raster_width_px: int
    raster_height_px: int
    rotation: int = 0  # degrees, expected in {0, 90, 180, 270}

    @property
    def scale_x(self) -> float:
        return self.raster_width_px / self.page_width_pts

    @property
    def scale_y(self) -> float:
        return self.raster_height_px / self.page_height_pts

    class Config:
        frozen = True


__all__ = [
    "BoundingBox",
    "StatusLiteral",
    "MissingValidation",
    "ValidationInfo",
    "RenderMeta",
]



