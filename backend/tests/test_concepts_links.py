import os
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app import ingest as ingest_mod


client = TestClient(app)


def _create_project(tmp_path, monkeypatch):
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    monkeypatch.setattr(ingest_mod, "BASE_DIR", str(tmp_path), raising=False)
    pid = "proj_concepts"
    pdir = os.path.join(str(tmp_path), pid)
    os.makedirs(os.path.join(pdir, "pages"), exist_ok=True)
    os.makedirs(os.path.join(pdir, "ocr"), exist_ok=True)
    with open(os.path.join(pdir, "manifest.json"), "w") as f:
        f.write(
            """
{"project_id":"proj_concepts","status":"complete","num_pages":1,"stages":{"render":{"done":1,"total":1},"ocr":{"done":1,"total":1}},"started_at":0,"completed_at":0,"error":null}
""".strip()
        )
    with open(os.path.join(pdir, "ocr", "page_1.json"), "w") as f:
        f.write(
            """
{"page_number":1,"width_pts":1000,"height_pts":1000,"blocks":[]}
""".strip()
        )
    return pid


def test_concepts_create_and_list(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Create space
    r = client.post(f"/api/projects/{pid}/concepts", json={"kind": "space", "name": "Kitchen"})
    assert r.status_code == 201, r.text
    space = r.json()
    assert space["kind"] == "space" and space["name"] == "Kitchen"
    # Create scope
    r = client.post(f"/api/projects/{pid}/concepts", json={"kind": "scope", "description": "Install cabinets", "category": "Millwork"})
    assert r.status_code == 201
    scope = r.json()
    assert scope["kind"] == "scope" and scope["description"].startswith("Install")
    # List
    r = client.get(f"/api/projects/{pid}/concepts")
    assert r.status_code == 200
    kinds = sorted([c["kind"] for c in r.json()])
    assert kinds == ["scope", "space"]


def test_links_allowed_and_rejected(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Visuals: drawing and instance
    r = client.post(f"/api/projects/{pid}/entities", json={"entity_type": "drawing", "source_sheet_number": 1, "bounding_box": [100, 100, 900, 900], "title": "Plan"})
    assert r.status_code == 201
    drawing = r.json()
    r = client.post(f"/api/projects/{pid}/entities", json={"entity_type": "symbol_definition", "source_sheet_number": 1, "bounding_box": [20, 20, 60, 60], "name": "SYM", "scope": "project"})
    sym_def = r.json()
    r = client.post(f"/api/projects/{pid}/entities", json={"entity_type": "symbol_instance", "source_sheet_number": 1, "bounding_box": [200, 200, 220, 220], "symbol_definition_id": sym_def["id"]})
    assert r.status_code == 201
    inst = r.json()
    # Concepts
    space = client.post(f"/api/projects/{pid}/concepts", json={"kind": "space", "name": "Kitchen"}).json()
    scope = client.post(f"/api/projects/{pid}/concepts", json={"kind": "scope", "description": "Install cabinets"}).json()

    # Allowed: DEPICTS (drawing -> space)
    r = client.post(f"/api/projects/{pid}/links", json={"rel_type": "DEPICTS", "source_id": drawing["id"], "target_id": space["id"]})
    assert r.status_code == 201, r.text
    # Duplicate prevented
    r = client.post(f"/api/projects/{pid}/links", json={"rel_type": "DEPICTS", "source_id": drawing["id"], "target_id": space["id"]})
    assert r.status_code == 422

    # Allowed: LOCATED_IN (instance -> space)
    r = client.post(f"/api/projects/{pid}/links", json={"rel_type": "LOCATED_IN", "source_id": inst["id"], "target_id": space["id"]})
    assert r.status_code == 201

    # Allowed: JUSTIFIED_BY (scope -> instance)
    r = client.post(f"/api/projects/{pid}/links", json={"rel_type": "JUSTIFIED_BY", "source_id": scope["id"], "target_id": inst["id"]})
    assert r.status_code == 201

    # Rejected: reversed DEPICTS
    r = client.post(f"/api/projects/{pid}/links", json={"rel_type": "DEPICTS", "source_id": space["id"], "target_id": drawing["id"]})
    assert r.status_code == 422

    # Filter list
    r = client.get(f"/api/projects/{pid}/links", params={"rel_type": "DEPICTS"})
    assert r.status_code == 200 and len(r.json()) == 1


def test_delete_guards_for_linked_entities_and_concepts(tmp_path, monkeypatch):
    pid = _create_project(tmp_path, monkeypatch)
    # Setup
    drawing = client.post(f"/api/projects/{pid}/entities", json={"entity_type": "drawing", "source_sheet_number": 1, "bounding_box": [0, 0, 100, 100]}).json()
    space = client.post(f"/api/projects/{pid}/concepts", json={"kind": "space", "name": "Room"}).json()
    # Link drawing -> space
    link = client.post(f"/api/projects/{pid}/links", json={"rel_type": "DEPICTS", "source_id": drawing["id"], "target_id": space["id"]}).json()
    # Try delete concept: blocked
    r = client.delete(f"/api/projects/{pid}/concepts/{space['id']}")
    assert r.status_code == 422
    # Try delete entity: blocked
    r = client.delete(f"/api/projects/{pid}/entities/{drawing['id']}")
    assert r.status_code == 422
    # Remove link then delete both OK
    r = client.delete(f"/api/projects/{pid}/links/{link['id']}")
    assert r.status_code == 200
    r = client.delete(f"/api/projects/{pid}/concepts/{space['id']}")
    assert r.status_code == 200
    r = client.delete(f"/api/projects/{pid}/entities/{drawing['id']}")
    assert r.status_code == 200


