# Timbergem Backend (Prototype)

Minimal ingestion service for converting uploaded PDFs into page rasters and OCR JSON artifacts.

## Features
- FastAPI application
- Sequential PDF ingestion (render + OCR) with progress manifest
- 300 DPI PNG rendering (PyMuPDF)
- Simplified structured text extraction (`page.get_text('dict')`)
- Atomic manifest updates (`manifest.json`) for polling

## Project Layout
```
backend/
  app/
    main.py            # FastAPI entrypoint
    ingest.py          # Ingestion + manifest utilities
  requirements.txt
projects/{project_id}/
  original.pdf
  manifest.json
  pages/page_1.png
  ocr/page_1.json
```

## Running (Development)
Install deps:
```
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```
Run server:
```
uvicorn backend.app.main:app --reload
```
Upload PDF (example using curl):
```
curl -F file=@sample_docs/example.pdf http://localhost:8000/api/projects
```
Poll status:
```
curl http://localhost:8000/api/projects/<project_id>/status
```
Fetch a page image:
```
curl -O http://localhost:8000/api/projects/<project_id>/pages/1.png
```
Fetch OCR JSON:
```
curl http://localhost:8000/api/projects/<project_id>/ocr/1 | jq
```

## Notes
- All coordinates in OCR JSON are PDF point space (unrotated, origin top-left).
- Rendering & OCR are sequential to keep memory low.
- Future: replace BackgroundTasks with a queue + workers without changing API contracts.
