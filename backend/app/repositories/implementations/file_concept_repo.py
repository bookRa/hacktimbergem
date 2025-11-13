"""File-based concept repository implementation.

Stores concepts as JSON array in projects/{project_id}/concepts.json.
"""

from typing import List, Optional
import os
from app.repositories.concept_repository import IConceptRepository
from app.domain.models import (
    ConceptUnion,
    Space,
)
from app.services.storage.file_storage import atomic_write_json, read_json_or_empty


class FileConceptRepository(IConceptRepository):
    """File-based implementation of concept repository."""
    
    # Map kind to model class
    KIND_MAP = {
        "space": Space,
    }
    
    def __init__(self, base_dir: str = "projects"):
        """
        Initialize repository.
        
        Args:
            base_dir: Base directory for project storage
        """
        self.base_dir = base_dir
    
    def _concepts_path(self, project_id: str) -> str:
        """Get path to concepts.json file."""
        return os.path.join(self.base_dir, project_id, "concepts.json")
    
    def _load_raw(self, project_id: str) -> List[dict]:
        """Load raw concept dicts from file."""
        path = self._concepts_path(project_id)
        return read_json_or_empty(path, default=[])
    
    def _save_raw(self, project_id: str, concepts: List[dict]) -> None:
        """Save raw concept dicts to file."""
        project_path = os.path.join(self.base_dir, project_id)
        os.makedirs(project_path, exist_ok=True)
        path = self._concepts_path(project_id)
        atomic_write_json(path, concepts)
    
    def _deserialize(self, raw: dict) -> Optional[ConceptUnion]:
        """Deserialize a raw dict into a concept model."""
        kind = raw.get("kind")
        model_cls = self.KIND_MAP.get(kind)
        
        if not model_cls:
            return None
        
        try:
            return model_cls(**raw)
        except Exception:
            return None
    
    def _serialize(self, concept: ConceptUnion) -> dict:
        """Serialize a concept model to dict."""
        return concept.dict()
    
    def find_by_id(self, project_id: str, concept_id: str) -> Optional[ConceptUnion]:
        """Find concept by ID."""
        raw_concepts = self._load_raw(project_id)
        
        for raw in raw_concepts:
            if raw.get("id") == concept_id:
                return self._deserialize(raw)
        
        return None
    
    def find_all(self, project_id: str) -> List[ConceptUnion]:
        """Find all concepts in project."""
        raw_concepts = self._load_raw(project_id)
        concepts = []
        
        for raw in raw_concepts:
            concept = self._deserialize(raw)
            if concept:
                concepts.append(concept)
        
        return concepts
    
    def save(self, project_id: str, concept: ConceptUnion) -> ConceptUnion:
        """Save (create or update) a concept."""
        raw_concepts = self._load_raw(project_id)
        concept_dict = self._serialize(concept)
        concept_id = concept_dict["id"]
        
        # Check if concept already exists (update case)
        found_index = None
        for i, raw in enumerate(raw_concepts):
            if raw.get("id") == concept_id:
                found_index = i
                break
        
        if found_index is not None:
            # Update existing
            raw_concepts[found_index] = concept_dict
        else:
            # Create new
            raw_concepts.append(concept_dict)
        
        self._save_raw(project_id, raw_concepts)
        return concept
    
    def delete(self, project_id: str, concept_id: str) -> bool:
        """Delete concept by ID."""
        raw_concepts = self._load_raw(project_id)
        original_count = len(raw_concepts)
        
        # Filter out the concept to delete
        filtered = [c for c in raw_concepts if c.get("id") != concept_id]
        
        if len(filtered) == original_count:
            # Concept not found
            return False
        
        self._save_raw(project_id, filtered)
        return True
    
    def find_by_kind(self, project_id: str, kind: str) -> List[ConceptUnion]:
        """Find all concepts of a specific kind."""
        all_concepts = self.find_all(project_id)
        result = []
        
        for concept in all_concepts:
            if getattr(concept, "kind", None) == kind:
                result.append(concept)
        
        return result


__all__ = ["FileConceptRepository"]



