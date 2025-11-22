"""Entity domain models for visual annotations on construction drawings.

Most entities with spatial representation must have source_sheet_number and bounding_box.
Page-anchored containers (legends, schedules, assembly groups, notes) may omit the
bounding box until grounded by a human or specialized detector. Bounding boxes are always
stored in unrotated PDF point space.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator
from typing import Literal, List, Union, Optional, Dict, Any, Annotated
from .value_objects import BoundingBox, StatusLiteral, ValidationInfo
import time


class BaseVisualEntity(BaseModel):
    """Base class for entities with spatial representation on sheets."""
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: str
    source_sheet_number: int = Field(..., ge=1)
    bounding_box: BoundingBox
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None

    class Config:
        orm_mode = True


class PageAnchoredEntity(BaseVisualEntity):
    """Base class for sheet-anchored entities that may lack a bounding box."""

    bounding_box: Optional[BoundingBox] = None


class Drawing(BaseVisualEntity):
    """Drawing viewport on a sheet."""
    entity_type: Literal["drawing"] = "drawing"
    title: str | None = None
    description: str | None = None


class Note(PageAnchoredEntity):
    """Text note or annotation block."""
    entity_type: Literal["note"] = "note"
    text: str | None = None


class Legend(PageAnchoredEntity):
    """Container for keynote legend entries."""
    entity_type: Literal["legend"] = "legend"
    title: str | None = None
    notes: str | None = None


class Schedule(PageAnchoredEntity):
    """Container for door/window/finish/equipment schedules."""
    entity_type: Literal["schedule"] = "schedule"
    title: str | None = None
    schedule_type: str | None = None  # e.g., "door", "window", "finish", "equipment"
    notes: str | None = None


class AssemblyGroup(PageAnchoredEntity):
    """Container for assembly details/callouts."""
    entity_type: Literal["assembly_group"] = "assembly_group"
    title: str | None = None
    notes: str | None = None


class LegendItem(BaseModel):
    """Individual keynote entry within a Legend."""
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["legend_item"] = "legend_item"
    legend_id: str = Field(..., description="Parent Legend container ID")
    symbol_text: str | None = None
    description: str | None = None
    notes: str | None = None
    
    # Optional spatial fields (for when the item has a specific bbox on the sheet)
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        return self
    
    class Config:
        orm_mode = True


class ScheduleItem(BaseModel):
    """Individual schedule row/entry within a Schedule."""
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["schedule_item"] = "schedule_item"
    schedule_id: str = Field(..., description="Parent Schedule container ID")
    mark: str | None = None  # e.g., "W1", "D2", "A"
    description: str | None = None
    notes: str | None = None
    specifications: Optional[Dict[str, Any]] = None
    drawing_id: Optional[str] = Field(None, description="Optional Drawing depicting this item")
    
    # Optional spatial fields
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        return self
    
    class Config:
        orm_mode = True


class Assembly(BaseModel):
    """Individual assembly detail within an AssemblyGroup."""
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["assembly"] = "assembly"
    assembly_group_id: str = Field(..., description="Parent AssemblyGroup container ID")
    code: str | None = None  # e.g., "W2A", "F1B"
    name: str | None = None
    description: str | None = None
    notes: str | None = None
    specifications: Optional[Dict[str, Any]] = None
    drawing_id: Optional[str] = Field(None, description="Optional Drawing depicting this assembly")
    
    # Optional spatial fields
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        return self
    
    class Config:
        orm_mode = True


class Scope(BaseModel):
    """Scope can be conceptual (no bbox) or canvas-based (with bbox).
    
    Conceptual scopes are project-level requirements without spatial representation.
    Canvas scopes are area-specific annotations on sheets.
    """
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
    
    # Optional spatial fields (required for canvas scopes, null for conceptual)
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency, and that conceptual scopes have meaningful content."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        name = self.name
        desc = self.description
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        # If neither bbox nor meaningful text, reject
        if bbox is None and not name and not desc:
            raise ValueError("name or description required for conceptual scopes (scopes without bounding box)")
        
        return self
    
    class Config:
        orm_mode = True


class SymbolDefinition(BaseVisualEntity):
    """Definition of a symbol (visual pattern) in a legend."""
    entity_type: Literal["symbol_definition"] = "symbol_definition"
    name: str
    description: Optional[str] = None
    visual_pattern_description: Optional[str] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class ComponentDefinition(BaseVisualEntity):
    """Definition of a component in a schedule."""
    entity_type: Literal["component_definition"] = "component_definition"
    name: str
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    scope: Literal["project", "sheet"] = "sheet"
    defined_in_id: Optional[str] = None


class SymbolInstance(BaseModel):
    """Symbol instance can be conceptual (no bbox) or canvas-based (with bbox).
    
    Conceptual instances exist in project scope without spatial location.
    Canvas instances are placed on specific sheets within drawings.
    
    SymbolDefinition provides visual/conceptual definition (shape, general meaning).
    Definition item (Assembly/ScheduleItem/LegendItem) provides specific meaning.
    """
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["symbol_instance"] = "symbol_instance"
    symbol_definition_id: str
    recognized_text: Optional[str] = None
    
    # Link to specific definition item (what this symbol actually represents)
    definition_item_id: Optional[str] = Field(None, description="ID of Assembly/ScheduleItem/LegendItem")
    definition_item_type: Optional[Literal["assembly", "schedule_item", "legend_item"]] = None
    
    # Optional spatial fields (required for canvas instances, null for conceptual)
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    instantiated_in_id: Optional[str] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        # If definition_item_id is provided, definition_item_type must also be provided
        if self.definition_item_id is not None and self.definition_item_type is None:
            raise ValueError("definition_item_type required when definition_item_id is provided")
        if self.definition_item_type is not None and self.definition_item_id is None:
            raise ValueError("definition_item_id required when definition_item_type is provided")
        
        return self
    
    class Config:
        orm_mode = True


class ComponentInstance(BaseModel):
    """Component instance can be conceptual (no bbox) or canvas-based (with bbox).
    
    Conceptual instances exist in project scope without spatial location.
    Canvas instances are placed on specific sheets within drawings.
    """
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["component_instance"] = "component_instance"
    component_definition_id: str
    
    # Optional spatial fields (required for canvas instances, null for conceptual)
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    instantiated_in_id: Optional[str] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @model_validator(mode='after')
    def _validate_bbox_sheet_consistency(self):  # type: ignore
        """Ensure bbox and sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox exists, sheet must exist
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        return self
    
    class Config:
        orm_mode = True


