---
description: Timbergem core invariants, architecture, and guardrails. Always apply.
globs:
alwaysApply: true
---

- Purpose: Provide non-negotiable principles so all changes preserve traceability, coordinate correctness, and manual-first UX.

- Architecture overview (see @.github/copilot-instructions.md and @PRD.md):
  - Three-pane UI: left sheet navigator, center raster canvas, right knowledge panel.
  - Source of truth: per-project filesystem under `projects/{project_id}` with `manifest.json`, `pages/`, `ocr/`, and `entities.json`.
  - Manual-first: All core workflows must work without AI; AI is an accelerator with explicit user verification.

- Coordinate system invariants (canonical PDF/MuPDF space):
  - Persist ALL `bounding_box` values in unrotated PDF point space (origin top-left, y increases downward).
  - Frontend canvas space is a scaled raster (PNG) view. Always convert at boundaries using shared helpers.
  - Use shared helpers only:
    - Backend: @backend/app/coords.py
    - Frontend: @frontend/src/utils/coords.ts
  - Never duplicate transform math. If behavior changes, update both helpers and tests:
    - Backend tests: @backend/tests/test_coords.py
    - Frontend tests: @frontend/src/utils/__tests__/coords.test.ts
  - Handle rotation with supported values {0, 90, 180, 270}. Persist unrotated boxes.
  - Clamp PDF-space boxes to page rect with epsilon = 0.5 pt. Reject NaNs or unreasonable magnitudes.
  - Do not store viewport/DOM-relative coords; convert pointer events → canvas → PDF space at creation/edit time.

- Rendering and OCR contracts:
  - Baseline raster: 300 DPI PNG, filenames `page_{n}.png`, 1-based page numbering.
  - OCR via PyMuPDF `page.get_text('dict')`, include only text blocks (type 0), flatten spans, provide aggregated block text.
  - OCR JSON bbox values are in PDF points. Treat them as canonical; convert on demand in client overlays.

- Manifest is the single source of truth for pipeline progress:
  - Status flow: queued → render → ocr → complete|error.
  - Update progress counters monotonically; write via atomic replace to avoid partial writes.

- Entities and traceability:
  - Each visual entity requires `source_sheet_number` (1-based) and a PDF-space `bounding_box` with x2>x1 and y2>y1.
  - Persist entities to `projects/{project_id}/entities.json`. Use stable IDs. Support list/create/patch/delete endpoints.

- Testing & validation policy:
  - Any change affecting transforms must update both backend and frontend tests, covering rotation, scaling, and clamping.
  - Prefer roundtrip property tests (canvas→pdf→canvas ≈ identity within tolerance) and cross-impl equivalence.

- Error handling and UX guarantees:
  - Backend returns clear 4xx messages for validation issues and 404 for missing resources.
  - Frontend shows resilient toasts for failures and never blocks manual workflows.

- Extensibility guidelines:
  - New entity types must be added in Pydantic models, file store, API contracts, frontend API types, store, and overlay rendering.

@.github/copilot-instructions.md
@PRD.md
@backend/app/coords.py
@frontend/src/utils/coords.ts
@backend/tests/test_coords.py
@frontend/src/utils/__tests__/coords.test.ts

---
description: Backend ingestion, manifest contract, raster/OCR generation. Auto-attach to backend ingest files.
globs:
  - backend/app/ingest.py
  - backend/app/main.py
alwaysApply: false
---

- Follow ingestion workflow:
  1. `queued` → file persisted and manifest initialized via `init_manifest()`.
  2. `render` → rasterize each page to 300 DPI PNG as `pages/page_{n}.png`.
  3. `ocr` → write simplified `ocr/page_{n}.json` from `page.get_text('dict')` including only text blocks.
  4. `complete` or `error` with `error` message.

- Use atomic manifest writes only (temp file rename). Update progress counters after each page.

- Rasterization:
  - Matrix: `fitz.Matrix(dpi/72, dpi/72)` with `alpha=False`.
  - Free or drop references to `pix` promptly in loops to limit memory.

- OCR JSON shape (incremental, forward-compatible):
  - `width_pts`, `height_pts`, `blocks[]` with `bbox`, `lines[].bbox`, `lines[].spans[]` (text/font/size), and flattened `text` per block.
  - Do not project OCR coords into pixel space for storage.

- Endpoints to keep stable (see @backend/app/main.py):
  - `POST /api/projects` (multipart PDF) → `{ project_id, status }`, start background ingest.
  - `GET /api/projects/{project_id}/status` → manifest JSON.
  - `GET /api/projects/{project_id}/pages/{n}.png` → page image.
  - `GET /api/projects/{project_id}/ocr/{n}` → OCR JSON.

