# Copilot Instructions for Timbergem

## Project Overview
Timbergem is an AI-augmented tool for construction takeoff and estimation, transforming static construction documents into a dynamic, queryable knowledge graph. The system is designed for manual-first workflows, with AI features layered on top to accelerate (not replace) expert-driven processes.

## Architecture & Data Flow
- **Three-Pane Workspace:**
  - **Left:** Sheet navigator (by `sheet_number`)
  - **Center:** Canvas for high-res sheet images, panning/zooming, and bounding box annotations
  - **Right:** Knowledge Panel for CRUD on knowledge graph entities (see below)
- **Data Model:**
  - All visual entities are anchored to a `source_sheet_number` and `bounding_box`.
  - Core entities: `Drawing`, `Legend`, `Schedule`, `Note`, `SymbolDefinition`, `ComponentDefinition`, `SymbolInstance`, `ComponentInstance`, `Space`, `Material`, `Assembly`, `Scope`.
  - Relationships (see PRD.md §4.2): e.g., `CONTAINS`, `DEFINED_IN`, `INSTANTIATED_AT`, `JUSTIFIED_BY`.
- **AI Automation:**
  - Each entity section in the UI has an `[AI] Detect` button to trigger backend detection. All AI-created entities are flagged as "Unverified" for user review.

## Developer Workflows
- **Manual-First:** All features must be usable without AI. AI is an accelerator, not a requirement.
- **PDF Ingestion:**
  - Upload triggers: PDF → PNG rendering, layout-aware OCR, asset storage per project.
- **Knowledge Graph Construction:**
  - Entities are created by drawing bounding boxes and filling forms in the Knowledge Panel.
  - Linking is done via a "Linking Mode" for associating evidence (entities, annotations) to conceptual nodes (e.g., `Scope`).
- **Data Model Source of Truth:**
  - All schema changes must be reflected in the Pydantic models (see `PRD.md` §4.1).

## Project Conventions
- **Traceability:** Every entity and relationship must be traceable to its document source (sheet + bounding box).
- **Flexibility:** Data model and UI must handle nonstandard, messy document layouts.
- **Extensibility:** New entity/relationship types should be easy to add (see Pydantic models in `PRD.md`).

## Key Files & References
- `PRD.md`: Product requirements, data model, and relationship schema
- `sample_docs/`: Example construction documents for testing

## Example Patterns
- **Entity Creation:** Always require `source_sheet_number` and `bounding_box` for visual entities.
- **AI Detection:** All AI-generated entities must be flagged as "Unverified" and require user confirmation.
- **Linking:** Use "Linking Mode" to associate conceptual entities (e.g., `Scope`) with evidence (notes, symbols, components) via UI selection.

## External Integrations
- **OCR & PDF Processing:** Backend must support high-res rendering and layout-aware OCR for accurate entity anchoring.
- **No hardcoded assumptions:** Always expect document structure and content to vary widely.

## PyMuPDF Coordinate Grounding
Accurate mapping between frontend canvas boxes and PDF space is critical.

- **Canonical Space:** Store and reason in PyMuPDF (MuPDF) page coordinates (origin top-left, y increases downward, units = PDF points @ 72 DPI).
- **Frontend Canvas:** Treat canvas coords as a scaled copy of the rendered PNG. Maintain: `scale_x = rendered_width / page_width_pts`, `scale_y = rendered_height / page_height_pts`.
- **Box Mapping:** Given a canvas box `(cx1, cy1, cx2, cy2)` → PDF/MuPDF: `px1 = cx1 / scale_x`, etc. Always normalize so `x1 < x2`, `y1 < y2` before storing.
- **HiDPI / CSS Pixels:** If using device pixel ratio `dpr`, raw browser coords often = CSS * dpr. Ensure you divide by `dpr` before applying scale inversion.
- **Rotation Handling:** If pages are rotated on render (e.g., 90°), use PyMuPDF `page.rotation` and precompute a transform matrix `M = fitz.Matrix(rotation)`. Apply inverse before persistence so DB boxes are always unrotated page space.
- **Validation Step:** After saving, optionally re-project stored PDF-space box forward and assert |forward - original_canvas| < 1px tolerance.
- **Zoom / Pan Independence:** Do NOT store boxes in viewport space; always convert immediate pointer events → canvas → PDF space once at creation/edit time.
- **Image Export Consistency:** When rasterizing (`page.get_pixmap(matrix=fitz.Matrix(zoom))`), effective pixel size = `page_width_pts * 72/72 * zoom`. Keep `rendered_width = pix.width` to recompute `scale_x` on load.
- **Precision:** Keep 3–4 decimal places in storage (float) to avoid cumulative drift; round only for display.
- **Sanity Checks:** Reject boxes that extend outside `page.rect` (allow tiny epsilon of 0.5 pt). Clamp before writing.
- **Transform Utility:** Implement a single helper (e.g., `convert_canvas_box_to_pdf(box, render_meta)`) used everywhere to avoid drift / duplicated math.
- **Shared Helpers Implemented:**
  - Backend: `backend/app/coords.py` exports `RenderMeta`, `canvas_to_pdf`, `pdf_to_canvas`, and a roundtrip helper. Extend these rather than creating new math paths.
  - Frontend: `frontend/src/utils/coords.ts` mirrors backend logic; any divergence must include test coverage proving equivalence.
  - Tests: `backend/tests/test_coords.py` and `frontend/src/utils/__tests__/coords.test.ts` must be updated for any change impacting transforms (include rotation, scaling, clamping edge cases).
