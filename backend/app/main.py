import uuid, os
from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .ingest import init_manifest, ingest_pdf, read_manifest, project_dir
from .entities_models import CreateEntityUnion, EntityUnion
from .entities_store import load_entities, create_entity, update_entity, delete_entity
from .concepts_models import (
    CreateConceptUnion,
    ConceptUnion,
    CreateRelationship,
    Relationship,
)
from .concepts_store import (
    load_concepts,
    create_concept,
    update_concept,
    delete_concept,
)
from .links_store import (
    load_links,
    create_link,
    delete_link,
)
from fastapi import Body

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


@app.get("/api/projects/{project_id}/original.pdf")
async def get_original_pdf(project_id: str):
    path = os.path.join(project_dir(project_id), "original.pdf")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Original PDF not found")
    return FileResponse(path, media_type="application/pdf")


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
    # Validate bounding_box basic structure if present (conceptual scopes may not have bbox)
    if hasattr(body, 'bounding_box') and body.bounding_box is not None:
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


@app.patch(
    "/api/projects/{project_id}/entities/{entity_id}", response_model=EntityUnion
)
async def patch_entity_endpoint(
    project_id: str,
    entity_id: str,
    body: dict = Body(...),
):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Build kwargs only for fields that are present in the request
    # This allows explicit null values to be passed through
    kwargs: dict = {}
    
    if "bounding_box" in body:
        kwargs["bounding_box"] = body["bounding_box"]
    if "source_sheet_number" in body:
        kwargs["source_sheet_number"] = body["source_sheet_number"]
    if "title" in body:
        kwargs["title"] = body["title"]
    if "text" in body:
        kwargs["text"] = body["text"]
    if "name" in body:
        kwargs["name"] = body["name"]
    if "description" in body:
        kwargs["description"] = body["description"]
    if "visual_pattern_description" in body:
        kwargs["visual_pattern_description"] = body["visual_pattern_description"]
    if "scope" in body:
        kwargs["scope"] = body["scope"]
    if "defined_in_id" in body:
        kwargs["defined_in_id"] = body["defined_in_id"]
    if "specifications" in body:
        kwargs["specifications"] = body["specifications"]
    if "symbol_definition_id" in body:
        kwargs["symbol_definition_id"] = body["symbol_definition_id"]
    if "component_definition_id" in body:
        kwargs["component_definition_id"] = body["component_definition_id"]
    if "recognized_text" in body:
        kwargs["recognized_text"] = body["recognized_text"]
    if "instantiated_in_id" in body:
        kwargs["instantiated_in_id"] = body["instantiated_in_id"]
    if "status" in body:
        kwargs["status"] = body["status"]
    if "validation" in body:
        kwargs["validation"] = body["validation"]
    
    try:
        ent = update_entity(
            project_id,
            entity_id,
            **kwargs
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ent


@app.delete("/api/projects/{project_id}/entities/{entity_id}")
async def delete_entity_endpoint(project_id: str, entity_id: str):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        ok = delete_entity(project_id, entity_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"deleted": True}


# --------- Concepts Endpoints ---------


@app.get("/api/projects/{project_id}/concepts", response_model=list[ConceptUnion])
async def list_concepts(project_id: str):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return load_concepts(project_id)


@app.post(
    "/api/projects/{project_id}/concepts", response_model=ConceptUnion, status_code=201
)
async def create_concept_endpoint(project_id: str, body: CreateConceptUnion):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        c = create_concept(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return c


@app.patch("/api/projects/{project_id}/concepts/{concept_id}", response_model=ConceptUnion)
async def patch_concept_endpoint(project_id: str, concept_id: str, body: dict = Body(...)):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    name = body.get("name")
    description = body.get("description")
    category = body.get("category")
    try:
        c = update_concept(project_id, concept_id, name=name, description=description, category=category)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return c


@app.delete("/api/projects/{project_id}/concepts/{concept_id}")
async def delete_concept_endpoint(project_id: str, concept_id: str):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        ok = delete_concept(project_id, concept_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="Concept not found")
    return {"deleted": True}


# --------- Links Endpoints ---------


@app.get("/api/projects/{project_id}/links", response_model=list[Relationship])
async def list_links(project_id: str, source_id: str | None = None, target_id: str | None = None, rel_type: str | None = None):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    all_links = load_links(project_id)
    result = []
    for l in all_links:
        if source_id and l.source_id != source_id:
            continue
        if target_id and l.target_id != target_id:
            continue
        if rel_type and l.rel_type != rel_type:
            continue
        result.append(l)
    return result


@app.post(
    "/api/projects/{project_id}/links", response_model=Relationship, status_code=201
)
async def create_link_endpoint(project_id: str, body: CreateRelationship):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        link = create_link(project_id, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return link


@app.delete("/api/projects/{project_id}/links/{link_id}")
async def delete_link_endpoint(project_id: str, link_id: str):
    if not read_manifest(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    ok = delete_link(project_id, link_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"deleted": True}
