"""Update concept use case.

Handles concept updates with validation.
"""

from typing import Dict, Any
from app.domain.models import ConceptUnion
from app.repositories.concept_repository import IConceptRepository


class UpdateConceptUseCase:
    """Use case for updating concepts."""
    
    def __init__(self, concept_repo: IConceptRepository):
        """
        Initialize use case.
        
        Args:
            concept_repo: Concept repository
        """
        self.concept_repo = concept_repo
    
    def execute(
        self,
        project_id: str,
        concept_id: str,
        updates: Dict[str, Any]
    ) -> ConceptUnion:
        """
        Update a concept.
        
        Args:
            project_id: Project identifier
            concept_id: Concept identifier
            updates: Dictionary of fields to update
            
        Returns:
            Updated concept
            
        Raises:
            ValueError: If concept not found
        """
        # Load concept
        concept = self.concept_repo.find_by_id(project_id, concept_id)
        if not concept:
            raise ValueError(f"Concept with id '{concept_id}' not found")
        
        # Apply updates
        data = concept.dict()
        kind = data["kind"]
        
        if kind == "space":
            if "name" in updates:
                data["name"] = updates["name"]
        # Add other concept kinds here as needed
        
        # Reconstruct and persist
        concept_cls = type(concept)
        updated = concept_cls(**data)
        return self.concept_repo.save(project_id, updated)


__all__ = ["UpdateConceptUseCase"]



