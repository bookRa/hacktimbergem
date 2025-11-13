"""Entity API endpoints.

All endpoints use use cases via dependency injection for clean separation of concerns.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from app.domain.models import EntityUnion, CreateEntityUnion
from app.use_cases.entities.create_entity import CreateEntityUseCase
from app.use_cases.entities.update_entity import UpdateEntityUseCase
from app.use_cases.entities.delete_entity import DeleteEntityUseCase
from app.use_cases.entities.list_entities import ListEntitiesUseCase
from app.api.dependencies import (
    get_create_entity_use_case,
    get_update_entity_use_case,
    get_delete_entity_use_case,
    get_list_entities_use_case,
    get_project_repository,
)
from app.repositories.project_repository import IProjectRepository

router = APIRouter(prefix="/api/projects", tags=["entities"])


@router.get("/{project_id}/entities", response_model=List[EntityUnion])
async def list_entities(
    project_id: str,
    sheet_number: Optional[int] = None,
    entity_type: Optional[str] = None,
    parent_id: Optional[str] = None
):
    """
    List entities with optional filters.
    
    Query parameters:
    - sheet_number: Filter by sheet
    - entity_type: Filter by entity type
    - parent_id: Filter by parent (for items in containers)
    """
    # Get dependencies
    project_repo = get_project_repository()
    use_case = get_list_entities_use_case()
    
    # Verify project exists
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    return use_case.execute(
        project_id=project_id,
        sheet_number=sheet_number,
        entity_type=entity_type,
        parent_id=parent_id
    )


@router.post("/{project_id}/entities", response_model=EntityUnion, status_code=201)
async def create_entity(
    project_id: str,
    body: CreateEntityUnion
):
    """
    Create a new entity.
    
    This is the unified path for entity creation used by both UI and AI services.
    Validation, business rules, and auto-linking are handled in the use case.
    """
    # Get dependencies
    project_repo = get_project_repository()
    use_case = get_create_entity_use_case()
    
    # Verify project exists
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        return use_case.execute(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch("/{project_id}/entities/{entity_id}", response_model=EntityUnion)
async def update_entity(
    project_id: str,
    entity_id: str,
    body: dict = Body(...)
):
    """
    Update an entity (partial update).
    
    Only fields present in the request body will be updated.
    """
    # Get dependencies
    project_repo = get_project_repository()
    use_case = get_update_entity_use_case()
    
    # Verify project exists
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        return use_case.execute(project_id, entity_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/{project_id}/entities/{entity_id}")
async def delete_entity(
    project_id: str,
    entity_id: str
):
    """
    Delete an entity.
    
    Enforces deletion rules (prevent deleting referenced entities)
    and cascades link deletions.
    """
    # Get dependencies
    project_repo = get_project_repository()
    use_case = get_delete_entity_use_case()
    
    # Verify project exists
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        deleted = use_case.execute(project_id, entity_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Entity not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


__all__ = ["router"]

