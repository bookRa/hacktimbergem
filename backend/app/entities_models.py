"""Pydantic models for foundational visual entities (manual annotations).

All bounding boxes are stored in un-rotated PDF point space (x1,y1,x2,y2) with x1<x2, y1<y2.
The `entity_type` field is the discriminator enabling future extension.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, validator
from typing import Literal, List, Union, Optional, Dict, Any
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


StatusLiteral = Literal["incomplete", "complete"]


class MissingValidation(BaseModel):
    drawing: Optional[bool] = None
    definition: Optional[bool] = None
    scope: Optional[bool] = None


class ValidationInfo(BaseModel):
    missing: Optional[MissingValidation] = None


class BaseVisualEntity(BaseModel):
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: str
    source_sheet_number: int = Field(..., ge=1)
    bounding_box: BoundingBox
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None

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


class SymbolDefinition(BaseVisualEntity):
    entity_type: Literal["symbol_definition"] = "symbol_definition"
    name: str
    description: Optional[str] = None
    visual_pattern_description: Optional[str] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class ComponentDefinition(BaseVisualEntity):
    entity_type: Literal["component_definition"] = "component_definition"
    name: str
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class SymbolInstance(BaseVisualEntity):
    entity_type: Literal["symbol_instance"] = "symbol_instance"
    symbol_definition_id: str
    recognized_text: Optional[str] = None
    instantiated_in_id: Optional[str] = None


class ComponentInstance(BaseVisualEntity):
    entity_type: Literal["component_instance"] = "component_instance"
    component_definition_id: str
    instantiated_in_id: Optional[str] = None


EntityUnion = Union[
    Drawing,
    Legend,
    Schedule,
    Note,
    SymbolDefinition,
    ComponentDefinition,
    SymbolInstance,
    ComponentInstance,
]


class CreateEntityBase(BaseModel):
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None


class CreateDrawing(CreateEntityBase):
    entity_type: Literal["drawing"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateLegend(CreateEntityBase):
    entity_type: Literal["legend"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateSchedule(CreateEntityBase):
    entity_type: Literal["schedule"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None


class CreateNote(CreateEntityBase):
    entity_type: Literal["note"]
    source_sheet_number: int
    bounding_box: List[float]
    text: str | None = None


class CreateSymbolDefinition(CreateEntityBase):
    entity_type: Literal["symbol_definition"]
    source_sheet_number: int
    bounding_box: List[float]
    name: str
    description: Optional[str] = None
    visual_pattern_description: Optional[str] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class CreateComponentDefinition(CreateEntityBase):
    entity_type: Literal["component_definition"]
    source_sheet_number: int
    bounding_box: List[float]
    name: str
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class CreateSymbolInstance(CreateEntityBase):
    entity_type: Literal["symbol_instance"]
    source_sheet_number: int
    bounding_box: List[float]
    symbol_definition_id: str
    recognized_text: Optional[str] = None


class CreateComponentInstance(CreateEntityBase):
    entity_type: Literal["component_instance"]
    source_sheet_number: int
    bounding_box: List[float]
    component_definition_id: str


CreateEntityUnion = Union[
    CreateDrawing,
    CreateLegend,
    CreateSchedule,
    CreateNote,
    CreateSymbolDefinition,
    CreateComponentDefinition,
    CreateSymbolInstance,
    CreateComponentInstance,
]

__all__ = [
    "BoundingBox",
    "BaseVisualEntity",
    "ValidationInfo",
    "MissingValidation",
    "StatusLiteral",
    "Drawing",
    "Legend",
    "Schedule",
    "Note",
    "SymbolDefinition",
    "ComponentDefinition",
    "SymbolInstance",
    "ComponentInstance",
    "EntityUnion",
    "CreateEntityUnion",
    "CreateDrawing",
    "CreateLegend",
    "CreateSchedule",
    "CreateNote",
    "CreateSymbolDefinition",
    "CreateComponentDefinition",
    "CreateSymbolInstance",
    "CreateComponentInstance",
]
