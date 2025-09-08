import uuid, os
from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .ingest import init_manifest, ingest_pdf, read_manifest, project_dir

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
