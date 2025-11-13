import os
from fastapi.testclient import TestClient
from app.main import app
from backend.app import ingest as ingest_mod


client = TestClient(app)


def _create_project(tmp_path, monkeypatch):
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    monkeypatch.setattr(ingest_mod, "BASE_DIR", str(tmp_path), raising=False)
    pid = "proj_defs"
    pdir = os.path.join(str(tmp_path), pid)
    os.makedirs(os.path.join(pdir, "pages"), exist_ok=True)
    os.makedirs(os.path.join(pdir, "ocr"), exist_ok=True)
    with open(os.path.join(pdir, "manifest.json"), "w") as f:
        f.write(
            """
{"project_id":"proj_defs","status":"complete","num_pages":1,"stages":{"render":{"done":1,"total":1},"ocr":{"done":1,"total":1}},"started_at":0,"completed_at":0,"error":null}
""".strip()
        )
    with open(os.path.join(pdir, "ocr", "page_1.json"), "w") as f:
        f.write(
            """
{"page_number":1,"width_pts":1000,"height_pts":1000,"blocks":[]}
""".strip()
        )
    return pid


def test_symbol_definition_auto_defined_in_legend(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Legend box
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={"entity_type": "legend", "source_sheet_number": 1, "bounding_box": [10, 10, 200, 200], "title": "Legend"},
    )
    assert r.status_code == 201
    legend = r.json()
    # Definition overlapping legend, without defined_in_id
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "symbol_definition",
            "source_sheet_number": 1,
            "bounding_box": [20, 20, 60, 60],
            "name": "W1",
            "scope": "sheet",
        },
    )
    assert r.status_code == 201, r.text
    sym_def = r.json()
    assert sym_def.get("defined_in_id") == legend["id"]


def test_component_definition_auto_defined_in_schedule_on_move(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Schedule box on right side
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={"entity_type": "schedule", "source_sheet_number": 1, "bounding_box": [600, 100, 900, 400], "title": "Schedule"},
    )
    assert r.status_code == 201
    schedule = r.json()
    # Component definition away from schedule
    r = client.post(
        f"/api/projects/{pid}/entities",
        json={
            "entity_type": "component_definition",
            "source_sheet_number": 1,
            "bounding_box": [100, 100, 200, 160],
            "name": "Door",
            "scope": "sheet",
        },
    )
    comp_def = r.json()
    assert comp_def.get("defined_in_id") in (None, "")
    # Move to intersect schedule -> defined_in_id should auto-update
    r = client.patch(
        f"/api/projects/{pid}/entities/{comp_def['id']}",
        json={"bounding_box": [620, 120, 860, 200]},
    )
    assert r.status_code == 200, r.text
    moved = r.json()
    assert moved.get("defined_in_id") == schedule["id"]