# Union type for all entities
EntityUnion = Union[
    Drawing,
    Legend,
    LegendItem,
    Schedule,
    ScheduleItem,
    AssemblyGroup,
    Assembly,
    Note,
    Scope,
    SymbolDefinition,
    ComponentDefinition,
    SymbolInstance,
    ComponentInstance,
]


# ===== CREATE DTOs (Data Transfer Objects) =====

class CreateEntityBase(BaseModel):
    """Base for entity creation payloads."""
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None


class CreatePageAnchoredEntityBase(CreateEntityBase):
    """Base payload for entities that can be page-scoped."""

    source_sheet_number: int
    bounding_box: Optional[List[float]] = None

    @model_validator(mode="after")
    def _validate_bbox(self):  # type: ignore
        bbox = self.bounding_box
        if bbox is not None:
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        return self


class CreateDrawing(CreateEntityBase):
    entity_type: Literal["drawing"]
    source_sheet_number: int
    bounding_box: List[float]
    title: str | None = None
    description: str | None = None


class CreateLegend(CreatePageAnchoredEntityBase):
    entity_type: Literal["legend"]
    title: str | None = None
    notes: str | None = None


class CreateLegendItem(CreateEntityBase):
    """Create a legend item - can have optional bbox."""
    entity_type: Literal["legend_item"]
    legend_id: str
    symbol_text: str | None = None
    description: str | None = None
    notes: str | None = None
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        return self


class CreateSchedule(CreatePageAnchoredEntityBase):
    entity_type: Literal["schedule"]
    title: str | None = None
    schedule_type: str | None = None
    notes: str | None = None


