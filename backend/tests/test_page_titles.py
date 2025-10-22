"""Test page titles persistence in manifest."""
import os
import json
import pytest
from app.ingest import init_manifest, read_manifest, project_dir


def _create_project(tmp_path, monkeypatch):
    """Create a test project with manifest."""
    # Ensure backend uses tmp_path as projects dir
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    import app.ingest as ingest_module
    ingest_module.BASE_DIR = str(tmp_path)
    
    project_id = "test_page_titles_proj"
    os.makedirs(project_dir(project_id), exist_ok=True)
    init_manifest(project_id)
    return project_id


def test_init_manifest_includes_page_titles(tmp_path, monkeypatch):
    """Verify new manifests include page_titles field."""
    pid = _create_project(tmp_path, monkeypatch)
    manifest = read_manifest(pid)
    
    assert manifest is not None
    assert "page_titles" in manifest
    assert manifest["page_titles"] == {}


def test_update_page_title_via_api(tmp_path, monkeypatch):
    """Test updating a single page title via the PATCH endpoint."""
    # Create project
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    import app.ingest as ingest_module
    ingest_module.BASE_DIR = str(tmp_path)
    import app.main as main_module
    
    # Monkey-patch project_dir in main module to use tmp_path
    original_project_dir = main_module.project_dir
    main_module.project_dir = lambda pid: os.path.join(str(tmp_path), pid)
    
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)
        
        # Create project
        pid = "test_patch_title"
        os.makedirs(os.path.join(str(tmp_path), pid), exist_ok=True)
        init_manifest(pid)
        
        # Update page title for page 0
        response = client.patch(
            f"/api/projects/{pid}/page-titles",
            json={"page_index": 0, "text": "Sheet 1 - Floor Plan"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["page_index"] == 0
        assert data["text"] == "Sheet 1 - Floor Plan"
        
        # Verify manifest was updated
        manifest = read_manifest(pid)
        assert manifest is not None
        assert "page_titles" in manifest
        assert "0" in manifest["page_titles"]
        assert manifest["page_titles"]["0"] == "Sheet 1 - Floor Plan"
        
        # Update another page
        response = client.patch(
            f"/api/projects/{pid}/page-titles",
            json={"page_index": 1, "text": "Sheet 2 - Elevation"}
        )
        assert response.status_code == 200
        
        # Verify both titles exist
        manifest = read_manifest(pid)
        assert len(manifest["page_titles"]) == 2
        assert manifest["page_titles"]["0"] == "Sheet 1 - Floor Plan"
        assert manifest["page_titles"]["1"] == "Sheet 2 - Elevation"
        
        # Update first title again (should replace)
        response = client.patch(
            f"/api/projects/{pid}/page-titles",
            json={"page_index": 0, "text": "Sheet 1 - Updated Floor Plan"}
        )
        assert response.status_code == 200
        
        manifest = read_manifest(pid)
        assert manifest["page_titles"]["0"] == "Sheet 1 - Updated Floor Plan"
        assert manifest["page_titles"]["1"] == "Sheet 2 - Elevation"
        
    finally:
        # Restore original project_dir
        main_module.project_dir = original_project_dir


def test_backwards_compatibility_no_page_titles(tmp_path, monkeypatch):
    """Test that old manifests without page_titles don't break."""
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    import app.ingest as ingest_module
    ingest_module.BASE_DIR = str(tmp_path)
    
    # Create an old-style manifest without page_titles
    pid = "test_old_manifest"
    os.makedirs(project_dir(pid), exist_ok=True)
    
    old_manifest = {
        "project_id": pid,
        "status": "complete",
        "num_pages": 3,
        "stages": {"render": {"done": 3, "total": 3}, "ocr": {"done": 3, "total": 3}},
        # Note: no page_titles field
    }
    
    manifest_path = os.path.join(project_dir(pid), "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(old_manifest, f)
    
    # Verify we can read it
    manifest = read_manifest(pid)
    assert manifest is not None
    assert "page_titles" not in manifest  # Old manifest doesn't have it
    
    # Now test the API endpoint handles it gracefully
    from fastapi.testclient import TestClient
    from app.main import app
    import app.main as main_module
    
    original_project_dir = main_module.project_dir
    main_module.project_dir = lambda project_id: os.path.join(str(tmp_path), project_id)
    
    try:
        client = TestClient(app)
        
        # Update a page title - should add page_titles field
        response = client.patch(
            f"/api/projects/{pid}/page-titles",
            json={"page_index": 0, "text": "New Title"}
        )
        
        assert response.status_code == 200
        
        # Verify page_titles was added
        manifest = read_manifest(pid)
        assert "page_titles" in manifest
        assert manifest["page_titles"]["0"] == "New Title"
        
    finally:
        main_module.project_dir = original_project_dir

