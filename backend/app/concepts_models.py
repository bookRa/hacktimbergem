"""Pydantic models for conceptual nodes and relationships (graph edges).

Conceptual nodes are not visually anchored; they are defined by relationships
to visual entities or other conceptual nodes. Relationships (links) encode the
knowledge graph edges according to the PRD schema.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, validator
from typing import Literal, Union, Optional
import time


class BaseConcept(BaseModel):
    id: str = Field(..., description="Server-assigned unique id")
    kind: str
    created_at: float = Field(default_factory=lambda: time.time())

    class Config:
        orm_mode = True


class Space(BaseConcept):
    kind: Literal["space"] = "space"
    name: str


class Scope(BaseConcept):
    kind: Literal["scope"] = "scope"
    description: str
    category: Optional[str] = None


ConceptUnion = Union[Space, Scope]


class CreateSpace(BaseModel):
    kind: Literal["space"]
    name: str


class CreateScope(BaseModel):
    kind: Literal["scope"]
    description: str
    category: Optional[str] = None


CreateConceptUnion = Union[CreateSpace, CreateScope]


class Relationship(BaseModel):
    id: str = Field(..., description="Server-assigned unique id")
    rel_type: Literal["JUSTIFIED_BY", "LOCATED_IN", "DEPICTS"]
    source_id: str
    target_id: str
    created_at: float = Field(default_factory=lambda: time.time())


class CreateRelationship(BaseModel):
    rel_type: Literal["JUSTIFIED_BY", "LOCATED_IN", "DEPICTS"]
    source_id: str
    target_id: str


__all__ = [
    "BaseConcept",
    "Space",
    "Scope",
    "ConceptUnion",
    "CreateSpace",
    "CreateScope",
    "CreateConceptUnion",
    "Relationship",
    "CreateRelationship",
]


