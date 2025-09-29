# PRD v2 — Canvas-first UI

## Goals
- Fast authoring on canvas (ContextPicker + InlineEntityForm).
- Permissive saves; incomplete items visible and actionable.
- Keep backend contracts; only add optional `status` + `validation.missing`.

## Primary User Stories
1. **Canvas Authoring** — Users can create and edit every supported entity type (Drawing, Legend, Schedule, Scope, Note, Symbol Definition, Component Definition, Symbol Instance, Component Instance) via two modes:
   - **Drag mode**: Click and drag to draw a bounding box, then select entity type from ContextPicker → InlineEntityForm
   - **Right-click mode**: Right-click on empty space → select entity type from ContextPicker → enter drawing mode → draw bounding box → InlineEntityForm
   Both modes support inline forms that expose the required metadata.
2. **Symbol Library** — While stamping a symbol/component instance, users can choose an existing definition or create a new one (including OCR-assisted population) before committing the instance.
3. **Evidence Linking** — Users can enter link mode from any entity, see existing relations preloaded, add/remove linked items with visual confirmation, and finish/cancel without duplicate-link failures. Inspector surfaces let users unlink or edit relationships afterward.
4. **Explorer & Review** — The Explorer panel groups entities (Scopes, Drawings, Notes, Symbols, Components, Spaces) with selection synced to the canvas, and provides a dedicated “Needs Attention” view for unresolved validation.missing flags.
5. **Resilient Editing** — Creation, edit, and linking actions support undo/redo and emit success/error toasts for traceability.

## UX
- **Entity Creation Modes**:
  - **Drag mode**: Click and drag to draw bbox → ContextPicker → InlineEntityForm
  - **Right-click mode**: Right-click empty space → ContextPicker → select entity type → drawing mode → draw bbox → InlineEntityForm
- **Entity Editing**: EntityMenu on entity: Edit bbox, Edit props, Link…, Duplicate, Delete.
- Linking Mode with ChipsTray; Finish/Cancel; Inspector controls for unlink/edit.
- Needs Attention filter/tab in Explorer.
- OCR picker to prefill scope / symbol definitions.

## Visual
- dashed red=incomplete; blue=selected; yellow=hover; icon + label (not color-only).

## Keyboard (Deferred)
Keybindings such as `V/R/S/L`, `Esc`, `Enter`, and `1–9` quick-stamp remain backlog items until canvas and Explorer parity are complete.

## Data additions
```json
{"status":"incomplete|complete","validation":{"missing":{"drawing":true,"definition":true,"scope":true}}}
````

## Acceptance

1. **Drag mode**: Drag → ContextPicker ≤75ms; choose Symbol Inst → Inline form appears.
2. **Right-click mode**: Right-click → ContextPicker → select entity type → drawing mode → draw bbox → Inline form appears ≤200ms after bbox completion.
3. Save with missing definition/scope → persists with red dashed bbox.
4. Right-click entity → EntityMenu; Link… → ChipsTray; Finish writes links; Inspector allows unlink/edit; Undo/Redo supported.
5. Needs Attention view lists entities with validation.missing.*; resolving clears dashed style ≤200ms after save.
6. OCR picker → prefill scope/symbol definition → Save → marks complete if no missing remain.
7. 55–60fps with \~1k overlays on a mid-range laptop.

## Backlog / Out of Scope for v2 GA
- Advanced keyboard shortcuts and quick-stamp presets.
- Non-canvas Explorer enhancements (global search, saved filters).
- Collaborative editing indicators.
