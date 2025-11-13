"""File-based link (relationship) repository implementation.

Stores relationships as JSON array in projects/{project_id}/links.json.
"""

from typing import List, Optional
import os
from app.repositories.link_repository import ILinkRepository
from app.domain.models import Relationship
from app.services.storage.file_storage import atomic_write_json, read_json_or_empty


class FileLinkRepository(ILinkRepository):
    """File-based implementation of link repository."""
    
    def __init__(self, base_dir: str = "projects"):
        """
        Initialize repository.
        
        Args:
            base_dir: Base directory for project storage
        """
        self.base_dir = base_dir
    
    def _links_path(self, project_id: str) -> str:
        """Get path to links.json file."""
        return os.path.join(self.base_dir, project_id, "links.json")
    
    def _load_raw(self, project_id: str) -> List[dict]:
        """Load raw link dicts from file."""
        path = self._links_path(project_id)
        return read_json_or_empty(path, default=[])
    
    def _save_raw(self, project_id: str, links: List[dict]) -> None:
        """Save raw link dicts to file."""
        project_path = os.path.join(self.base_dir, project_id)
        os.makedirs(project_path, exist_ok=True)
        path = self._links_path(project_id)
        atomic_write_json(path, links)
    
    def _deserialize(self, raw: dict) -> Optional[Relationship]:
        """Deserialize a raw dict into a Relationship model."""
        try:
            return Relationship(**raw)
        except Exception:
            return None
    
    def _serialize(self, link: Relationship) -> dict:
        """Serialize a Relationship model to dict."""
        return link.dict()
    
    def find_by_id(self, project_id: str, link_id: str) -> Optional[Relationship]:
        """Find link by ID."""
        raw_links = self._load_raw(project_id)
        
        for raw in raw_links:
            if raw.get("id") == link_id:
                return self._deserialize(raw)
        
        return None
    
    def find_all(self, project_id: str) -> List[Relationship]:
        """Find all links in project."""
        raw_links = self._load_raw(project_id)
        links = []
        
        for raw in raw_links:
            link = self._deserialize(raw)
            if link:
                links.append(link)
        
        return links
    
    def save(self, project_id: str, link: Relationship) -> Relationship:
        """Save (create or update) a link."""
        raw_links = self._load_raw(project_id)
        link_dict = self._serialize(link)
        link_id = link_dict["id"]
        
        # Check if link already exists (update case)
        found_index = None
        for i, raw in enumerate(raw_links):
            if raw.get("id") == link_id:
                found_index = i
                break
        
        if found_index is not None:
            # Update existing
            raw_links[found_index] = link_dict
        else:
            # Create new
            raw_links.append(link_dict)
        
        self._save_raw(project_id, raw_links)
        return link
    
    def delete(self, project_id: str, link_id: str) -> bool:
        """Delete link by ID."""
        raw_links = self._load_raw(project_id)
        original_count = len(raw_links)
        
        # Filter out the link to delete
        filtered = [l for l in raw_links if l.get("id") != link_id]
        
        if len(filtered) == original_count:
            # Link not found
            return False
        
        self._save_raw(project_id, filtered)
        return True
    
    def find_by_source(self, project_id: str, source_id: str) -> List[Relationship]:
        """Find all links where the given entity is the source."""
        all_links = self.find_all(project_id)
        return [l for l in all_links if l.source_id == source_id]
    
    def find_by_target(self, project_id: str, target_id: str) -> List[Relationship]:
        """Find all links where the given entity is the target."""
        all_links = self.find_all(project_id)
        return [l for l in all_links if l.target_id == target_id]
    
    def find_by_type(self, project_id: str, rel_type: str) -> List[Relationship]:
        """Find all links of a specific type."""
        all_links = self.find_all(project_id)
        return [l for l in all_links if l.rel_type == rel_type]
    
    def find_specific(
        self,
        project_id: str,
        source_id: Optional[str] = None,
        target_id: Optional[str] = None,
        rel_type: Optional[str] = None
    ) -> List[Relationship]:
        """Find links matching specific criteria."""
        all_links = self.find_all(project_id)
        result = []
        
        for link in all_links:
            # Apply filters
            if source_id and link.source_id != source_id:
                continue
            if target_id and link.target_id != target_id:
                continue
            if rel_type and link.rel_type != rel_type:
                continue
            
            result.append(link)
        
        return result


__all__ = ["FileLinkRepository"]



