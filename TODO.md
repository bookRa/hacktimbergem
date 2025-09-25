# TODO — UI V2

## Sprint A — Scaffold & state
[x] Create ui_v2/ and ui_primitives/ folders
[x] Copy v2 components; vendor minimal UI atoms with TG* prefixes
[x] tokens.css + .tg-ui2 wrapper; no global CSS changes
[x] Zustand slice ui_v2.ts (mode, menus, forms, linking)

## Sprint B — Creation & edit
[ ] Drag-to-bbox → ContextPicker → InlineEntityForm
[x] Entity model additions (status, validation.missing) client+server
[ ] Right-click EntityMenu; Edit bbox/props wired
[ ] BBox PDF→viewport integration

## Sprint C — Linking & OCR
[ ] ChipsTray + linking controller; Finish/Cancel → API
[ ] OCRPicker overlay; prefill scope; save flow
[ ] Undo/Redo (create, edit, link add/remove)

## Sprint D — Needs Attention & bottom bar
[ ] Explorer filter/tab + quick-fix actions
[ ] Zoom %, thumbnails, pages grid (skeleton is fine)

## Sprint E — Perf, a11y, tests
[ ] RAF-throttle hover; cull offscreen overlays
[ ] Focus mgmt + aria for menus/forms
[ ] Unit tests: reducers, validation, link flows
[ ] GIFs in PRs
