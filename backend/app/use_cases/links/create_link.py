"""Create link use case.

Handles relationship creation with validation according to PRD schema.
"""

import uuid
from app.domain.models import CreateRelationship, Relationship
from app.domain.services.link_validator import LinkValidator
from app.repositories.link_repository import ILinkRepository
from app.repositories.entity_repository import IEntityRepository
from app.repositories.concept_repository import IConceptRepository


class CreateLinkUseCase:
    """
    Use case for creating relationships (links) between entities and concepts.
    
    Validates that:
    - Both source and target exist
    - Relationship type is allowed for these node types
    - No duplicate relationships
    """
    
    def __init__(
        self,
        link_repo: ILinkRepository,
        entity_repo: IEntityRepository,
        concept_repo: IConceptRepository,
        link_validator: LinkValidator
    ):
        """
        Initialize use case.
        
        Args:
            link_repo: Link repository for persistence
            entity_repo: Entity repository for validation
            concept_repo: Concept repository for validation
            link_validator: Link validator for relationship rules
        """
        self.link_repo = link_repo
        self.entity_repo = entity_repo
        self.concept_repo = concept_repo
        self.link_validator = link_validator
    
    def execute(self, project_id: str, payload: CreateRelationship) -> Relationship:
        """
        Create a new relationship.
        
        Args:
            project_id: Project identifier
            payload: Relationship creation payload
            
        Returns:
            Created relationship with assigned ID
            
        Raises:
            ValueError: If validation fails
        """
        # 1. Validate that source and target exist
        source = self._find_node(project_id, payload.source_id)
        if not source:
            raise ValueError(f"Source node '{payload.source_id}' not found")
        
        target = self._find_node(project_id, payload.target_id)
        if not target:
            raise ValueError(f"Target node '{payload.target_id}' not found")
        
        # 2. Validate relationship type and node kinds
        self.link_validator.validate_relationship(payload.rel_type, source, target)
        
        # 3. Check for duplicates
        existing_links = self.link_repo.find_all(project_id)
        self.link_validator.check_duplicate(
            payload.rel_type,
            payload.source_id,
            payload.target_id,
            existing_links
        )
        
        # 4. Create relationship
        new_id = uuid.uuid4().hex
        relationship = Relationship(
            id=new_id,
            rel_type=payload.rel_type,
            source_id=payload.source_id,
            target_id=payload.target_id
        )
        
        # 5. Persist
        return self.link_repo.save(project_id, relationship)
    
    def _find_node(self, project_id: str, node_id: str):
        """Find a node (entity or concept) by ID."""
        # Try entity first
        entity = self.entity_repo.find_by_id(project_id, node_id)
        if entity:
            return entity
        
        # Try concept
        concept = self.concept_repo.find_by_id(project_id, node_id)
        if concept:
            return concept
        
        return None


__all__ = ["CreateLinkUseCase"]



