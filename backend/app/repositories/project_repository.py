"""Project repository interface.

Defines operations for managing project metadata (manifest).
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class IProjectRepository(ABC):
    """
    Repository interface for project/manifest operations.
    
    Manages project metadata including ingestion status, progress, and page titles.
    """
    
    @abstractmethod
    def find_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Find project manifest by ID.
        
        Args:
            project_id: Project identifier
            
        Returns:
            Manifest dictionary or None if not found
        """
        pass
    
    @abstractmethod
    def create(self, project_id: str) -> Dict[str, Any]:
        """
        Initialize a new project with default manifest.
        
        Args:
            project_id: Project identifier
            
        Returns:
            Initialized manifest dictionary
        """
        pass
    
    @abstractmethod
    def update(self, project_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update project manifest (partial update).
        
        Performs a shallow merge of updates into existing manifest.
        For nested dictionaries (like stages), performs nested merge.
        
        Args:
            project_id: Project identifier
            updates: Dictionary of fields to update
            
        Returns:
            Updated manifest dictionary
            
        Raises:
            ValueError: If project not found
        """
        pass
    
    @abstractmethod
    def exists(self, project_id: str) -> bool:
        """
        Check if project exists.
        
        Args:
            project_id: Project identifier
            
        Returns:
            True if project exists, False otherwise
        """
        pass
    
    @abstractmethod
    def get_project_dir(self, project_id: str) -> str:
        """
        Get the filesystem path for project storage.
        
        Args:
            project_id: Project identifier
            
        Returns:
            Absolute path to project directory
        """
        pass


__all__ = ["IProjectRepository"]



