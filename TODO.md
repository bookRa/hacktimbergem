## UI/UX Overhaul — Engineering TODO (Living Doc)

Owner: Eng + Design
Updated: 2025‑09‑21

Conventions
- [ ] unchecked, [x] done, [~] in progress, [!] blocker, [qa] needs QA, [doc] docs update.
- Work proceeds directly on branch `ui_overhaul`; no feature flag gating required.

### Sprint 1 — App Shell, Panels, and Sheets Tab
- [x] SplitPanels layout with drag handles and collapse buttons on left/right.
- [x] Persist left/right panel widths (localStorage).
- [x] Persist collapsed state (left/right).
- [x] Persist right inspector height.
- [x] Left Panel: `Sheets` tab
  - [x] List with virtualized rows; search and sort (number/title).
  - [x] Per-sheet row: number, title, thumbnail, entity count badges.
  - [x] Hover: quick preview overlay; click loads sheet and restores zoom.
  - [x] Keyboard: ↑/↓ to move, Enter to open.
- [x] Left Panel: `Search` tab (skeleton; no backend yet).
  - [x] Search tab scaffold with local project search across entities and concepts.
- [x] Canvas toolbar shell and layer toggles (no functionality change yet).
  - [x] Canvas toolbar shell with layer toggles (OCR, Symbols, Components, Notes, Scopes).
- [x] Keep legacy Right Panel as-is for parity.

Acceptance (S1)
- [x] Panels are resizable/collapsible; sizes persist across reloads.
- [ ] Sheets tab renders smoothly with 200+ sheets (virtualized).
 - [x] Inspector height is resizable and persists.

### Sprint 2 — Explorer/Inspector Foundation + Scopes & Symbol Instances
- [x] Zustand: unified UI state (tabs, selection, hover, linking, filters, panel sizes).
  - [x] `rightPanelTab` includes `explorer`.
  - [x] `rightInspectorHeightPx` persisted.
  - [x] `selectedScopeId` state for Explorer.
  - [x] Consolidate canvas/list hover/selection into a shared selection model (`selectEntity`, `selectScope`, hover ids).
  - [x] Session restore: persist project id to URL hash and localStorage; restore on reload.
- [x] Explorer tabs scaffold; initial `Scopes` and `Symbols ▸ Instances` tabs.
  - [x] Scopes list shows descriptions and evidence counts.
  - [x] Symbols ▸ Instances list renders instances.
  - [x] Scopes: click selects; double-click jumps to first evidence on sheet and opens Inspector.
  - [x] Scopes: Link Evidence button enters Linking Mode (v1).
  - [x] Instances: group by Drawing via bbox containment (fallback to sheet).
  - [x] Instances: add Stamp Palette with number-key shortcuts 1–9.
- [x] Inspector dock at bottom: Properties, Links, Evidence sections (collapsible).
  - [x] Split right side into Explorer (top) + Inspector (bottom) containers.
  - [x] Inspector shows selected entity or scope; Evidence tray appears for scopes.
  - [x] Collapse state remembered per section.
  - [x] Dynamic inspector height in Linking Mode (chip tray + banner visible without nested scrolls).
- [x] Cross-highlighting: hover list → canvas; hover canvas → list row.
  - [x] Hovering a Scope in Explorer highlights its evidence on the canvas.
  - [x] Hovering an entity on the canvas highlights matching row in Symbols ▸ Instances.
  - [x] Hovering a row in Symbols ▸ Instances highlights the matching overlay on the canvas.
- [x] Linking Mode v1: start from Scope; click items to add evidence chips; finish to commit.
  - [x] Linking banner and Finish/Cancel controls in Inspector; canvas selection toggles evidence.
  - [x] Chip tray shows queued evidence and allows removal before finish.
- [x] Stamp Palette for Symbols (Instances) with number-key shortcuts.
  - [x] Stamp Palette added with 1–9 shortcuts; Esc cancels.
- [x] Undo/Redo wiring for create/link/delete actions.
  - [x] Core history stack + toolbar + shortcuts for create/delete entity and create/delete links.
  - [x] Record bbox and metadata edits; undo/redo applies before/after.

Milestone Demo Targets (S2)
- [ ] From Scopes tab, hover highlights related bboxes on the canvas within 100ms.
- [ ] Click a Scope → Inspector opens with Evidence tray; Link Evidence creates `JUSTIFIED_BY` links.
- [ ] Stamp two symbol instances quickly using number keys without lag.

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



