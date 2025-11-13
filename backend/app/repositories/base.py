"""Base repository interface following the Repository pattern.

Repositories abstract persistence logic from business logic (use cases).
All concrete implementations must implement these interfaces.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic

T = TypeVar('T')


class IRepository(ABC, Generic[T]):
    """
    Generic repository interface for CRUD operations.
    
    Type parameter T represents the domain model (e.g., EntityUnion, ConceptUnion).
    """
    
    @abstractmethod
    def find_by_id(self, project_id: str, entity_id: str) -> Optional[T]:
        """
        Find a single item by its ID.
        
        Args:
            project_id: Project identifier
            entity_id: Entity/concept/link identifier
            
        Returns:
            The found item or None if not found
        """
        pass
    
    @abstractmethod
    def find_all(self, project_id: str) -> List[T]:
        """
        Find all items in a project.
        
        Args:
            project_id: Project identifier
            
        Returns:
            List of all items (may be empty)
        """
        pass
    
    @abstractmethod
    def save(self, project_id: str, item: T) -> T:
        """
        Save (create or update) an item.
        
        For new items, this should generate an ID if not present.
        For existing items, this should update in place.
        
        Args:
            project_id: Project identifier
            item: The item to save
            
        Returns:
            The saved item (with ID assigned if new)
        """
        pass
    
    @abstractmethod
    def delete(self, project_id: str, entity_id: str) -> bool:
        """
        Delete an item by ID.
        
        Args:
            project_id: Project identifier
            entity_id: Item identifier
            
        Returns:
            True if deleted, False if not found
        """
        pass


__all__ = ["IRepository"]



