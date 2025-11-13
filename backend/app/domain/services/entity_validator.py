"""Entity validation domain service.

Validates entity creation and update operations according to domain rules.
"""

from typing import List
from app.domain.models import (
    CreateEntityUnion,
    EntityUnion,
    BoundingBox,
)


class EntityValidator:
    """
    Domain service for entity validation.
    
    Validates business rules for entity operations without depending on
    infrastructure (no repositories, no file I/O).
    """
    
    def validate_bbox(self, bbox_list: List[float]) -> BoundingBox:
        """
        Validate and convert bounding box list to BoundingBox object.
        
        Args:
            bbox_list: List of 4 floats [x1, y1, x2, y2]
            
        Returns:
            Valid BoundingBox object
            
        Raises:
            ValueError: If bbox is invalid
        """
        if len(bbox_list) != 4:
            raise ValueError("bounding_box must have 4 numbers")
        
        try:
            x1, y1, x2, y2 = [float(v) for v in bbox_list]
        except (TypeError, ValueError):
            raise ValueError("bounding_box values must be numeric")
        
        # Check for NaN
        if any(v != v for v in (x1, y1, x2, y2)):
            raise ValueError("bounding_box contains NaN")
        
        # Check reasonable magnitude
        if any(abs(v) > 1e8 for v in (x1, y1, x2, y2)):
            raise ValueError("bounding_box has unreasonable coordinate magnitude")
        
        # Ensure x2 > x1 and y2 > y1
        if x2 <= x1 or y2 <= y1:
            raise ValueError("bounding_box must have x2>x1 and y2>y1")
        
        return BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
    
    def validate_create(self, payload: CreateEntityUnion) -> None:
        """
        Validate entity creation payload.
        
        Args:
            payload: Creation payload
            
        Raises:
            ValueError: If payload is invalid
        """
        # Validate bounding box if present
        bbox_list = getattr(payload, "bounding_box", None)
        if bbox_list is not None:
            self.validate_bbox(bbox_list)
        
        # Pydantic validators in the models already handle most validation
        # Additional custom validation can be added here
        pass
    
    def validate_parent_exists(self, parent_id: str, parent: EntityUnion | None, expected_type: str) -> None:
        """
        Validate that a parent entity exists and has the correct type.
        
        Args:
            parent_id: Expected parent ID
            parent: Parent entity (or None if not found)
            expected_type: Expected entity_type
            
        Raises:
            ValueError: If parent doesn't exist or has wrong type
        """
        if not parent:
            raise ValueError(f"{expected_type} with id '{parent_id}' not found")
        
        actual_type = getattr(parent, "entity_type", None)
        if actual_type != expected_type:
            raise ValueError(f"Expected {expected_type}, got {actual_type}")
    
    def validate_definition_scope(
        self,
        definition: EntityUnion,
        instance_sheet: int | None
    ) -> None:
        """
        Validate that a definition's scope allows usage on the target sheet.
        
        Args:
            definition: Definition entity (SymbolDefinition or ComponentDefinition)
            instance_sheet: Sheet number where instance will be created
            
        Raises:
            ValueError: If scope doesn't allow usage
        """
        scope = getattr(definition, "scope", "sheet")
        def_sheet = getattr(definition, "source_sheet_number", None)
        
        if scope == "sheet" and instance_sheet is not None and def_sheet != instance_sheet:
            raise ValueError(
                f"Definition scope is 'sheet' and must be used on the same sheet (sheet {def_sheet})"
            )


__all__ = ["EntityValidator"]



