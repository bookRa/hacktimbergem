"""Create entity use case.

Handles entity creation with validation, auto-linking, and persistence.
This is the unified path for both UI and AI-driven entity creation.
"""

import uuid
from typing import Optional
from app.domain.models import (
    CreateEntityUnion,
    EntityUnion,
    BoundingBox,
    Drawing,
    Legend,
    LegendItem,
    Schedule,
    ScheduleItem,
    AssemblyGroup,
    Assembly,
    Note,
    Scope,
    SymbolDefinition,
    ComponentDefinition,
    SymbolInstance,
    ComponentInstance,
    ValidationInfo,
)
from app.domain.services.entity_validator import EntityValidator
from app.domain.services.spatial_analyzer import SpatialAnalyzer
from app.repositories.entity_repository import IEntityRepository


class CreateEntityUseCase:
    """
    Use case for creating entities.
    
    Coordinates validation, business rules, auto-linking, and persistence.
    Used by both UI and AI services to ensure consistent behavior.
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
            entity_repo: Entity repository for persistence
            validator: Entity validator for domain rules
            spatial_analyzer: Spatial analyzer for auto-linking
        """
        self.entity_repo = entity_repo
        self.validator = validator
        self.spatial_analyzer = spatial_analyzer
    
    def execute(self, project_id: str, payload: CreateEntityUnion) -> EntityUnion:
        """
        Create a new entity.
        
        Args:
            project_id: Project identifier
            payload: Entity creation payload
            
        Returns:
            Created entity with assigned ID
            
        Raises:
            ValueError: If validation fails or required references don't exist
        """
        # 1. Validate payload
        self.validator.validate_create(payload)
        
        # 2. Load existing entities (for validation and auto-linking)
        sheet_num = getattr(payload, "source_sheet_number", None)
        existing = self.entity_repo.find_by_sheet(project_id, sheet_num) if sheet_num else []
        
        # 3. Build entity with ID and validated bounding box
        entity = self._build_entity(project_id, payload, existing)
        
        # 4. Persist
        return self.entity_repo.save(project_id, entity)
    
    def _build_entity(
        self,
        project_id: str,
        payload: CreateEntityUnion,
        existing: list[EntityUnion]
    ) -> EntityUnion:
        """Build the entity from payload with auto-linking."""
        new_id = uuid.uuid4().hex
        
        # Process bounding box if present
        bbox = None
        bbox_list = getattr(payload, "bounding_box", None)
        if bbox_list is not None:
            bbox = self.validator.validate_bbox(bbox_list)
        
        # Extract validation info
        validation = getattr(payload, "validation", None)
        if validation is not None and not isinstance(validation, ValidationInfo):
            validation = ValidationInfo.parse_obj(validation)
        
        # Common kwargs for entities with bbox
        base_kwargs = {
            "id": new_id,
            "source_sheet_number": getattr(payload, "source_sheet_number", None),
            "bounding_box": bbox,
            "status": getattr(payload, "status", None),
            "validation": validation,
        }
        
        # Build specific entity type
        entity_type = payload.entity_type
        
        if entity_type == "drawing":
            return Drawing(
                **base_kwargs,
                title=getattr(payload, "title", None),
                description=getattr(payload, "description", None),
            )
        
        elif entity_type == "legend":
            return Legend(
                **base_kwargs,
                title=getattr(payload, "title", None),
                notes=getattr(payload, "notes", None),
            )
        
        elif entity_type == "legend_item":
            # Validate parent exists
            parent_id = getattr(payload, "legend_id")
            parent = self.entity_repo.find_by_id(project_id, parent_id)
            self.validator.validate_parent_exists(parent_id, parent, "legend")
            
            return LegendItem(
                **base_kwargs,
                legend_id=parent_id,
                symbol_text=getattr(payload, "symbol_text", None),
                description=getattr(payload, "description", None),
                notes=getattr(payload, "notes", None),
            )
        
        elif entity_type == "schedule":
            return Schedule(
                **base_kwargs,
                title=getattr(payload, "title", None),
                schedule_type=getattr(payload, "schedule_type", None),
                notes=getattr(payload, "notes", None),
            )
        
        elif entity_type == "schedule_item":
            # Validate parent exists
            parent_id = getattr(payload, "schedule_id")
            parent = self.entity_repo.find_by_id(project_id, parent_id)
            self.validator.validate_parent_exists(parent_id, parent, "schedule")
            
            # Validate drawing_id if provided
            drawing_id = getattr(payload, "drawing_id", None)
            if drawing_id:
                drawing = self.entity_repo.find_by_id(project_id, drawing_id)
                self.validator.validate_parent_exists(drawing_id, drawing, "drawing")
            
            return ScheduleItem(
                **base_kwargs,
                schedule_id=parent_id,
                mark=getattr(payload, "mark", None),
                description=getattr(payload, "description", None),
                notes=getattr(payload, "notes", None),
                specifications=getattr(payload, "specifications", None),
                drawing_id=drawing_id,
            )
        
        elif entity_type == "assembly_group":
            return AssemblyGroup(
                **base_kwargs,
                title=getattr(payload, "title", None),
                notes=getattr(payload, "notes", None),
            )
        
        elif entity_type == "assembly":
            # Validate parent exists
            parent_id = getattr(payload, "assembly_group_id")
            parent = self.entity_repo.find_by_id(project_id, parent_id)
            self.validator.validate_parent_exists(parent_id, parent, "assembly_group")
            
            # Validate drawing_id if provided
            drawing_id = getattr(payload, "drawing_id", None)
            if drawing_id:
                drawing = self.entity_repo.find_by_id(project_id, drawing_id)
                self.validator.validate_parent_exists(drawing_id, drawing, "drawing")
            
            return Assembly(
                **base_kwargs,
                assembly_group_id=parent_id,
                code=getattr(payload, "code", None),
                name=getattr(payload, "name", None),
                description=getattr(payload, "description", None),
                notes=getattr(payload, "notes", None),
                specifications=getattr(payload, "specifications", None),
                drawing_id=drawing_id,
            )
        
        elif entity_type == "note":
            return Note(
                **base_kwargs,
                text=getattr(payload, "text", None),
            )
        
        elif entity_type == "scope":
            return Scope(
                **base_kwargs,
                name=getattr(payload, "name", None),
                description=getattr(payload, "description", None),
            )
        
        elif entity_type == "symbol_definition":
            # Auto-link to legend if intersects
            defined_in_id = getattr(payload, "defined_in_id", None)
            if not defined_in_id and bbox:
                parent = self.spatial_analyzer.find_intersecting_parent(
                    type('TempEntity', (), {'bounding_box': bbox, 'source_sheet_number': payload.source_sheet_number})(),
                    existing,
                    parent_type="legend"
                )
                if parent:
                    defined_in_id = parent.id
            
            return SymbolDefinition(
                **base_kwargs,
                name=getattr(payload, "name"),
                description=getattr(payload, "description", None),
                visual_pattern_description=getattr(payload, "visual_pattern_description", None),
                scope=getattr(payload, "scope", "sheet"),
                defined_in_id=defined_in_id,
            )
        
        elif entity_type == "component_definition":
            # Auto-link to schedule if intersects
            defined_in_id = getattr(payload, "defined_in_id", None)
            if not defined_in_id and bbox:
                parent = self.spatial_analyzer.find_intersecting_parent(
                    type('TempEntity', (), {'bounding_box': bbox, 'source_sheet_number': payload.source_sheet_number})(),
                    existing,
                    parent_type="schedule"
                )
                if parent:
                    defined_in_id = parent.id
            
            return ComponentDefinition(
                **base_kwargs,
                name=getattr(payload, "name"),
                description=getattr(payload, "description", None),
                specifications=getattr(payload, "specifications", None),
                scope=getattr(payload, "scope", "sheet"),
                defined_in_id=defined_in_id,
            )
        
        elif entity_type == "symbol_instance":
            # Validate definition exists
            def_id = getattr(payload, "symbol_definition_id")
            definition = self.entity_repo.find_by_id(project_id, def_id)
            self.validator.validate_parent_exists(def_id, definition, "symbol_definition")
            
            # Validate scope allows usage
            self.validator.validate_definition_scope(definition, payload.source_sheet_number)
            
            # Validate definition_item if provided
            definition_item_id = getattr(payload, "definition_item_id", None)
            definition_item_type = getattr(payload, "definition_item_type", None)
            if definition_item_id and definition_item_type:
                def_item = self.entity_repo.find_by_id(project_id, definition_item_id)
                if not def_item:
                    raise ValueError("definition_item_id not found")
                if getattr(def_item, "entity_type", None) != definition_item_type:
                    raise ValueError(f"definition_item_type mismatch")
            
            # Auto-link to drawing if within one
            instantiated_in_id = None
            if bbox:
                drawing = self.spatial_analyzer.find_containing_drawing(
                    type('TempInst', (), {'bounding_box': bbox, 'source_sheet_number': payload.source_sheet_number})(),
                    existing
                )
                if drawing:
                    instantiated_in_id = drawing.id
            
            return SymbolInstance(
                **base_kwargs,
                symbol_definition_id=def_id,
                recognized_text=getattr(payload, "recognized_text", None),
                definition_item_id=definition_item_id,
                definition_item_type=definition_item_type,
                instantiated_in_id=instantiated_in_id,
            )
        
        elif entity_type == "component_instance":
            # Validate definition exists
            def_id = getattr(payload, "component_definition_id")
            definition = self.entity_repo.find_by_id(project_id, def_id)
            self.validator.validate_parent_exists(def_id, definition, "component_definition")
            
            # Validate scope allows usage
            self.validator.validate_definition_scope(definition, payload.source_sheet_number)
            
            # Auto-link to drawing if within one
            instantiated_in_id = None
            if bbox:
                drawing = self.spatial_analyzer.find_containing_drawing(
                    type('TempInst', (), {'bounding_box': bbox, 'source_sheet_number': payload.source_sheet_number})(),
                    existing
                )
                if drawing:
                    instantiated_in_id = drawing.id
            
            return ComponentInstance(
                **base_kwargs,
                component_definition_id=def_id,
                instantiated_in_id=instantiated_in_id,
            )
        
        else:
            raise ValueError(f"Unsupported entity_type: {entity_type}")


__all__ = ["CreateEntityUseCase"]



