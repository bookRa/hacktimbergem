## PRD v1.1 — UI/UX Overhaul of the Timbergem Workspace

Version: 1.1 (UI/UX Overhaul)
Date: September 19, 2025
Status: Draft
Owners: Product + Eng + Design

### 1. Purpose
This document specifies the UI/UX overhaul for the three‑pane Timbergem workspace. It builds on the existing PRD (v1.0) and focuses on interaction design, layout, navigation, performance, and accessibility, while preserving all data/coordination invariants and current backend contracts unless explicitly noted.

### 2. What Stays the Same (Non‑negotiables)
- Manual‑first workflows; AI is an accelerator with explicit human verification.
- Coordinate invariants and conversions via `backend/app/coords.py` and `frontend/src/utils/coords.ts`.
- Project file layout under `projects/{project_id}` with `manifest.json`, `pages/`, `ocr/`, `entities.json`.
- CRUD APIs for entities/links remain unchanged, except optional additions in §10.

### 3. Goals
- Make the workspace fluid, legible, and scalable to thousands of entities per sheet.
- Separate “explore” (find/browse) from “edit” (properties/forms).
- Provide multiple views of the knowledge graph: Scopes, Symbols, Components, Spaces, Notes, and an All‑Entities table.
- Tight, real‑time cross‑highlighting between lists, canvas overlays, and sheets.
- Strong accessibility and keyboard navigation; light‑first visual design.

### 4. Non‑Goals (v1.1)
- New AI detection workflows beyond existing hooks.
- Changes to entity schema or coordinate math.
- Cost/takeoff reporting (out of scope for this milestone).

### 5. Information Architecture
#### 5.1 App Shell
- Left Panel: Project Navigator with tabs `Sheets` and `Search`. Drag‑resizable, collapsible. Remembers width.
- Center: Canvas with toolbar and layer toggles. Same PDF raster, enhanced overlays.
- Right Panel: Knowledge Workspace with two layers:
  - Explorer Tabs: `Scopes`, `Symbols`, `Components`, `Spaces`, `Notes`, `Entities`.
  - Inspector: properties/details of current selection. Docked at bottom by default; can pop out or expand.

#### 5.2 Global Selection Model
- Single source of truth for hover and selection, shared by canvas and lists. Multi‑select supported. Linking Mode uses the same selection events.

### 6. Visual Design System
- Light theme default with blue accent; dark theme optional later.
- Type scale: 12/14/16/18/22 px; line‑height 1.4–1.6.
- Spacing scale: 4/8/12/16/24 px. Comfortable density; compact mode later.
- Tokens (CSS variables): `--bg`, `--text`, `--muted`, `--border`, `--panel`, `--accent`, `--accent-contrast`, `--radius`.
- Lists over cards: compact rows with type icons, subtle backgrounds, right‑aligned actions.
- Entity chips: calm hues per type; never rely on color only for state.

### 7. Key Views & User Stories
#### 7.1 Sheets (Left Panel)
- As a user, I can browse sheets with thumbnails, numbers, titles, and badges for entity counts.
- Hover previews a zoomed thumbnail; click navigates and restores per‑sheet zoom.
- Selecting an item in the right Explorer filters and highlights related sheets.

#### 7.2 Scopes (Right → Explorer)
- Table with columns: Description, Category, Evidence (counts), Space, Sheets, Status.
- Group by Space or by Sheet. Search filters within the tab.
- Row hover highlights all evidence on canvas. Row click selects; double‑click opens Inspector.
- Quick actions: Link Evidence, Jump to Sheet, Add Child, Duplicate.

#### 7.3 Symbols
- Definitions sub‑tab: grouped by Legend and by Scope (Project‑wide vs Sheet‑only). “Select in Legend” jumps to bbox.
- Instances sub‑tab: grouped by Drawing. “Stamp Palette” enables rapid placement on canvas with number key shortcuts.

#### 7.4 Components
- Mirrors Symbols: Definitions from Schedules and their Instances.

#### 7.5 Spaces
- Flat list with counts of located instances and linked scopes. Selecting a space filters sheets and zooms to last viewed bbox.

#### 7.6 Notes
- OCR blocks and user notes preview. “Promote to Note” creates tracked `Note` entities anchored to the page.

#### 7.7 All Entities (Power View)
- Virtualized table with column chooser, type filters, bulk actions.

