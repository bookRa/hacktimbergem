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
- Right-click entity → EntityMenu: edit bbox, edit props, link, duplicate, delete.

## Linking
- Link mode adds/removes pending selections; Finish writes links via existing API; Cancel clears.

## Needs Attention
- Explorer filter lists entities with any `validation.missing.*`; rows offer quick-fix actions.

## OCR
- `OCRPicker` shows OCR blocks for current sheet; on pick, prefill scope form.

## Tests
- Reducers: mode, linking, validation flags.
- Create-without-linkages flow.
- OCR prefill → save marks complete when missing resolved.