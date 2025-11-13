"""File-based project repository implementation.

Manages project manifest files (manifest.json).
"""

from typing import Optional, Dict, Any
import os
import time
from app.repositories.project_repository import IProjectRepository
from app.services.storage.file_storage import atomic_write_json, read_json, read_json_or_empty


class FileProjectRepository(IProjectRepository):
    """File-based implementation of project repository."""
    
    def __init__(self, base_dir: str = "projects"):
        """
        Initialize repository.
        
        Args:
            base_dir: Base directory for project storage
        """
        self.base_dir = base_dir
    
    def get_project_dir(self, project_id: str) -> str:
        """Get the filesystem path for project storage."""
        return os.path.join(self.base_dir, project_id)
    
    def _manifest_path(self, project_id: str) -> str:
        """Get path to manifest.json file."""
        return os.path.join(self.get_project_dir(project_id), "manifest.json")
    
    def find_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Find project manifest by ID."""
        path = self._manifest_path(project_id)
        
        if not os.path.exists(path):
            return None
        
        try:
            return read_json(path)
        except (IOError, ValueError):
            return None
    
    def create(self, project_id: str) -> Dict[str, Any]:
        """Initialize a new project with default manifest."""
        project_path = self.get_project_dir(project_id)
        os.makedirs(project_path, exist_ok=True)
        
        manifest = {
            "project_id": project_id,
            "status": "queued",
            "num_pages": None,
            "stages": {
                "render": {"done": 0, "total": 0},
                "ocr": {"done": 0, "total": 0}
            },
            "started_at": time.time(),
            "completed_at": None,
            "error": None,
            "page_titles": {},
        }
        
        atomic_write_json(self._manifest_path(project_id), manifest)
        return manifest
    
    def update(self, project_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update project manifest (partial update)."""
        manifest = self.find_by_id(project_id)
        
        if not manifest:
            raise ValueError(f"Project {project_id} not found")
        
        # Perform shallow merge
        for key, value in updates.items():
            if isinstance(value, dict) and key in manifest and isinstance(manifest[key], dict):
                # Nested dict: perform nested merge
                manifest[key].update(value)
            else:
                # Simple value: replace
                manifest[key] = value
        
        atomic_write_json(self._manifest_path(project_id), manifest)
        return manifest
    
    def exists(self, project_id: str) -> bool:
        """Check if project exists."""
        return os.path.exists(self._manifest_path(project_id))


__all__ = ["FileProjectRepository"]



