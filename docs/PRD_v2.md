# PRD v2 — Canvas-first UI

## Goals
- Fast authoring on canvas (ContextPicker + InlineEntityForm).
- Permissive saves; incomplete items visible and actionable.
- Keep backend contracts; only add optional `status` + `validation.missing`.

## Primary User Stories
1. **Canvas Authoring** — Users can create and edit every supported entity type (Drawing, Legend, Schedule, Scope, Note, Symbol Definition, Component Definition, Symbol Instance, Component Instance) via drag/right-click, with inline forms that expose the required metadata.
2. **Symbol Library** — While stamping a symbol/component instance, users can choose an existing definition or create a new one (including OCR-assisted population) before committing the instance.
3. **Evidence Linking** — Users can enter link mode from any entity, see existing relations preloaded, add/remove linked items with visual confirmation, and finish/cancel without duplicate-link failures. Inspector surfaces let users unlink or edit relationships afterward.
4. **Explorer & Review** — The Explorer panel groups entities (Scopes, Drawings, Notes, Symbols, Components, Spaces) with selection synced to the canvas, and provides a dedicated “Needs Attention” view for unresolved validation.missing flags.
5. **Resilient Editing** — Creation, edit, and linking actions support undo/redo and emit success/error toasts for traceability.

## UX
- ContextPicker at pointer after drag/right-click.
- EntityMenu on entity: Edit bbox, Edit props, Link…, Duplicate, Delete.
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

1. Drag → ContextPicker ≤75ms; choose Symbol Inst → Inline form appears.
2. Save with missing definition/scope → persists with red dashed bbox.
3. Right-click → EntityMenu; Link… → ChipsTray; Finish writes links; Inspector allows unlink/edit; Undo/Redo supported.
4. Needs Attention view lists entities with validation.missing.*; resolving clears dashed style ≤200ms after save.
5. OCR picker → prefill scope/symbol definition → Save → marks complete if no missing remain.
6. 55–60fps with \~1k overlays on a mid-range laptop.

## Backlog / Out of Scope for v2 GA
- Advanced keyboard shortcuts and quick-stamp presets.
- Non-canvas Explorer enhancements (global search, saved filters).
- Collaborative editing indicators.
