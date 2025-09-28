# INTEGRATION_SPEC — UI V2 wiring

## Files to import from FIGMA_PROTOTYPE
- Components: BBox, EntityTag, ContextPicker, EntityMenu, InlineEntityForm, OCRPicker, ChipsTray
- UI atoms: popover, context-menu, select, input, button, card, scroll-area, separator, portal
Place under `frontend/src/ui_v2/...` and `frontend/src/ui_primitives/...`.

## Styling
- Create `ui_v2/theme/tokens.css` with `--tg-*` variables.
- Root class `.tg-ui2` wraps all v2 components; no global CSS changes.

## State slice
- Implement `frontend/src/state/ui_v2.ts` with `mode, contextMenu, inlineForm, linking, hover, selection, filters`.
- Actions: open/close menus and forms; start/add/finish/cancel linking.

## Canvas integration
- Add `UIV2OverlayLayer` to the canvas composition as the active overlay.
- `BBox` receives **PDF-space** bbox; convert via existing `pdfToViewport()`.

## Creation & Edit
- Drag end → open ContextPicker at pointer (using cached bbox).
- Choosing type → create entity (permissive), then open InlineEntityForm.
- Inline forms by entity type:
  - **Drawing / Note / Scope** — current implementation.
  - **Legend / Schedule** — surface title/description fields; allow edit/save parity.
  - **Symbol Definition / Component Definition** — allow creation via ContextPicker and via “+ New” from instance forms (name, description, scope, defined_in relationships).
  - **Symbol Instance / Component Instance** — require selecting or creating a definition; allow OCR prefill for semantic metadata.
- Right-click entity → EntityMenu: edit bbox, edit props, link, duplicate, delete.
- Inspector panes expose metadata for each entity type and allow unlink/delete operations without returning to canvas.

## Linking
- Right-click Link… enters link mode with source entity preselected.
- ChipsTray lists source + pending targets, allows removing via `×`, and reflects already-linked entities when entering mode.
- Canvas highlights linked entities (selection + dashed style) while in link mode.
- Finish writes `JUSTIFIED_BY` links and shows success toast; Cancel restores prior state without API calls.
- Inspector view of a scope (or other link-capable entity) lists existing relationships with “Remove” / “Open” actions.
- Guard against duplicate link creation by checking existing relationships client-side before POST.

## Needs Attention
- Explorer tab contains dedicated “Needs Attention” view listing entities with any `validation.missing.*` with quick actions (open form, autofill via OCR, jump to canvas).
- Needs Attention badge count updates in real time as validations clear.

## OCR
- `OCRPicker` shows OCR blocks for current sheet with search/filter.
- Selecting a block pre-populates the active inline form (scope, note, symbol definition/instance) and marks missing flags resolved when saved.

## Tests
- Reducers: mode, linking, validation flags.
- Create-without-linkages flow.
- OCR prefill → save marks complete when missing resolved.
- Linking mode regression tests: add/remove chips, duplicate-link guard, unlink from Inspector.
