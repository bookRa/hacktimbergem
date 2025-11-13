"""File-based entity repository implementation.

Stores entities as JSON array in projects/{project_id}/entities.json.
This implementation focuses purely on persistence - no business logic.
"""

from typing import List, Optional
import os
from app.repositories.entity_repository import IEntityRepository
from app.domain.models import (
    EntityUnion,
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
)
from app.services.storage.file_storage import atomic_write_json, read_json_or_empty


class FileEntityRepository(IEntityRepository):
    """File-based implementation of entity repository."""
    
    # Map entity_type to model class
    ENTITY_TYPE_MAP = {
        "drawing": Drawing,
        "legend": Legend,
        "legend_item": LegendItem,
        "schedule": Schedule,
        "schedule_item": ScheduleItem,
        "assembly_group": AssemblyGroup,
        "assembly": Assembly,
        "note": Note,
        "scope": Scope,
        "symbol_definition": SymbolDefinition,
        "component_definition": ComponentDefinition,
        "symbol_instance": SymbolInstance,
        "component_instance": ComponentInstance,
    }
    
    def __init__(self, base_dir: str = "projects"):
        """
        Initialize repository.
        
        Args:
            base_dir: Base directory for project storage
        """
        self.base_dir = base_dir
    
    def _entities_path(self, project_id: str) -> str:
        """Get path to entities.json file."""
        return os.path.join(self.base_dir, project_id, "entities.json")
    
    def _load_raw(self, project_id: str) -> List[dict]:
        """Load raw entity dicts from file."""
        path = self._entities_path(project_id)
        return read_json_or_empty(path, default=[])
    
    def _save_raw(self, project_id: str, entities: List[dict]) -> None:
        """Save raw entity dicts to file."""
        project_path = os.path.join(self.base_dir, project_id)
        os.makedirs(project_path, exist_ok=True)
        path = self._entities_path(project_id)
        atomic_write_json(path, entities)
    
    def _deserialize(self, raw: dict) -> Optional[EntityUnion]:
        """
        Deserialize a raw dict into an entity model.
        
        Returns None if entity type is unknown or deserialization fails.
        """
        entity_type = raw.get("entity_type")
        model_cls = self.ENTITY_TYPE_MAP.get(entity_type)
        
        if not model_cls:
            return None
        
        try:
            return model_cls(**raw)
        except Exception:
            # Skip malformed entities
            return None
    
    def _serialize(self, entity: EntityUnion) -> dict:
        """Serialize an entity model to dict."""
        return entity.dict()
    
    def find_by_id(self, project_id: str, entity_id: str) -> Optional[EntityUnion]:
        """Find entity by ID."""
        raw_entities = self._load_raw(project_id)
        
        for raw in raw_entities:
            if raw.get("id") == entity_id:
                return self._deserialize(raw)
        
        return None
    
    def find_all(self, project_id: str) -> List[EntityUnion]:
        """Find all entities in project."""
        raw_entities = self._load_raw(project_id)
        entities = []
        
        for raw in raw_entities:
            entity = self._deserialize(raw)
            if entity:
                entities.append(entity)
        
        return entities
    
    def save(self, project_id: str, entity: EntityUnion) -> EntityUnion:
        """
        Save (create or update) an entity.
        
        For updates, replaces existing entity with same ID.
        For creates, appends new entity (ID must be pre-assigned).
        """
        raw_entities = self._load_raw(project_id)
        entity_dict = self._serialize(entity)
        entity_id = entity_dict["id"]
        
        # Check if entity already exists (update case)
        found_index = None
        for i, raw in enumerate(raw_entities):
            if raw.get("id") == entity_id:
                found_index = i
                break
        
        if found_index is not None:
            # Update existing
            raw_entities[found_index] = entity_dict
        else:
            # Create new
            raw_entities.append(entity_dict)
        
        self._save_raw(project_id, raw_entities)
        return entity
    
    def delete(self, project_id: str, entity_id: str) -> bool:
        """Delete entity by ID."""
        raw_entities = self._load_raw(project_id)
        original_count = len(raw_entities)
        
        # Filter out the entity to delete
        filtered = [e for e in raw_entities if e.get("id") != entity_id]
        
        if len(filtered) == original_count:
            # Entity not found
            return False
        
        self._save_raw(project_id, filtered)
        return True
    
    def find_by_sheet(self, project_id: str, sheet_number: int) -> List[EntityUnion]:
        """Find all entities on a specific sheet."""
        all_entities = self.find_all(project_id)
        result = []
        
        for entity in all_entities:
            # Check if entity has source_sheet_number attribute
            sheet_num = getattr(entity, "source_sheet_number", None)
            if sheet_num == sheet_number:
                result.append(entity)
        
        return result
    
    def find_by_type(self, project_id: str, entity_type: str) -> List[EntityUnion]:
        """Find all entities of a specific type."""
        all_entities = self.find_all(project_id)
        result = []
        
        for entity in all_entities:
            if getattr(entity, "entity_type", None) == entity_type:
                result.append(entity)
        
        return result
    
    def find_by_parent(self, project_id: str, parent_id: str) -> List[EntityUnion]:
        """
        Find all child entities of a parent container.
        
        Checks legend_id, schedule_id, and assembly_group_id fields.
        """
        all_entities = self.find_all(project_id)
        result = []
        
        for entity in all_entities:
            # Check various parent ID fields
            legend_id = getattr(entity, "legend_id", None)
            schedule_id = getattr(entity, "schedule_id", None)
            assembly_group_id = getattr(entity, "assembly_group_id", None)
            
            if legend_id == parent_id or schedule_id == parent_id or assembly_group_id == parent_id:
                result.append(entity)
        
        return result


__all__ = ["FileEntityRepository"]



