"""Pydantic models for foundational visual entities (manual annotations).

All bounding boxes are stored in un-rotated PDF point space (x1,y1,x2,y2) with x1<x2, y1<y2.
The `entity_type` field is the discriminator enabling future extension.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, validator
from typing import Literal, List, Union
import time


class BoundingBox(BaseModel):
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
        return [self.x1, self.y1, self.x2, self.y2]


class BaseVisualEntity(BaseModel):
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: str
    source_sheet_number: int = Field(..., ge=1)
    bounding_box: BoundingBox
    created_at: float = Field(default_factory=lambda: time.time())

    class Config:
        orm_mode = True


class Drawing(BaseVisualEntity):
    entity_type: Literal["drawing"] = "drawing"
    title: str | None = None


class Legend(BaseVisualEntity):
    entity_type: Literal["legend"] = "legend"
    title: str | None = None


class Schedule(BaseVisualEntity):
    entity_type: Literal["schedule"] = "schedule"
    title: str | None = None


class Note(BaseVisualEntity):
    entity_type: Literal["note"] = "note"
    text: str | None = None


EntityUnion = Union[Drawing, Legend, Schedule, Note]


class CreateDrawing(BaseModel):
    entity_type: Literal["drawing"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateLegend(BaseModel):
    entity_type: Literal["legend"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateSchedule(BaseModel):
    entity_type: Literal["schedule"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateNote(BaseModel):
    entity_type: Literal["note"]
    source_sheet_number: int
    bounding_box: List[float]
    text: str | None = None


CreateEntityUnion = Union[CreateDrawing, CreateLegend, CreateSchedule, CreateNote]

__all__ = [
    "BoundingBox",
    "BaseVisualEntity",
    "Drawing",
    "Legend",
    "Schedule",
    "Note",
    "EntityUnion",
    "CreateEntityUnion",
    "CreateDrawing",
    "CreateLegend",
    "CreateSchedule",
    "CreateNote",
]
