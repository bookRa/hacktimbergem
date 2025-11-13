"""Link (relationship) repository interface.

Defines operations for managing relationships between entities and concepts.
"""

from abc import abstractmethod
from typing import List, Optional
from .base import IRepository
from app.domain.models import Relationship


class ILinkRepository(IRepository[Relationship]):
    """
    Repository interface for relationship/link operations.
    
    Extends base repository with relationship-specific query methods.
    """
    
    @abstractmethod
    def find_by_source(self, project_id: str, source_id: str) -> List[Relationship]:
        """
        Find all relationships where the given entity is the source.
        
        Args:
            project_id: Project identifier
            source_id: Source entity/concept ID
            
        Returns:
            List of outgoing relationships (may be empty)
        """
        pass
    
    @abstractmethod
    def find_by_target(self, project_id: str, target_id: str) -> List[Relationship]:
        """
        Find all relationships where the given entity is the target.
        
        Args:
            project_id: Project identifier
            target_id: Target entity/concept ID
            
        Returns:
            List of incoming relationships (may be empty)
        """
        pass
    
    @abstractmethod
    def find_by_type(self, project_id: str, rel_type: str) -> List[Relationship]:
        """
        Find all relationships of a specific type.
        
        Args:
            project_id: Project identifier
            rel_type: Relationship type (e.g., 'JUSTIFIED_BY', 'LOCATED_IN')
            
        Returns:
            List of relationships of that type (may be empty)
        """
        pass
    
    @abstractmethod
    def find_specific(
        self,
        project_id: str,
        source_id: Optional[str] = None,
        target_id: Optional[str] = None,
        rel_type: Optional[str] = None
    ) -> List[Relationship]:
        """
        Find relationships matching specific criteria.
        
        All parameters are optional; only non-None parameters are used as filters.
        
        Args:
            project_id: Project identifier
            source_id: Optional source filter
            target_id: Optional target filter
            rel_type: Optional type filter
            
        Returns:
            List of matching relationships (may be empty)
        """
        pass


__all__ = ["ILinkRepository"]



