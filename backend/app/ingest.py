import os, json, time, traceback
import fitz  # PyMuPDF
from typing import Optional, Dict, Any

BASE_DIR = os.environ.get("TIMBERGEM_PROJECTS_DIR", "projects")

# ---------- Manifest Utilities ----------


def project_dir(project_id: str) -> str:
    return os.path.join(BASE_DIR, project_id)


def manifest_path(project_id: str) -> str:
    return os.path.join(project_dir(project_id), "manifest.json")


def read_manifest(project_id: str) -> Optional[Dict[str, Any]]:
    try:
        with open(manifest_path(project_id), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def atomic_write(path: str, data: Dict[str, Any]):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def write_manifest(project_id: str, data: Dict[str, Any]):
    os.makedirs(project_dir(project_id), exist_ok=True)
    atomic_write(manifest_path(project_id), data)


def init_manifest(project_id: str):
    m = {
        "project_id": project_id,
        "status": "queued",
        "num_pages": None,
        "stages": {"render": {"done": 0, "total": 0}, "ocr": {"done": 0, "total": 0}},
        "started_at": time.time(),
        "completed_at": None,
        "error": None,
    }
    write_manifest(project_id, m)
    return m


def patch_manifest(project_id: str, **updates):
    m = read_manifest(project_id)
    if not m:
        return
    for k, v in updates.items():
        if isinstance(v, dict) and k in m and isinstance(m[k], dict):
            m[k].update(v)
        else:
            m[k] = v
    write_manifest(project_id, m)


# ---------- Ingestion Logic ----------


def ingest_pdf(project_id: str, pdf_path: str, dpi: int = 300):
    try:
        patch_manifest(project_id, status="render")
        doc = fitz.open(pdf_path)
        num_pages = doc.page_count
        patch_manifest(
            project_id,
            num_pages=num_pages,
            stages={
                "render": {"done": 0, "total": num_pages},
                "ocr": {"done": 0, "total": num_pages},
            },
        )
        pdir = project_dir(project_id)
        pages_dir = os.path.join(pdir, "pages")
        ocr_dir = os.path.join(pdir, "ocr")
        os.makedirs(pages_dir, exist_ok=True)
        os.makedirs(ocr_dir, exist_ok=True)

        render_matrix = fitz.Matrix(dpi / 72, dpi / 72)

        # Render stage
        for i in range(num_pages):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=render_matrix, alpha=False)
            pix.save(os.path.join(pages_dir, f"page_{i+1}.png"))
            # update render progress
            m = read_manifest(project_id)
            if m:
                m["stages"]["render"]["done"] = i + 1
                write_manifest(project_id, m)

        # OCR stage
        patch_manifest(project_id, status="ocr")
        for i in range(num_pages):
            page = doc.load_page(i)
            raw = page.get_text("dict")
            simplified = {
                "page_number": i + 1,
                "width_pts": page.rect.width,
                "height_pts": page.rect.height,
                "blocks": [],
            }
            for b in raw.get("blocks", []):
                if b.get("type") != 0:
                    continue
                block_entry = {"bbox": list(b.get("bbox", [])), "lines": [], "text": ""}
                lines_text = []
                for line in b.get("lines", []):
                    line_entry = {"bbox": list(line.get("bbox", [])), "spans": []}
                    for span in line.get("spans", []):
                        span_entry = {
                            "bbox": list(span.get("bbox", [])),
                            "text": span.get("text", ""),
                            "font": span.get("font", ""),
                            "size": span.get("size", 0),
                        }
                        line_entry["spans"].append(span_entry)
                    lines_text.append("".join(s["text"] for s in line_entry["spans"]))
                    block_entry["lines"].append(line_entry)
                block_entry["text"] = "\n".join(lines_text)
                simplified["blocks"].append(block_entry)
            with open(os.path.join(ocr_dir, f"page_{i+1}.json"), "w") as f:
                json.dump(simplified, f)
            m = read_manifest(project_id)
            if m:
                m["stages"]["ocr"]["done"] = i + 1
                write_manifest(project_id, m)

        patch_manifest(project_id, status="complete", completed_at=time.time())
    except Exception as e:
        patch_manifest(project_id, status="error", error=str(e))
        traceback.print_exc()


__all__ = [
    "ingest_pdf",
    "init_manifest",
    "read_manifest",
    "manifest_path",
    "project_dir",
]
