"""Concept API endpoints."""

from fastapi import APIRouter, HTTPException, Body
from typing import List
from app.domain.models import ConceptUnion, CreateConceptUnion
from app.api.dependencies import (
    get_create_concept_use_case,
    get_update_concept_use_case,
    get_delete_concept_use_case,
    get_concept_repository,
    get_project_repository,
)

router = APIRouter(prefix="/api/projects", tags=["concepts"])


@router.get("/{project_id}/concepts", response_model=List[ConceptUnion])
async def list_concepts(project_id: str):
    """List all concepts in a project."""
    project_repo = get_project_repository()
    concept_repo = get_concept_repository()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    return concept_repo.find_all(project_id)


@router.post("/{project_id}/concepts", response_model=ConceptUnion, status_code=201)
async def create_concept(project_id: str, body: CreateConceptUnion):
    """Create a new concept."""
    project_repo = get_project_repository()
    use_case = get_create_concept_use_case()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        return use_case.execute(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch("/{project_id}/concepts/{concept_id}", response_model=ConceptUnion)
async def update_concept(project_id: str, concept_id: str, body: dict = Body(...)):
    """Update a concept."""
    project_repo = get_project_repository()
    use_case = get_update_concept_use_case()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        return use_case.execute(project_id, concept_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/{project_id}/concepts/{concept_id}")
async def delete_concept(project_id: str, concept_id: str):
    """Delete a concept."""
    project_repo = get_project_repository()
    use_case = get_delete_concept_use_case()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        deleted = use_case.execute(project_id, concept_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Concept not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


__all__ = ["router"]
