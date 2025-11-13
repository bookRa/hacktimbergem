"""Concept repository interface.

Defines operations for managing conceptual (non-visual) entities like Space.
"""

from abc import abstractmethod
from typing import List
from .base import IRepository
from app.domain.models import ConceptUnion


class IConceptRepository(IRepository[ConceptUnion]):
    """
    Repository interface for concept operations.
    
    Extends base repository with concept-specific query methods.
    """
    
    @abstractmethod
    def find_by_kind(self, project_id: str, kind: str) -> List[ConceptUnion]:
        """
        Find all concepts of a specific kind.
        
        Args:
            project_id: Project identifier
            kind: Concept kind (e.g., 'space', 'material')
            
        Returns:
            List of concepts of that kind (may be empty)
        """
        pass


__all__ = ["IConceptRepository"]