- Validation and errors:
  - Reject non-PDF uploads with 400.
  - Status 404 for missing project/page/ocr.
  - On exceptions: set `status=error`, write `error`, log stack for debugging.

- Future-proofing:
  - Keep directory layout and filenames stable to enable S3 swap without changing client code.

@backend/app/ingest.py
@backend/app/main.py

---
description: Backend entities models, validation, and file persistence. Auto-attach to entities files.
globs:
  - backend/app/entities_models.py
  - backend/app/entities_store.py
  - backend/app/main.py
alwaysApply: false
---

- Data model source of truth: Pydantic models define schema and validations. Update UI/API/types in lockstep.

- Bounding boxes:
  - Store as `BoundingBox` in unrotated PDF point space with invariants x2>x1, y2>y1.
  - For inputs that arrive as arrays, coerce to float and validate length=4 and monotonic edges.

- Create/update/delete behavior (see @backend/app/entities_store.py):
  - `create_entity` generates UUID id, validates bbox, dispatches by `entity_type` to concrete classes.
  - `update_entity` supports updating `bounding_box` and `title`/`text` fields per entity kind.
  - `delete_entity` removes by id. Treat unknown types gracefully on load.
  - Persist via atomic file writes to `projects/{project_id}/entities.json`.

- API endpoints (see @backend/app/main.py):
  - `GET /api/projects/{project_id}/entities` returns list[EntityUnion]. 404 if project missing.
  - `POST /api/projects/{project_id}/entities` accepts CreateEntityUnion. Validate bbox numeric length 4 early; return 422 on validation failures.
  - `PATCH /api/projects/{project_id}/entities/{id}` accepts partial updates for bbox/title/text with validations; 404 if entity not found.
  - `DELETE /api/projects/{project_id}/entities/{id}` returns `{ deleted: true }` or 404.

- Extending entity types:
  - Add Pydantic classes and `Create*` variants with literal discriminators.
  - Update union types, store dispatch map, frontend API types, overlays, and store actions.

@backend/app/entities_models.py
@backend/app/entities_store.py
@backend/app/main.py

---
description: Frontend coordinate transforms, OCR/Entities overlays, and rotation/scale handling. Auto-attach to overlay and coord files.
globs:
  - frontend/src/utils/coords.ts
  - frontend/src/components/OcrOverlay.tsx
  - frontend/src/components/EntitiesOverlay.tsx
  - frontend/src/components/DragSelectOverlay.tsx
  - frontend/src/components/PdfCanvas.tsx
alwaysApply: false
---

- Coordinate transforms:
  - Use only `canvasToPdf`, `pdfToCanvas`, and `roundtripCanvasPdfCanvas` from `frontend/src/utils/coords.ts`.
  - Rotation must be in {0, 90, 180, 270}. Persist unrotated boxes; overlays convert on demand.
  - Clamp PDF-space boxes to page rect with epsilon 0.5 pt in helpers.
  - Device pixel ratio: pass CSS pixel coords into helpers (already divided by DPR). Scaling to screen happens via SVG viewBox or explicit `scale`.

- PdfCanvas page meta:
  - Compute `nativeWidth`/`nativeHeight` at 300 DPI baseline.
  - Maintain a `fitPageScale` and `manualScale`; `effectiveScale(pageIndex)` selects based on zoom mode.
  - Fetch backend raster and OCR lazily; continue to support pdf.js render only as fallback before backend image is ready.

- OcrOverlay:
  - Build `RenderMeta` from OCR `width_pts`/`height_pts` and `PdfCanvas` native raster size.
  - Convert bbox PDF→canvas with helpers; draw via SVG using viewBox for scale independence.
  - Keep interaction stateless except hovered/selected block indices stored in the Zustand store.

- DragSelectOverlay:
  - Rectangle selection operates in raster CSS pixel coordinates, then compares against OCR blocks converted PDF→canvas.
  - Support additive selections with meta/ctrl/shift.
  - Cancel in-progress drag if scale changes mid-drag.

- EntitiesOverlay:
  - Creation/editing of entities happens in PDF-space coordinates projected to raster for display; store edits via API with PDF-space bbox arrays.
  - Provide grab handles; apply an edge tolerance in raster pixels for hit-testing.
  - Prioritize entity interactions; forward pointer events to underlying layers when clicking outside known targets.

- Testing:
  - Any change to `coords.ts` must be reflected in `frontend/src/utils/__tests__/coords.test.ts` with roundtrip and rotation cases.

@frontend/src/utils/coords.ts
@frontend/src/components/OcrOverlay.tsx
@frontend/src/components/EntitiesOverlay.tsx
@frontend/src/components/DragSelectOverlay.tsx
@frontend/src/components/PdfCanvas.tsx

