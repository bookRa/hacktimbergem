import io, json, os, time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"  # minimal invalid-ish pdf placeholder


def test_upload_and_status_flow(tmp_path, monkeypatch):
    # Override BASE_DIR via env
    monkeypatch.setenv("TIMBERGEM_PROJECTS_DIR", str(tmp_path))
    # NOTE: This PDF is not a valid full PDF; in real test supply a tiny valid sample.
    # Here we mainly exercise endpoint wiring (will likely error in ingestion -> error state).
    files = {"file": ("sample.pdf", SAMPLE_PDF_BYTES, "application/pdf")}
    r = client.post("/api/projects", files=files)
    assert r.status_code == 200
    pid = r.json()["project_id"]
    # Poll a couple times
    for _ in range(3):
        s = client.get(f"/api/projects/{pid}/status")
        if s.status_code != 200:
            break
        data = s.json()
        assert "status" in data
        if data["status"] in ("complete", "error"):
            break
        time.sleep(0.2)
