"""Link (relationship) API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.domain.models import Relationship, CreateRelationship
from app.api.dependencies import (
    get_create_link_use_case,
    get_delete_link_use_case,
    get_link_repository,
    get_project_repository,
)

router = APIRouter(prefix="/api/projects", tags=["links"])


@router.get("/{project_id}/links", response_model=List[Relationship])
async def list_links(
    project_id: str,
    source_id: Optional[str] = None,
    target_id: Optional[str] = None,
    rel_type: Optional[str] = None
):
    """
    List links with optional filters.
    
    Query parameters:
    - source_id: Filter by source entity/concept
    - target_id: Filter by target entity/concept
    - rel_type: Filter by relationship type
    """
    project_repo = get_project_repository()
    link_repo = get_link_repository()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    return link_repo.find_specific(
        project_id=project_id,
        source_id=source_id,
        target_id=target_id,
        rel_type=rel_type
    )


@router.post("/{project_id}/links", response_model=Relationship, status_code=201)
async def create_link(project_id: str, body: CreateRelationship):
    """
    Create a new relationship.
    
    Validates that:
    - Both source and target exist
    - Relationship type is allowed for these node types
    - No duplicate relationships
    """
    project_repo = get_project_repository()
    use_case = get_create_link_use_case()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        return use_case.execute(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/{project_id}/links/{link_id}")
async def delete_link(project_id: str, link_id: str):
    """Delete a relationship."""
    project_repo = get_project_repository()
    use_case = get_delete_link_use_case()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    deleted = use_case.execute(project_id, link_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"deleted": True}


__all__ = ["router"]
