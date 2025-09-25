# PRD v2 — Canvas-first UI

## Goals
- Fast authoring on canvas (ContextPicker + InlineEntityForm).
- Permissive saves; incomplete items visible and actionable.
- Keep backend contracts; only add optional `status` + `validation.missing`.

## UX
- ContextPicker at pointer after drag/right-click.
- EntityMenu on entity: Edit bbox, Edit props, Link…, Duplicate, Delete.
- Linking Mode with ChipsTray; Finish/Cancel.
- Needs Attention filter/tab.
- OCR picker to prefill scope.

## Visual
- dashed red=incomplete; blue=selected; yellow=hover; icon + label (not color-only).

## Keyboard
`V, R, S, L, Esc, Enter`, `1–9` quick-stamp.

## Data additions
```json
{"status":"incomplete|complete","validation":{"missing":{"drawing":true,"definition":true,"scope":true}}}
````

## Acceptance

1. Drag → ContextPicker ≤75ms; choose Symbol Inst → Inline form appears.
2. Save with missing definition/scope → persists with red dashed bbox.
3. Right-click → EntityMenu; Link… → ChipsTray; Finish writes links; Undo/Redo supported.
4. Needs Attention shows all missing; resolving clears dashed style ≤200ms after save.
5. OCR picker → prefill scope → Save → marks complete if no missing remain.
6. 55–60fps with \~1k overlays on a mid-range laptop.
