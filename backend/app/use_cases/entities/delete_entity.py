"""Delete entity use case.

Handles entity deletion with validation and cascade rules.
"""

from app.repositories.entity_repository import IEntityRepository
from app.repositories.link_repository import ILinkRepository


class DeleteEntityUseCase:
    """
    Use case for deleting entities.
    
    Enforces deletion rules (prevent deleting referenced entities)
    and cascades link deletions.
    """
    
    def __init__(
        self,
        entity_repo: IEntityRepository,
        link_repo: ILinkRepository
    ):
        """
        Initialize use case.
        
        Args:
            entity_repo: Entity repository
            link_repo: Link repository for cascade deletions
        """
        self.entity_repo = entity_repo
        self.link_repo = link_repo
    
    def execute(self, project_id: str, entity_id: str) -> bool:
        """
        Delete an entity.
        
        Args:
            project_id: Project identifier
            entity_id: Entity identifier
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            ValueError: If entity cannot be deleted due to references
        """
        # 1. Check if entity exists
        entity = self.entity_repo.find_by_id(project_id, entity_id)
        if not entity:
            return False
        
        entity_type = getattr(entity, "entity_type", None)
        
        # 2. Guard: prevent deleting definitions with instances
        if entity_type in {"symbol_definition", "component_definition"}:
            self._check_no_instances(project_id, entity_id, entity_type)
        
        # 3. Guard: prevent deleting containers with children
        if entity_type == "legend":
            children = self.entity_repo.find_by_parent(project_id, entity_id)
            legend_items = [c for c in children if getattr(c, "entity_type", None) == "legend_item"]
            if legend_items:
                raise ValueError("Cannot delete legend with existing legend items")
        
        if entity_type == "schedule":
            children = self.entity_repo.find_by_parent(project_id, entity_id)
            schedule_items = [c for c in children if getattr(c, "entity_type", None) == "schedule_item"]
            if schedule_items:
                raise ValueError("Cannot delete schedule with existing schedule items")
        
        if entity_type == "assembly_group":
            children = self.entity_repo.find_by_parent(project_id, entity_id)
            assemblies = [c for c in children if getattr(c, "entity_type", None) == "assembly"]
            if assemblies:
                raise ValueError("Cannot delete assembly group with existing assemblies")
        
        # 4. Guard: prevent deleting items referenced by instances
        if entity_type in {"legend_item", "schedule_item", "assembly"}:
            self._check_no_referencing_instances(project_id, entity_id)
        
        # 5. CASCADE: Delete links referencing this entity
        self._cascade_delete_links(project_id, entity_id)
        
        # 6. Delete entity
        return self.entity_repo.delete(project_id, entity_id)
    
    def _check_no_instances(self, project_id: str, definition_id: str, def_type: str) -> None:
        """Check that no instances reference this definition."""
        instance_type = "symbol_instance" if def_type == "symbol_definition" else "component_instance"
        all_entities = self.entity_repo.find_all(project_id)
        
        for entity in all_entities:
            if getattr(entity, "entity_type", None) != instance_type:
                continue
            
            ref_id_field = "symbol_definition_id" if def_type == "symbol_definition" else "component_definition_id"
            if getattr(entity, ref_id_field, None) == definition_id:
                raise ValueError(f"Cannot delete definition with existing instances")
    
    def _check_no_referencing_instances(self, project_id: str, item_id: str) -> None:
        """Check that no symbol instances reference this item."""
        all_entities = self.entity_repo.find_all(project_id)
        
        for entity in all_entities:
            if getattr(entity, "entity_type", None) != "symbol_instance":
                continue
            
            if getattr(entity, "definition_item_id", None) == item_id:
                raise ValueError("Cannot delete definition item with symbol instances referencing it")
    
    def _cascade_delete_links(self, project_id: str, entity_id: str) -> None:
        """Delete all links referencing this entity."""
        # Find all links involving this entity
        source_links = self.link_repo.find_by_source(project_id, entity_id)
        target_links = self.link_repo.find_by_target(project_id, entity_id)
        
        # Delete them
        for link in source_links + target_links:
            self.link_repo.delete(project_id, link.id)


__all__ = ["DeleteEntityUseCase"]



