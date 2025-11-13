"""Relationship models for the knowledge graph.

Relationships (edges) connect entities and concepts according to the PRD schema.
Examples: JUSTIFIED_BY, LOCATED_IN, DEPICTS.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal, Set, Tuple, Dict
import time


class Relationship(BaseModel):
    """A directed relationship (edge) in the knowledge graph."""
    id: str = Field(..., description="Server-assigned unique id")
    rel_type: Literal["JUSTIFIED_BY", "LOCATED_IN", "DEPICTS"]
    source_id: str
    target_id: str
    created_at: float = Field(default_factory=lambda: time.time())

    class Config:
        orm_mode = True


class CreateRelationship(BaseModel):
    """Create a new relationship."""
    rel_type: Literal["JUSTIFIED_BY", "LOCATED_IN", "DEPICTS"]
    source_id: str
    target_id: str


# Allowed relationship pairs per PRD (initial subset)
# Map: rel_type -> (allowed_source_kinds, allowed_target_kinds)
# Visual entities do not have a `kind`, they have `entity_type`. For validation
# we will treat their kind as that entity_type string.
ALLOWED_RELATIONSHIPS: Dict[str, Tuple[Set[str], Set[str]]] = {
    "JUSTIFIED_BY": (
        {"scope"},  # source: scope
        {"note", "symbol_instance", "component_instance"}  # target: evidence
    ),
    "LOCATED_IN": (
        {"symbol_instance", "component_instance"},  # source: instances
        {"space"}  # target: conceptual space
    ),
    "DEPICTS": (
        {"drawing"},  # source: drawing viewport
        {"space"}  # target: conceptual space
    ),
}


__all__ = [
    "Relationship",
    "CreateRelationship",
    "ALLOWED_RELATIONSHIPS",
]



