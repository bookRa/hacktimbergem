"""Update entity use case.

Handles entity updates with validation and auto-linking updates.
"""

from typing import Optional, Dict, Any
from app.domain.models import EntityUnion, BoundingBox, ValidationInfo
from app.domain.services.entity_validator import EntityValidator
from app.domain.services.spatial_analyzer import SpatialAnalyzer
from app.repositories.entity_repository import IEntityRepository


# Sentinel to distinguish "not provided" from "explicitly None"
_NOT_PROVIDED = object()


class UpdateEntityUseCase:
    """
    Use case for updating entities.
    
    Handles partial updates with validation and auto-linking recalculation.
    """
    
    def __init__(
        self,
        entity_repo: IEntityRepository,
        validator: EntityValidator,
        spatial_analyzer: SpatialAnalyzer
    ):
        """
        Initialize use case.
        
        Args:
            entity_repo: Entity repository
            validator: Entity validator
            spatial_analyzer: Spatial analyzer for auto-linking
        """
        self.entity_repo = entity_repo
        self.validator = validator
        self.spatial_analyzer = spatial_analyzer
    
    def execute(
        self,
        project_id: str,
        entity_id: str,
        updates: Dict[str, Any]
    ) -> EntityUnion:
        """
        Update an entity.
        
        Args:
            project_id: Project identifier
            entity_id: Entity identifier
            updates: Dictionary of fields to update
            
        Returns:
            Updated entity
            
        Raises:
            ValueError: If entity not found or validation fails
        """
        # 1. Load entity
        entity = self.entity_repo.find_by_id(project_id, entity_id)
        if not entity:
            raise ValueError(f"Entity with id '{entity_id}' not found")
        
        # 2. Apply updates to dict representation
        data = entity.dict()
        
        # Process bounding_box if provided
        if "bounding_box" in updates:
            bbox_value = updates["bounding_box"]
            if bbox_value is None:
                data["bounding_box"] = None
            else:
                data["bounding_box"] = self.validator.validate_bbox(bbox_value)
        
        # Process source_sheet_number if provided
        if "source_sheet_number" in updates:
            data["source_sheet_number"] = updates["source_sheet_number"]
        
        # Process validation if provided
        if "validation" in updates:
            validation = updates["validation"]
            if validation is not None:
                if isinstance(validation, ValidationInfo):
                    data["validation"] = validation
                else:
                    data["validation"] = ValidationInfo.parse_obj(validation)
            else:
                data["validation"] = None
        
        # Process other fields based on entity type
        entity_type = data["entity_type"]
        
        # Common fields
        for field in ["title", "text", "name", "description", "notes", "status"]:
            if field in updates:
                data[field] = updates[field]
        
        # Entity-specific fields
        if entity_type in ["symbol_definition", "component_definition"]:
            if "visual_pattern_description" in updates:
                data["visual_pattern_description"] = updates["visual_pattern_description"]
            if "scope" in updates:
                scope = updates["scope"]
                if scope not in {"project", "sheet"}:
                    raise ValueError("scope must be 'project' or 'sheet'")
                data["scope"] = scope
            if "defined_in_id" in updates:
                data["defined_in_id"] = updates["defined_in_id"]
            if "specifications" in updates and entity_type == "component_definition":
                data["specifications"] = updates["specifications"]
        
        # Handle parent IDs and relationships
        self._process_relationships(project_id, entity_type, updates, data)
        
        # 3. Reconstruct and validate entity
        entity_cls = type(entity)
        updated = entity_cls(**data)
        
        # 4. Auto-link updates if spatial properties changed
        if "bounding_box" in updates or "source_sheet_number" in updates:
            updated = self._update_auto_links(project_id, updated)
        
        # 5. Persist
        return self.entity_repo.save(project_id, updated)
    
    def _process_relationships(
        self,
        project_id: str,
        entity_type: str,
        updates: Dict[str, Any],
        data: Dict[str, Any]
    ) -> None:
        """Process relationship field updates."""
        
        # Parent validation for items
        if entity_type == "legend_item" and "legend_id" in updates:
            parent = self.entity_repo.find_by_id(project_id, updates["legend_id"])
            self.validator.validate_parent_exists(updates["legend_id"], parent, "legend")
            data["legend_id"] = updates["legend_id"]
        
        if entity_type == "schedule_item":
            if "schedule_id" in updates:
                parent = self.entity_repo.find_by_id(project_id, updates["schedule_id"])
                self.validator.validate_parent_exists(updates["schedule_id"], parent, "schedule")
                data["schedule_id"] = updates["schedule_id"]
            if "drawing_id" in updates:
                drawing_id = updates["drawing_id"]
                if drawing_id:
                    drawing = self.entity_repo.find_by_id(project_id, drawing_id)
                    self.validator.validate_parent_exists(drawing_id, drawing, "drawing")
                data["drawing_id"] = drawing_id
        
        if entity_type == "assembly":
            if "assembly_group_id" in updates:
                parent = self.entity_repo.find_by_id(project_id, updates["assembly_group_id"])
                self.validator.validate_parent_exists(updates["assembly_group_id"], parent, "assembly_group")
                data["assembly_group_id"] = updates["assembly_group_id"]
            if "drawing_id" in updates:
                drawing_id = updates["drawing_id"]
                if drawing_id:
                    drawing = self.entity_repo.find_by_id(project_id, drawing_id)
                    self.validator.validate_parent_exists(drawing_id, drawing, "drawing")
                data["drawing_id"] = drawing_id
        
        # Instance-specific updates
        if entity_type == "symbol_instance":
            if "symbol_definition_id" in updates:
                definition = self.entity_repo.find_by_id(project_id, updates["symbol_definition_id"])
                self.validator.validate_parent_exists(updates["symbol_definition_id"], definition, "symbol_definition")
                data["symbol_definition_id"] = updates["symbol_definition_id"]
            
            if "definition_item_id" in updates or "definition_item_type" in updates:
                item_id = updates.get("definition_item_id")
                item_type = updates.get("definition_item_type")
                if item_id and item_type:
                    def_item = self.entity_repo.find_by_id(project_id, item_id)
                    if not def_item:
                        raise ValueError("definition_item_id not found")
                    if getattr(def_item, "entity_type", None) != item_type:
                        raise ValueError("definition_item_type mismatch")
                    data["definition_item_id"] = item_id
                    data["definition_item_type"] = item_type
                elif item_id is None and item_type is None:
                    data["definition_item_id"] = None
                    data["definition_item_type"] = None
        
        if entity_type == "component_instance" and "component_definition_id" in updates:
            definition = self.entity_repo.find_by_id(project_id, updates["component_definition_id"])
            self.validator.validate_parent_exists(updates["component_definition_id"], definition, "component_definition")
            data["component_definition_id"] = updates["component_definition_id"]
        
        # Copy simple fields
        for field in ["mark", "code", "symbol_text", "schedule_type", "recognized_text"]:
            if field in updates:
                data[field] = updates[field]
        
        if "specifications" in updates:
            data["specifications"] = updates["specifications"]
    
    def _update_auto_links(self, project_id: str, entity: EntityUnion) -> EntityUnion:
        """Update auto-linked relationships based on spatial changes."""
        entity_type = getattr(entity, "entity_type", None)
        data = entity.dict()
        
        # Auto-link definitions to containers
        if entity_type in {"symbol_definition", "component_definition"}:
            parent_type = "legend" if entity_type == "symbol_definition" else "schedule"
            bbox = getattr(entity, "bounding_box", None)
            sheet = getattr(entity, "source_sheet_number", None)
            
            if bbox and sheet:
                existing = self.entity_repo.find_by_sheet(project_id, sheet)
                parent = self.spatial_analyzer.find_intersecting_parent(entity, existing, parent_type)
                if parent:
                    data["defined_in_id"] = parent.id
        
        # Auto-link instances to drawings
        if entity_type in {"symbol_instance", "component_instance"}:
            bbox = getattr(entity, "bounding_box", None)
            sheet = getattr(entity, "source_sheet_number", None)
            
            if bbox and sheet:
                existing = self.entity_repo.find_by_sheet(project_id, sheet)
                drawing = self.spatial_analyzer.find_containing_drawing(entity, existing)
                data["instantiated_in_id"] = drawing.id if drawing else None
            else:
                data["instantiated_in_id"] = None
        
        entity_cls = type(entity)
        return entity_cls(**data)


__all__ = ["UpdateEntityUseCase"]