### 8. Canvas & Interactions
- Toolbar: Pan/Select, Draw Box, Stamp, Link, Multi‑select, Undo/Redo, Layer toggles, AI buttons.
- Layer toggles: Drawings, OCR, Symbols, Components, Notes, Scopes links. Visibility + opacity sliders.
- Linking Mode: start from a source entity; click items on canvas or in lists to collect evidence chips; Finish commits links.
- Cross‑highlighting on hover within 100ms. Selection shows handles; Shift multi‑select; Esc clears.

### 9. Accessibility & Keyboard
- 44px minimum toolbar targets; list row height 32–40px.
- Keyboard: ↑/↓ or j/k to move; Enter to open Inspector; ⌘F tab‑local search; Esc to clear; 1–9 to pick stamp.
- Focus rings visible; aria‑labels on controls; semantic roles on tabs and tables.

### 10. Backend/API (Optional Enhancements)
- `GET /projects/{id}/sheets/summary` → per‑sheet counts and a thumbnail path.
- `GET /projects/{id}/search?q=` → unified text search across names/descriptions/recognized_text.
No other backend changes are required.

### 11. Frontend Architecture
- Centralized Zustand UI state:
  - Panel sizes/collapsed, active tabs, hover/selection, Linking Mode, filters.
  - Explorer state: selected scope id, hover ids for scope/entity for cross-highlighting.
  - Derived selectors compute active sheet, selected entity payloads, and cross filters.
- Virtualized lists (`@tanstack/react-virtual`).
- Spatial index for overlay hit‑testing when entities are large in number (RBush or simple grid buckets).

### 12. Components (Refactor Map)
- App shell → `SplitPanels` layout with drag handles and collapse buttons.
- Left: `SheetsTab`, `SearchTab`.
- Center: `PdfCanvas`, `CanvasToolbar`, `LayerToggles`, upgraded `EntitiesOverlay`, `DragSelectOverlay`.
- Right Explorer Tabs: `ScopesTab`, `SymbolsTab` (Definitions/Instances), `ComponentsTab`, `SpacesTab`, `NotesTab`, `EntitiesTable`.
- Right Inspector: generic sections `Properties`, `Links`, `Evidence`, `Validation`, `History`.

### 13. Performance Budget
- 60fps pan/zoom; ≤16ms frame work on interaction.
- Virtualized lists render in <4ms per frame; offscreen culling for overlays.
- API fetch for per‑sheet lists ≤500ms P95.

### 14. Rollout Plan (4 Sprints)
1) Shell + Resizable Panels + New Sheets tab. Keep legacy right panel during transition for parity on the `ui_overhaul` branch.
2) New Explorer/Inspector for Scopes and Symbols (Instances) + unified selection + Linking Mode v1.
3) Symbols (Definitions), Components, Spaces, Notes + overlay perf work.
4) Search tab + All Entities table + polish (keyboard, density, theme tokens).
Work lands directly on branch `ui_overhaul`; no feature flags are required during local development.

### 15. Acceptance Criteria (Representative)
- Panels are drag‑resizable and collapsible; sizes persist across reloads.
- Hovering any item in Explorer highlights the canvas bbox within 100ms; selecting focuses the first bbox and opens Inspector.
- Inspector never exceeds two full screens for a single entity; sections are collapsible and remember state.
- Lists with 2,000 rows remain smooth; no noticeable jank while scrolling (RAF‑driven, virtualized).
- Selecting a Space filters left Sheets to only those depicting it; clicking a sheet jumps to a relevant bbox.

### 16. Open Questions
- Do we need per‑project density preference (comfortable/compact) in v1.1, or defer?
- Should “child scopes” create a nested hierarchy or remain flat with relationships? (Default: flat in v1.1.)
- Search scope: project‑wide or current sheet by default? (Default: current sheet; toggle to global.)

### 17. Appendices
#### A. CSS Token Snippet
```css
:root {
  --bg: #ffffff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0;
  --panel: #f8fafc; --accent: #2563eb; --accent-contrast: #ffffff;
  --radius: 8px;
}
```

#### B. UI State Type Sketch (Zustand)
```ts
type EntityType = 'scope'|'symbolDef'|'symbolInst'|'componentDef'|'componentInst'|'drawing'|'note'|'space';
type Selection = { type: EntityType; id: string };
type UIState = {
  leftTab: 'sheets'|'search';
  rightTab: 'scopes'|'symbols'|'components'|'spaces'|'notes'|'entities';
  panel: { leftWidth: number; rightWidth: number; inspectorHeight: number; leftCollapsed: boolean; rightCollapsed: boolean };
  selection: Selection[]; hover?: Selection; linking?: { active: boolean; source?: Selection } | null;
  filters: { text?: string; groupBy?: 'sheet'|'space'|'none'; types: Set<EntityType> };
};
```



