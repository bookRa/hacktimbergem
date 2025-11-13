"""Repository layer - Interface Adapters for persistence.

Defines abstract interfaces for data access. Concrete implementations
are in the implementations/ subdirectory.
"""

from .base import IRepository
from .entity_repository import IEntityRepository
from .concept_repository import IConceptRepository
from .link_repository import ILinkRepository
from .project_repository import IProjectRepository

__all__ = [
    "IRepository",
    "IEntityRepository",
    "IConceptRepository",
    "ILinkRepository",
    "IProjectRepository",
]