---
description: Frontend state (Zustand), UX guarantees, and API usage. Auto-attach to store and API files.
globs:
  - frontend/src/state/*.ts
  - frontend/src/api/*.ts
  - frontend/src/components/*.tsx
alwaysApply: false
---

- State management (Zustand):
  - Keep actions pure and small; avoid deep nesting beyond 2-3 levels.
  - Persist project-level artifacts in memory keyed by zero-based page index; sheet numbers are 1-based when sent to backend.
  - Use toasts for user-visible failures; never block interaction on errors.

- Upload and ingestion polling:
  - Start local PDF viewing immediately while uploading to backend.
  - Poll manifest every ~1–2s until `complete` or `error`. On completion, preload entities.

- Entities CRUD:
  - Frontend API in `frontend/src/api/entities.ts` is the single contract for entity types and payloads.
  - After mutations, refresh `entities` list and adjust selection appropriately.
  - For bbox edits, send arrays `[x1,y1,x2,y2]` in PDF point space.

- Panel and navigation UX:
  - Toggling OCR should not affect entity interactions besides overlays.
  - Scroll targeting should center an OCR block when requested and then clear the target.

- Performance considerations:
  - Cache backend `pages/{n}.png` object URLs per page; avoid re-fetching.
  - Fetch OCR JSON lazily; initialize per-page block state to `unverified`.

@frontend/src/state/store.ts
@frontend/src/api/entities.ts

---
description: Testing, validation, and quality checks for coords, ingestion, and API. Include on demand.
globs:
alwaysApply: false
---

- When editing coordinate helpers or overlays:
  - Add/adjust tests in `backend/tests/test_coords.py` and `frontend/src/utils/__tests__/coords.test.ts`.
  - Cover roundtrip equivalence, rotation {0,90,180,270}, clamping behavior, and NaN/invalid inputs.

- When changing ingestion or OCR:
  - Add a smoke test that ingests a small 2-page PDF in a temp dir and asserts files and manifest status flow.
  - Validate OCR JSON shape and non-empty blocks for simple inputs.

- API contract checks:
  - Ensure response_model is specified where appropriate in FastAPI and types match frontend `entities.ts`.
  - Verify 4xx messages are actionable and consistent.

- CI guidance (lightweight):
  - Run Python unit tests for backend and Vitest for frontend utils.
  - Lint or type-check if configured; avoid introducing any TODO comments without implementation.

- Property-based testing suggestion:
  - For coords, consider generating random boxes within/near page rects and asserting roundtrip closeness.

@backend/tests/test_coords.py
@frontend/src/utils/__tests__/coords.test.ts

---
description: Common contribution recipes for Timbergem. Include on demand.
globs:
alwaysApply: false
---

- Add a new entity type (backend+frontend):
  1) Backend: Define Pydantic model and Create* input with literal discriminator in `backend/app/entities_models.py`. Extend unions and exports.
  2) Backend store: Update dispatch maps in `backend/app/entities_store.py` for create/load/update.
  3) API: Ensure `EntityUnion` and `CreateEntityUnion` are used in `backend/app/main.py` endpoints.
  4) Frontend API types: Extend `frontend/src/api/entities.ts` unions.
  5) Store & UI: Add overlay behavior, edit panel fields, and creation flow.
  6) Tests: Add minimal unit tests for validation and overlay rendering paths.

- Fix a coord mismatch between frontend and backend:
  1) Reproduce with a failing roundtrip test in both `test_coords.py` and `coords.test.ts` using the same RenderMeta values and rotation.
  2) Update only the shared helper functions to restore equivalence; do not fork transform code elsewhere.
  3) Verify drag selection and entity edit interactions still behave with rotation.

- Extend ingestion with additional stage later (e.g., symbol detection):
  1) Keep manifest contract intact; add a new counter under `stages`.
  2) Run stage after OCR; ensure failure sets `status=error` and `error` message.
  3) Expose a `GET /api/projects/{id}/detect/symbols` if needed, returning idempotent results or writing to project dir.

- Improve user feedback for failures:
  1) Make backend errors explicit (422 with specific reason for invalid bbox, etc.).
  2) Frontend catches -> `addToast({ kind: 'error', message })` and avoids blocking state.

- Rendering consistency:
  - Maintain `TARGET_DPI=300` in PdfCanvas and backend. If changing DPI, adjust scale math and tests accordingly.

@backend/app/entities_models.py
@backend/app/entities_store.py
@backend/app/main.py
@frontend/src/api/entities.ts
@frontend/src/components/EntitiesOverlay.tsx
@frontend/src/utils/coords.ts
@backend/app/coords.py