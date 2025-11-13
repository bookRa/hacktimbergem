"""Conceptual domain models (non-visual entities).

Conceptual nodes like Space are not visually anchored.
They are defined by their relationships to visual entities or other conceptual nodes.

Note: Scope entity is in entities.py as it can be either conceptual or visual.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal, Union, Optional
import time


class BaseConcept(BaseModel):
    """Base class for conceptual (non-visual) entities."""
    id: str = Field(..., description="Server-assigned unique id")
    kind: str
    created_at: float = Field(default_factory=lambda: time.time())

    class Config:
        orm_mode = True


class Space(BaseConcept):
    """Physical or conceptual space (room, area, zone)."""
    kind: Literal["space"] = "space"
    name: str


# Future conceptual entities can be added here
# class Material(BaseConcept):
#     kind: Literal["material"] = "material"
#     name: str
#     properties: Optional[Dict[str, Any]] = None


ConceptUnion = Union[Space]  # Expand as needed


# ===== CREATE DTOs =====

class CreateSpace(BaseModel):
    """Create a conceptual space."""
    kind: Literal["space"]
    name: str


CreateConceptUnion = Union[CreateSpace]  # Expand as needed


__all__ = [
    "BaseConcept",
    "Space",
    "ConceptUnion",
    "CreateSpace",
    "CreateConceptUnion",
]



