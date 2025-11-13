"""List entities use case.

Handles querying entities with various filters.
"""

from typing import List, Optional
from app.domain.models import EntityUnion
from app.repositories.entity_repository import IEntityRepository


class ListEntitiesUseCase:
    """
    Use case for listing/querying entities.
    
    Provides unified interface for entity queries.
    """
    
    def __init__(self, entity_repo: IEntityRepository):
        """
        Initialize use case.
        
        Args:
            entity_repo: Entity repository
        """
        self.entity_repo = entity_repo
    
    def execute(
        self,
        project_id: str,
        sheet_number: Optional[int] = None,
        entity_type: Optional[str] = None,
        parent_id: Optional[str] = None
    ) -> List[EntityUnion]:
        """
        List entities with optional filters.
        
        Args:
            project_id: Project identifier
            sheet_number: Optional filter by sheet number
            entity_type: Optional filter by entity type
            parent_id: Optional filter by parent ID
            
        Returns:
            List of matching entities
        """
        # Apply filters
        if sheet_number is not None:
            return self.entity_repo.find_by_sheet(project_id, sheet_number)
        elif entity_type is not None:
            return self.entity_repo.find_by_type(project_id, entity_type)
        elif parent_id is not None:
            return self.entity_repo.find_by_parent(project_id, parent_id)
        else:
            return self.entity_repo.find_all(project_id)


__all__ = ["ListEntitiesUseCase"]



