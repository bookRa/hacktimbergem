"""Domain models package.

Exports all entity models, concepts, relationships, and value objects.
"""

from .value_objects import (
    BoundingBox,
    StatusLiteral,
    MissingValidation,
    ValidationInfo,
    RenderMeta,
)

from .entities import (
    BaseVisualEntity,
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
    EntityUnion,
    CreateEntityBase,
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
    CreateEntityUnion,
)

from .concepts import (
    BaseConcept,
    Space,
    ConceptUnion,
    CreateSpace,
    CreateConceptUnion,
)

from .relationships import (
    Relationship,
    CreateRelationship,
    ALLOWED_RELATIONSHIPS,
)

__all__ = [
    # Value objects
    "BoundingBox",
    "StatusLiteral",
    "MissingValidation",
    "ValidationInfo",
    "RenderMeta",
    # Entities
    "BaseVisualEntity",
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
    # Concepts
    "BaseConcept",
    "Space",
    "ConceptUnion",
    "CreateSpace",
    "CreateConceptUnion",
    # Relationships
    "Relationship",
    "CreateRelationship",
    "ALLOWED_RELATIONSHIPS",
]



