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
- **Back Conversion Example:** For highlight overlays: fetch stored PDF box → multiply by current scale(s) → apply `dpr` → draw on canvas.
- **Invariant:** All persisted `bounding_box` values are always in unrotated MuPDF page coordinates.

---
For more details, see `PRD.md`. When in doubt, prioritize manual-first, traceable, and flexible workflows.
