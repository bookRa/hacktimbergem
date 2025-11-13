"""Link validation domain service.

Validates relationship creation according to the PRD schema.
"""

from typing import Set, Tuple
from app.domain.models import ALLOWED_RELATIONSHIPS, EntityUnion, ConceptUnion


class LinkValidator:
    """
    Domain service for link/relationship validation.
    
    Validates that relationships follow the allowed patterns defined in the PRD.
    """
    
    def __init__(self):
        """Initialize with allowed relationships from domain models."""
        self.allowed_relationships = ALLOWED_RELATIONSHIPS
    
    def get_kind(self, obj: EntityUnion | ConceptUnion) -> str:
        """
        Get the "kind" of an object for validation purposes.
        
        For entities, this is their entity_type.
        For concepts, this is their kind.
        
        Args:
            obj: Entity or concept
            
        Returns:
            Kind string (e.g., "drawing", "space", "symbol_instance")
        """
        # Try entity_type first (for entities)
        entity_type = getattr(obj, "entity_type", None)
        if entity_type:
            return entity_type
        
        # Try kind (for concepts)
        kind = getattr(obj, "kind", None)
        if kind:
            return kind
        
        return "unknown"
    
    def validate_relationship(
        self,
        rel_type: str,
        source: EntityUnion | ConceptUnion,
        target: EntityUnion | ConceptUnion
    ) -> None:
        """
        Validate that a relationship is allowed.
        
        Args:
            rel_type: Relationship type (e.g., "JUSTIFIED_BY")
            source: Source object
            target: Target object
            
        Raises:
            ValueError: If relationship is not allowed
        """
        # Check if rel_type is supported
        allowed = self.allowed_relationships.get(rel_type)
        if not allowed:
            raise ValueError(f"Unsupported relationship type: {rel_type}")
        
        allowed_sources, allowed_targets = allowed
        
        source_kind = self.get_kind(source)
        target_kind = self.get_kind(target)
        
        # Validate source kind
        if source_kind not in allowed_sources:
            raise ValueError(
                f"Invalid source kind '{source_kind}' for {rel_type}. "
                f"Allowed: {sorted(allowed_sources)}"
            )
        
        # Validate target kind
        if target_kind not in allowed_targets:
            raise ValueError(
                f"Invalid target kind '{target_kind}' for {rel_type}. "
                f"Allowed: {sorted(allowed_targets)}"
            )
    
    def check_duplicate(
        self,
        rel_type: str,
        source_id: str,
        target_id: str,
        existing_links: list
    ) -> None:
        """
        Check if a relationship already exists.
        
        Args:
            rel_type: Relationship type
            source_id: Source ID
            target_id: Target ID
            existing_links: List of existing relationships
            
        Raises:
            ValueError: If duplicate relationship exists
        """
        for link in existing_links:
            if (
                getattr(link, "rel_type", None) == rel_type
                and getattr(link, "source_id", None) == source_id
                and getattr(link, "target_id", None) == target_id
            ):
                raise ValueError(
                    f"Duplicate link: {rel_type} from {source_id} to {target_id} already exists"
                )


__all__ = ["LinkValidator"]



