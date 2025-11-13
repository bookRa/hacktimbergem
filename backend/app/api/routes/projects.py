"""Project API endpoints - ingestion, status, and resources."""

from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid
import os
from app.api.dependencies import get_project_repository, get_settings

# Import from existing ingest module (will be refactored into use case later)
from app.ingest import ingest_pdf

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectStatus(BaseModel):
    """Project status response model."""
    project_id: str
    status: str
    num_pages: int | None = None
    stages: dict
    started_at: float | None = None
    completed_at: float | None = None
    error: str | None = None
    page_titles: dict[str, str] = {}


class PageTitleUpdate(BaseModel):
    """Page title update request."""
    page_index: int
    text: str


@router.post("")
async def create_project(file: UploadFile, background: BackgroundTasks):
    """
    Create a new project and initiate PDF ingestion.
    
    The PDF will be processed in the background:
    1. Render each page to PNG (300 DPI)
    2. Extract OCR data (text + bounding boxes)
    """
    project_repo = get_project_repository()
    
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Generate project ID
    project_id = uuid.uuid4().hex
    
    # Create project directory and manifest
    project_repo.create(project_id)
    
    # Save uploaded PDF
    project_dir = project_repo.get_project_dir(project_id)
    pdf_path = os.path.join(project_dir, "original.pdf")
    
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    
    # Trigger background ingestion
    background.add_task(ingest_pdf, project_id, pdf_path)
    
    return {"project_id": project_id, "status": "queued"}


@router.get("/{project_id}/status", response_model=ProjectStatus)
async def get_status(project_id: str):
    """Get project ingestion status."""
    project_repo = get_project_repository()
    manifest = project_repo.find_by_id(project_id)
    
    if not manifest:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return manifest


@router.patch("/{project_id}/page-titles")
async def update_page_title(project_id: str, body: PageTitleUpdate):
    """Update a single page title in the manifest."""
    project_repo = get_project_repository()
    
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get current manifest
    manifest = project_repo.find_by_id(project_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Ensure page_titles exists (backwards compatibility)
    page_titles = manifest.get("page_titles", {})
    page_titles[str(body.page_index)] = body.text
    
    # Update manifest
    project_repo.update(project_id, {"page_titles": page_titles})
    
    return {"success": True, "page_index": body.page_index, "text": body.text}


@router.get("/{project_id}/pages/{page_num}.png")
async def get_page(project_id: str, page_num: int):
    """Get rendered page image."""
    project_repo = get_project_repository()
    project_dir = project_repo.get_project_dir(project_id)
    path = os.path.join(project_dir, "pages", f"page_{page_num}.png")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Page not found")
    
    return FileResponse(path, media_type="image/png")


@router.get("/{project_id}/ocr/{page_num}")
async def get_ocr(project_id: str, page_num: int):
    """Get OCR data for a page."""
    project_repo = get_project_repository()
    project_dir = project_repo.get_project_dir(project_id)
    path = os.path.join(project_dir, "ocr", f"page_{page_num}.json")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="OCR not found")
    
    import json
    with open(path) as f:
        return json.load(f)


@router.get("/{project_id}/original.pdf")
async def get_original_pdf(project_id: str):
    """Get original PDF file."""
    project_repo = get_project_repository()
    project_dir = project_repo.get_project_dir(project_id)
    path = os.path.join(project_dir, "original.pdf")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Original PDF not found")
    
    return FileResponse(path, media_type="application/pdf")


__all__ = ["router"]
