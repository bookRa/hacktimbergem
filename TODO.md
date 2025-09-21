## UI/UX Overhaul — Engineering TODO (Living Doc)

Owner: Eng + Design
Updated: 2025‑09‑19

Conventions
- [ ] unchecked, [x] done, [~] in progress, [!] blocker, [qa] needs QA, [doc] docs update.
- Work proceeds directly on branch `ui_overhaul`; no feature flag gating required.

### Sprint 1 — App Shell, Panels, and Sheets Tab
- [x] SplitPanels layout with drag handles and collapse buttons on left/right.
- [x] Persist left/right panel widths (localStorage).
- [x] Persist collapsed state (left/right).
- [ ] Persist right inspector height.
- [ ] Left Panel: `Sheets` tab
  - [x] List with virtualized rows; search and sort (number/title).
  - [x] Per-sheet row: number, title, thumbnail, entity count badges.
  - [x] Hover: quick preview overlay; click loads sheet and restores zoom.
  - [x] Keyboard: ↑/↓ to move, Enter to open.
- [ ] Left Panel: `Search` tab (skeleton; no backend yet).
- [ ] Canvas toolbar shell and layer toggles (no functionality change yet).
- [x] Keep legacy Right Panel as-is for parity.

Acceptance (S1)
- [x] Panels are resizable/collapsible; sizes persist across reloads.
- [ ] Sheets tab renders smoothly with 200+ sheets (virtualized).

### Sprint 2 — Explorer/Inspector Foundation + Scopes & Symbol Instances
- [ ] Zustand: unified UI state (tabs, selection, hover, linking, filters, panel sizes).
- [ ] Explorer tabs scaffold; initial `Scopes` and `Symbols ▸ Instances` tabs.
- [ ] Inspector dock at bottom: Properties, Links, Evidence sections (collapsible).
- [ ] Cross-highlighting: hover list → canvas; hover canvas → list row.
- [ ] Linking Mode v1: start from Scope; click items to add evidence chips; finish to commit.
- [ ] Stamp Palette for Symbols (Instances) with number-key shortcuts.
- [ ] Undo/Redo wiring for create/link/delete actions.

Acceptance (S2)
- [ ] Hover from any Explorer row highlights overlay within 100ms.
- [ ] Creating a Scope and linking at least one Symbol Instance succeeds and persists.
- [ ] Stamping multiple symbol instances is fluid (<75ms input latency).

### Sprint 3 — Definitions, Components, Spaces, Notes + Overlay Perf
- [ ] Symbols ▸ Definitions grouped by Legend and Scope; “Select in Legend” jump.
- [ ] Components ▸ Definitions/Instances mirroring Symbols.
- [ ] Spaces tab with sheet filtering and auto-zoom behavior.
- [ ] Notes tab: OCR block preview; “Promote to Note” flow.
- [ ] EntitiesOverlay virtualization + spatial index for hit testing.
- [ ] Density setting (comfortable default) persisted.

Acceptance (S3)
- [ ] Lists of 2,000 items scroll smoothly; main thread idle >60% when idle.
- [ ] Selecting a Space filters Sheets and jumps to a relevant bbox.

### Sprint 4 — Search, All Entities Table, Polish
- [ ] Search tab hooked to backend (or client index fallback); result groups by type.
- [ ] All Entities virtualized table with column chooser and bulk actions.
- [ ] Keyboard polish: j/k navigation, ⌘F tab-local search, Esc to clear.
- [ ] Theming tokens applied, focus rings and a11y labels in place.
- [ ] Command Palette stub (⌘K) with few core actions.

Acceptance (S4)
- [ ] Inspector never exceeds two view heights; sections retain collapse state.
- [ ] All Entities table handles 10k rows with virtualization.

### Optional Backend Enhancements
- [ ] `GET /projects/:id/sheets/summary` (counts + thumbnail).
- [ ] `GET /projects/:id/search?q=` unified text search.

### Quality Gates
- [ ] Unit tests for selection state reducers and panel size persistence.
- [ ] Integration tests for Linking Mode (happy path + cancel).
- [ ] Performance budget checks (FPS, list render time) in CI smoke.

### Design Artifacts
- [ ] Wireframes for each Explorer tab + Inspector variants.
- [ ] Canvas toolbar and layer toggle icons/specs.
- [ ] Token sheet: colors, typography, spacing, states.

### Risks & Mitigation
- State complexity → keep reducers small, add devtools, snapshot tests.
- Overlay perf → ship virtualization early; profile with React Profiler.
- Parity drift → keep legacy panel toggle until S3 completes.



