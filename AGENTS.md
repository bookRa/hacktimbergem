# AGENTS.md — TimberGem UI V2

## Mission
Canvas-first editing for construction drawings. Users create/edit/link on the canvas; right panel is for browse/inspect.

## Guardrails
1) No new frameworks. Use existing React + TS + Zustand + pdf.js/SVG.
2) Traceability: persist sheetId + PDF-space bbox. Never store viewport coords.
3) Permissive creation: allow incomplete entities; set `status='incomplete'` + `validation.missing`.
4) Canvas-first: use ContextPicker + InlineEntityForm on canvas.
5) Performance: target 60fps overlays; throttle hover; avoid layout thrash.
6) A11y/Keyboard: Menus/forms keyboardable. Keys: `V, R, S, L, Esc, Enter`.
7) Styling safety: scope all UI-V2 styles under `.tg-ui2` and `--tg-*` variables. Do not modify global resets.

## Approved atoms (vendored only)
`frontend/src/ui_primitives/`: popover, context-menu, select, input, button, card, scroll-area, separator, portal. Do not import shadcn/radix from npm.

## Components
- `frontend/src/ui_v2/canvas/BBox.tsx`, `.../canvas/EntityTag.tsx`
- `frontend/src/ui_v2/menus/ContextPicker.tsx`, `.../menus/EntityMenu.tsx`
- `frontend/src/ui_v2/forms/InlineEntityForm.tsx`
- `frontend/src/ui_v2/overlays/OCRPicker.tsx`
- `frontend/src/ui_v2/linking/ChipsTray.tsx`
- `frontend/src/ui_v2/OverlayLayer.tsx`

## State (Zustand)
`frontend/src/state/ui_v2.ts`: mode, contextMenu, inlineForm, linking, hover, selection, filters + actions:
`setMode`, `openContext`, `closeContext`, `openForm`, `closeForm`, `startLinking`, `addPending`, `finishLinking`, `cancelLinking`.

## Entity model (additive)
```ts
status?: 'incomplete'|'complete';
validation?: { missing?: { drawing?: boolean; definition?: boolean; scope?: boolean } };
````

## Flows to match

* F1: Drag → ContextPicker → Inline form → incomplete bbox.
* F2: Link mode → ChipsTray → Finish/Cancel.
* F3: OCR picker → prefill scope → Save → complete.

## PR checklist

* Title: `ui_v2: <feature>`; include a short GIF.
* No new deps.
* Tests for reducers & validation updated.