- **Back Conversion Example:** For highlight overlays: fetch stored PDF box → multiply by current scale(s) → apply `dpr` → draw on canvas.
- **Invariant:** All persisted `bounding_box` values are always in unrotated MuPDF page coordinates.

---
For more details, see `PRD.md`. When in doubt, prioritize manual-first, traceable, and flexible workflows.

## Backend Ingestion & Processing Workflow
This section codifies the minimal ingestion pipeline and conventions so future changes stay aligned.

### Tech Stack (Initial Phase)
- FastAPI for HTTP API + lightweight background tasks (upgrade path: Celery/RQ if needed)
- PyMuPDF (fitz) for: page count, page rendering (300 DPI PNG), structured text (`page.get_text('dict')`)
- Storage: filesystem under `projects/{project_id}` acts as source of truth for generated artifacts in early iterations
- Pydantic models for response schemas (status, errors) once stabilized

### Directory Layout (Per Project)
```
projects/{project_id}/
  original.pdf
  manifest.json              # authoritative status + progress
  pages/                     # rendered page rasters
    page_1.png
    page_2.png
  ocr/                       # structured OCR output per page (JSON)
    page_1.json
    page_2.json
  logs/
    ingest.log (optional later)
```

### Manifest Schema (Incremental)
```
{
  "project_id": "...",
  "status": "queued" | "render" | "ocr" | "complete" | "error",
  "num_pages": 12,
  "stages": {
    "render": {"done": 3, "total": 12},
    "ocr": {"done": 0, "total": 12}
  },
  "started_at": 1736423423.234,
  "completed_at": null,
  "error": null
}
```

### Status Flow
1. `queued` → file stored, manifest initialized
2. `render` → pages rasterized to 300 DPI PNG (sequential)
3. `ocr` → structured text extraction (PyMuPDF dict) per page
4. `complete` OR `error` with `error` message

### Coordinate Mapping Consistency
- All OCR block / line / span bounding boxes are already in PDF point space from PyMuPDF; treat them as canonical.
- Frontend renders raster width/height → compute `scale_x = raster_w / page_width_pts` (same principle as annotation mapping rules above).
- Never convert OCR data to pixel coordinates for storage; derive on demand in client.

### Rendering Rules
- DPI baseline: 300 (Matrix: `fitz.Matrix(300/72, 300/72)`).
- PNG export no alpha unless transparency becomes semantically useful.
- Filenames stable, 1-based page numbering (`page_{n}.png`).

### OCR Simplification
- Source: `page.get_text('dict')`.
- Include only text blocks (`block['type'] == 0`).
- Flatten spans under each line; provide aggregated block `text` (joined line texts with `\n`).
- Defer advanced layout (tables, columns) to a later phase; design JSON to be forward-compatible.

### API Endpoints (Initial)
- `POST /api/projects` (multipart pdf) → `{ project_id, status }`
- `GET /api/projects/{project_id}/status` → manifest JSON
- `GET /api/projects/{project_id}/pages/{n}.png` → page image
- `GET /api/projects/{project_id}/ocr/{n}` → OCR JSON

### Frontend Interaction
- After successful upload, poll status every 1–2s until `complete` or `error`.
- Use manifest progress counters to display per-stage progress bars (render vs ocr) once UI adds them.
- When a page is viewed, fetch backend raster PNG (`/pages/{n}.png`) lazily; retain pdf.js rendering only as a temporary fallback until the PNG arrives (ensures identical coordinate basis with OCR).
- OCR overlay: user-controlled toggle (store `showOcr`) rendering `<OcrOverlay />` which converts each block `bbox` (PDF pts) → canvas pixels via shared coord helpers, drawn as semi-transparent orange rectangles.

### Error Handling Conventions
- Any exception sets `status = error` and writes `error` string in manifest.
- 404 for missing project/page/ocr files.
- Avoid partial writes: write manifest via atomic replace (temp file rename).

### Scaling / Future Upgrades
- Swap filesystem for object storage (S3) → same relative paths inside bucket.
- Introduce job queue: keep manifest contract identical so frontend unchanged.
- Add WebSocket push layer later; polling remains fallback.

### Testing Guidelines (Early Phase)
- Unit: manifest utilities (read/write/update) pure functions.
- Smoke: ingest a small 2-page PDF in temp dir, assert produced files & status flow.

### Performance Notes
- Sequential page processing reduces peak memory; each pixmap freed after save.
- PyMuPDF text extraction is usually fast enough; parallelization deferred.

### Security / Validation
- Enforce max PDF size (configurable) before ingest.
- Reject non-PDF MIME types early.
- Project IDs are random hex; no user enumeration risk in simple prototype.

### Invariants
- Manifest is single source of truth for progress & status.
- All bounding boxes in persisted artifacts are in unrotated PDF coordinate space.
- Frontend never trusts client-computed dimensions for OCR; always derive scale from actual raster dimensions.

---
Backend contributors must follow these guidelines to maintain traceability, coordinate correctness, and incremental evolvability.
