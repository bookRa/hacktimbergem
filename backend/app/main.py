import uuid, os
from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .ingest import init_manifest, ingest_pdf, read_manifest, project_dir
from .entities_models import CreateEntityUnion, EntityUnion
from .entities_store import load_entities, create_entity

app = FastAPI(title="Timbergem Backend", version="0.1.0")


class ProjectStatus(BaseModel):
    project_id: str
    status: str
    num_pages: int | None = None
    stages: dict
    started_at: float | None = None
    completed_at: float | None = None
    error: str | None = None


@app.post("/api/projects")
async def create_project(file: UploadFile, background: BackgroundTasks):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    project_id = uuid.uuid4().hex
    pdir = project_dir(project_id)
    os.makedirs(pdir, exist_ok=True)
    init_manifest(project_id)
    pdf_path = os.path.join(pdir, "original.pdf")
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    background.add_task(ingest_pdf, project_id, pdf_path)
    return {"project_id": project_id, "status": "queued"}


@app.get("/api/projects/{project_id}/status", response_model=ProjectStatus)
async def get_status(project_id: str):
    m = read_manifest(project_id)
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    return m


@app.get("/api/projects/{project_id}/pages/{page_num}.png")
async def get_page(project_id: str, page_num: int):
    path = os.path.join(project_dir(project_id), "pages", f"page_{page_num}.png")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(path, media_type="image/png")


@app.get("/api/projects/{project_id}/ocr/{page_num}")
async def get_ocr(project_id: str, page_num: int):
    path = os.path.join(project_dir(project_id), "ocr", f"page_{page_num}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="OCR not found")
    import json

    with open(path) as f:
        return json.load(f)


# --------- Entities Endpoints ---------


@app.get("/api/projects/{project_id}/entities", response_model=list[EntityUnion])
async def list_entities(project_id: str):
    # Ensure project exists (manifest presence)
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return load_entities(project_id)


@app.post(
    "/api/projects/{project_id}/entities", response_model=EntityUnion, status_code=201
)
async def create_entity_endpoint(project_id: str, body: CreateEntityUnion):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    # Validate bounding_box basic structure before delegate (length numeric is revalidated there too)
    if len(body.bounding_box) != 4:
        raise HTTPException(status_code=422, detail="bounding_box must have 4 numbers")
    try:
        _ = [float(v) for v in body.bounding_box]
    except Exception:
        raise HTTPException(
            status_code=422, detail="bounding_box values must be numeric"
        )
    try:
        ent = create_entity(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ent
