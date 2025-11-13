"""Create concept use case.

Handles concept creation with validation and persistence.
"""

import uuid
from app.domain.models import CreateConceptUnion, ConceptUnion, Space
from app.repositories.concept_repository import IConceptRepository


class CreateConceptUseCase:
    """
    Use case for creating concepts (conceptual entities like Space).
    
    Simpler than entity creation as concepts don't have spatial relationships.
    """
    
    def __init__(self, concept_repo: IConceptRepository):
        """
        Initialize use case.
        
        Args:
            concept_repo: Concept repository for persistence
        """
        self.concept_repo = concept_repo
    
    def execute(self, project_id: str, payload: CreateConceptUnion) -> ConceptUnion:
        """
        Create a new concept.
        
        Args:
            project_id: Project identifier
            payload: Concept creation payload
            
        Returns:
            Created concept with assigned ID
        """
        new_id = uuid.uuid4().hex
        
        # Build concept based on kind
        if payload.kind == "space":
            concept = Space(
                id=new_id,
                name=getattr(payload, "name")
            )
        else:
            raise ValueError(f"Unsupported concept kind: {payload.kind}")
        
        # Persist
        return self.concept_repo.save(project_id, concept)


__all__ = ["CreateConceptUseCase"]