class CreateScheduleItem(CreateEntityBase):
    """Create a schedule item - can have optional bbox."""
    entity_type: Literal["schedule_item"]
    schedule_id: str
    mark: str | None = None
    description: str | None = None
    notes: str | None = None
    specifications: Optional[Dict[str, Any]] = None
    drawing_id: Optional[str] = None
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        return self


class CreateAssemblyGroup(CreatePageAnchoredEntityBase):
    entity_type: Literal["assembly_group"]
    title: str | None = None
    notes: str | None = None


class CreateAssembly(CreateEntityBase):
    """Create an assembly - can have optional bbox."""
    entity_type: Literal["assembly"]
    assembly_group_id: str
    code: str | None = None
    name: str | None = None
    description: str | None = None
    notes: str | None = None
    specifications: Optional[Dict[str, Any]] = None
    drawing_id: Optional[str] = None
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        return self


class CreateNote(CreatePageAnchoredEntityBase):
    entity_type: Literal["note"]
    text: str | None = None


class CreateScope(CreateEntityBase):
    """Create a scope - can be conceptual (no bbox) or canvas-based (with bbox)."""
    entity_type: Literal["scope"]
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    name: str | None = None
    description: str | None = None
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency and ensure meaningful content."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        name = self.name
        desc = self.description
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        # If neither bbox nor text content, reject
        if bbox is None and not name and not desc:
            raise ValueError("name or description required for conceptual scopes (scopes without bounding box)")
        
        return self


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
    """Create a symbol instance - can be conceptual (no bbox) or canvas-based (with bbox)."""
    entity_type: Literal["symbol_instance"]
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    symbol_definition_id: str
    recognized_text: Optional[str] = None
    definition_item_id: Optional[str] = None
    definition_item_type: Optional[Literal["assembly", "schedule_item", "legend_item"]] = None
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency and definition item consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        # If definition_item_id is provided, definition_item_type must also be provided
        if self.definition_item_id is not None and self.definition_item_type is None:
            raise ValueError("definition_item_type required when definition_item_id is provided")
        if self.definition_item_type is not None and self.definition_item_id is None:
            raise ValueError("definition_item_id required when definition_item_type is provided")
        
        return self


class CreateComponentInstance(CreateEntityBase):
    """Create a component instance - can be conceptual (no bbox) or canvas-based (with bbox)."""
    entity_type: Literal["component_instance"]
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    component_definition_id: str
    
    @model_validator(mode='after')
    def _validate_consistency(self):  # type: ignore
        """Validate bbox/sheet consistency."""
        bbox = self.bounding_box
        sheet = self.source_sheet_number
        
        # If bbox provided, sheet must also be provided
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have exactly 4 values [x1, y1, x2, y2]")
        
        return self


# Discriminated union for creation payloads
CreateEntityUnion = Annotated[
    Union[
        CreateDrawing,
        CreateLegend,
        CreateLegendItem,
        CreateSchedule,
        CreateScheduleItem,
        CreateAssemblyGroup,
        CreateAssembly,
        CreateNote,
        CreateScope,
        CreateSymbolDefinition,
        CreateComponentDefinition,
        CreateSymbolInstance,
        CreateComponentInstance,
    ],
    Field(discriminator='entity_type')
]


__all__ = [
    # Value objects (re-exported for convenience)
    "BoundingBox",
    "StatusLiteral",
    "ValidationInfo",
    # Base
    "BaseVisualEntity",
    # Entities
    "Drawing",
    "Legend",
    "LegendItem",
    "Schedule",
    "ScheduleItem",
    "AssemblyGroup",
    "Assembly",
    "Note",
    "Scope",
    "SymbolDefinition",
    "ComponentDefinition",
    "SymbolInstance",
    "ComponentInstance",
    "EntityUnion",
    # Create DTOs
    "CreateEntityBase",
    "CreateDrawing",
    "CreateLegend",
    "CreateLegendItem",
    "CreateSchedule",
    "CreateScheduleItem",
    "CreateAssemblyGroup",
    "CreateAssembly",
    "CreateNote",
    "CreateScope",
    "CreateSymbolDefinition",
    "CreateComponentDefinition",
    "CreateSymbolInstance",
    "CreateComponentInstance",
    "CreateEntityUnion",
]



