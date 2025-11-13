"""Entity repository interface.

Defines operations for managing visual and conceptual entities.
"""

from abc import abstractmethod
from typing import List
from .base import IRepository
from app.domain.models import EntityUnion


class IEntityRepository(IRepository[EntityUnion]):
    """
    Repository interface for entity operations.
    
    Extends base repository with entity-specific query methods.
    """
    
    @abstractmethod
    def find_by_sheet(self, project_id: str, sheet_number: int) -> List[EntityUnion]:
        """
        Find all entities on a specific sheet.
        
        Args:
            project_id: Project identifier
            sheet_number: Sheet number (1-based)
            
        Returns:
            List of entities on the sheet (may be empty)
        """
        pass
    
    @abstractmethod
    def find_by_type(self, project_id: str, entity_type: str) -> List[EntityUnion]:
        """
        Find all entities of a specific type.
        
        Args:
            project_id: Project identifier
            entity_type: Entity type (e.g., 'drawing', 'note', 'symbol_instance')
            
        Returns:
            List of entities of that type (may be empty)
        """
        pass
    
    @abstractmethod
    def find_by_parent(self, project_id: str, parent_id: str) -> List[EntityUnion]:
        """
        Find all child entities of a parent container.
        
        For example:
        - LegendItems with legend_id = parent_id
        - ScheduleItems with schedule_id = parent_id
        - Assemblies with assembly_group_id = parent_id
        
        Args:
            project_id: Project identifier
            parent_id: Parent entity ID
            
        Returns:
            List of child entities (may be empty)
        """
        pass


__all__ = ["IEntityRepository"]



