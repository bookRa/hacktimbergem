import os
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app import ingest as ingest_mod


client = TestClient(app)


def _create_project(tmp_path, monkeypatch):
    # Ensure backend uses tmp_path as projects dir both via env and direct module var
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    monkeypatch.setattr(ingest_mod, "BASE_DIR", str(tmp_path), raising=False)
    # Initialize a synthetic project dir and manifest as if ingestion completed (1 page)
    pid = "proj_test"
    pdir = os.path.join(str(tmp_path), pid)
    os.makedirs(os.path.join(pdir, "pages"), exist_ok=True)
    os.makedirs(os.path.join(pdir, "ocr"), exist_ok=True)
    with open(os.path.join(pdir, "manifest.json"), "w") as f:
        f.write(
            """
{"project_id":"proj_test","status":"complete","num_pages":1,"stages":{"render":{"done":1,"total":1},"ocr":{"done":1,"total":1}},"started_at":0,"completed_at":0,"error":null}
""".strip()
        )
    # Minimal OCR for coordinate meta
    with open(os.path.join(pdir, "ocr", "page_1.json"), "w") as f:
        f.write(
            """
{"page_number":1,"width_pts":1000,"height_pts":1000,"blocks":[]}
""".strip()
        )
    return pid


def test_create_instance_within_drawing(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)

    # Create a drawing occupying center area
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "drawing",
            "source_sheet_number": 1,
            "bounding_box": [100, 100, 900, 900],
            "title": "Main Plan",
        },
    )
    assert r.status_code == 201, r.text
    drawing = r.json()

    # Create a legend and a symbol definition on sheet 1
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "legend",
            "source_sheet_number": 1,
            "bounding_box": [10, 10, 200, 200],
            "title": "Legend",
        },
    )
    assert r.status_code == 201
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_definition",
            "source_sheet_number": 1,
            "bounding_box": [20, 20, 60, 60],
            "name": "W1",
            "description": "Window",
            "scope": "sheet",
            "defined_in_id": None,
        },
    )
    assert r.status_code == 201, r.text
    sym_def = r.json()

    # Create symbol instance inside drawing
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_instance",
            "source_sheet_number": 1,
            "bounding_box": [400, 400, 420, 420],
            "symbol_definition_id": sym_def["id"],
            "recognized_text": "W1",
        },
    )
    assert r.status_code == 201, r.text
    inst = r.json()
    assert inst["instantiated_in_id"] == drawing["id"]


def test_instance_must_be_inside_drawing(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)

    # No drawing yet; create definition
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_definition",
            "source_sheet_number": 1,
            "bounding_box": [20, 20, 60, 60],
            "name": "W1",
            "scope": "project",
        },
    )
    assert r.status_code == 201
    sym_def = r.json()

    # Try to create instance without drawing: should 422
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_instance",
            "source_sheet_number": 1,
            "bounding_box": [400, 400, 420, 420],
            "symbol_definition_id": sym_def["id"],
        },
    )
    assert r.status_code == 422
    assert "within a drawing" in r.json()["detail"].lower()


def test_cannot_delete_definition_with_instances(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Create drawing
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "drawing",
            "source_sheet_number": 1,
            "bounding_box": [100, 100, 900, 900],
        },
    )
    assert r.status_code == 201
    # Create definition
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_definition",
            "source_sheet_number": 1,
            "bounding_box": [20, 20, 60, 60],
            "name": "W1",
            "scope": "project",
        },
    )
    sym_def = r.json()
    # Create instance
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_instance",
            "source_sheet_number": 1,
            "bounding_box": [400, 400, 420, 420],
            "symbol_definition_id": sym_def["id"],
        },
    )
    assert r.status_code == 201
    # Try delete def
    r = client.delete(f"/api/projects/{pid}/entities/{sym_def['id']}")
    assert r.status_code == 422
    assert "cannot delete" in r.json()["detail"].lower()


def test_update_instance_relocates_to_drawing(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Two drawings side-by-side
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "drawing",
            "source_sheet_number": 1,
            "bounding_box": [0, 0, 500, 1000],
        },
    )
    d1 = r.json()
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "drawing",
            "source_sheet_number": 1,
            "bounding_box": [500, 0, 1000, 1000],
        },
    )
    d2 = r.json()
    # Definition
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_definition",
            "source_sheet_number": 1,
            "bounding_box": [20, 20, 60, 60],
            "name": "W1",
            "scope": "project",
        },
    )
    sym_def = r.json()
    # Instance inside d1
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_instance",
            "source_sheet_number": 1,
            "bounding_box": [200, 100, 220, 120],
            "symbol_definition_id": sym_def["id"],
        },
    )
    inst = r.json()
    assert inst["instantiated_in_id"] == d1["id"]
    # Move to d2 via patch
    r = client.patch(
        f"/api/projects/{pid}/entities/{inst['id']}",
        json={"bounding_box": [700, 100, 720, 120]},
    )
    assert r.status_code == 200
    moved = r.json()
    assert moved["instantiated_in_id"] == d2["id"]


