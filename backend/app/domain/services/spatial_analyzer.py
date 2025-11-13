"""Spatial analysis domain service.

Analyzes spatial relationships between entities (intersection, containment).
"""

from typing import List, Optional
from app.domain.models import EntityUnion, BoundingBox


class SpatialAnalyzer:
    """
    Domain service for spatial analysis.
    
    Provides pure functions for analyzing spatial relationships between entities.
    """
    
    @staticmethod
    def intersects(a: BoundingBox, b: BoundingBox) -> bool:
        """
        Check if two bounding boxes intersect.
        
        Args:
            a: First bounding box
            b: Second bounding box
            
        Returns:
            True if boxes intersect, False otherwise
        """
        return not (a.x2 <= b.x1 or a.x1 >= b.x2 or a.y2 <= b.y1 or a.y1 >= b.y2)
    
    @staticmethod
    def contains(container: BoundingBox, contained: BoundingBox) -> bool:
        """
        Check if container box fully contains the contained box.
        
        Args:
            container: Container bounding box
            contained: Contained bounding box
            
        Returns:
            True if container fully contains contained, False otherwise
        """
        return (
            container.x1 <= contained.x1
            and container.y1 <= contained.y1
            and container.x2 >= contained.x2
            and container.y2 >= contained.y2
        )
    
    def find_intersecting_parent(
        self,
        child: EntityUnion,
        candidates: List[EntityUnion],
        parent_type: str
    ) -> Optional[EntityUnion]:
        """
        Find a parent entity that intersects with the child.
        
        Used for auto-linking definitions to legends/schedules.
        
        Args:
            child: Child entity to find parent for
            candidates: List of potential parent entities
            parent_type: Expected parent entity_type
            
        Returns:
            First intersecting parent or None
        """
        child_bbox = getattr(child, "bounding_box", None)
        child_sheet = getattr(child, "source_sheet_number", None)
        
        if not child_bbox or child_sheet is None:
            return None
        
        for candidate in candidates:
            # Check entity type
            if getattr(candidate, "entity_type", None) != parent_type:
                continue
            
            # Check same sheet
            candidate_sheet = getattr(candidate, "source_sheet_number", None)
            if candidate_sheet != child_sheet:
                continue
            
            # Check intersection
            candidate_bbox = getattr(candidate, "bounding_box", None)
            if candidate_bbox and self.intersects(child_bbox, candidate_bbox):
                return candidate
        
        return None
    
    def find_containing_drawing(
        self,
        instance: EntityUnion,
        candidates: List[EntityUnion]
    ) -> Optional[EntityUnion]:
        """
        Find a drawing that contains the instance.
        
        Used for auto-linking instances to drawings.
        
        Args:
            instance: Instance entity
            candidates: List of potential drawing entities
            
        Returns:
            First containing drawing or None
        """
        inst_bbox = getattr(instance, "bounding_box", None)
        inst_sheet = getattr(instance, "source_sheet_number", None)
        
        if not inst_bbox or inst_sheet is None:
            return None
        
        for candidate in candidates:
            # Check entity type
            if getattr(candidate, "entity_type", None) != "drawing":
                continue
            
            # Check same sheet
            candidate_sheet = getattr(candidate, "source_sheet_number", None)
            if candidate_sheet != inst_sheet:
                continue
            
            # Check containment
            candidate_bbox = getattr(candidate, "bounding_box", None)
            if candidate_bbox and self.contains(candidate_bbox, inst_bbox):
                return candidate
        
        return None


__all__ = ["SpatialAnalyzer"]



