# Scope Refactor: Conceptual Scopes & First-Class Knowledge Panel Integration

## Problem Statement

### Current Issues:
1. **Scopes require canvas bounding boxes** - Cannot create conceptual scopes without drawing on canvas
2. **Scopes don't show in Explorer Tab** - `ScopesList` queries `concepts` array but scopes are stored as `entities`
3. **No way to create canvas-independent scopes** - All entity creation flows require bbox
4. **Scopes are tightly coupled to sheets** - `source_sheet_number` is required even for project-level scopes

### Desired Behavior:
1. **Conceptual scopes** - Scopes can exist without canvas representation (e.g., "Demolish walls on ground floor")
2. **Canvas-based scopes** - Scopes can optionally have bbox for spatial annotation
3. **First-class KP citizens** - Scopes prominently displayed in Explorer with "Add Scope" button
4. **Flexible linking** - Link any instance/note to any scope (canvas or conceptual)

---

## Architecture Analysis

### Current Data Model (Backend)

**File:** `backend/app/entities_models.py`

```python
class BaseVisualEntity(BaseModel):
    id: str
    entity_type: str
    source_sheet_number: int  # ← REQUIRED
    bounding_box: BoundingBox  # ← REQUIRED
    created_at: float
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None

class Scope(BaseVisualEntity):
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
```

**Issues:**
- `source_sheet_number` and `bounding_box` are **required** for all entities including scopes
- No way to create scope without spatial data

### Current Frontend Flow

**File:** `frontend/src/components/RightExplorer.tsx`

```typescript
// Line 30
{tab === 'scopes' && <ScopesList concepts={concepts} ... />}

// Line 42
const ScopesList = ({ concepts, ... }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');  // ← LOOKING IN WRONG PLACE
    // ...
}
```

**Issues:**
- Scopes are stored as **entities** (`entities.json`) but UI queries **concepts** array
- This is why "no scopes show up in Explorer Tab"
- No "Create Scope" button or form

---

## Implementation Plan

### Phase 1: Backend - Make Scope Fields Optional

**Files to modify:**
- `backend/app/entities_models.py`
- `backend/app/entities_store.py` (likely needs bbox validation adjustments)
- `backend/app/main.py` (API validation)

#### 1.1: Update `Scope` Model

**Change:**
```python
# OLD (line 91-94)
class Scope(BaseVisualEntity):
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None

# NEW
class Scope(BaseModel):  # Don't inherit from BaseVisualEntity
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
    
    # Optional spatial fields
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @validator('bounding_box', always=True)
    def _validate_bbox_sheet_consistency(cls, v, values):
        """If bbox exists, source_sheet_number must exist. If sheet exists, bbox may be optional."""
        bbox = v
        sheet = values.get('source_sheet_number')
        
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        return v
    
    class Config:
        orm_mode = True
```

**Rationale:**
- Break inheritance from `BaseVisualEntity` to make spatial fields optional
- Add validator to ensure consistency: if bbox exists, sheet must exist
- Allow sheet-level scopes without bbox (e.g., "All instances on Sheet 3")

#### 1.2: Update `CreateScope` Model

**Change:**
```python
# OLD (line 175-180)
class CreateScope(CreateEntityBase):
    entity_type: Literal["scope"]
    source_sheet_number: int
    bounding_box: List[float]
    name: str | None = None
    description: str | None = None

# NEW
class CreateScope(CreateEntityBase):
    entity_type: Literal["scope"]
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    name: str | None = None
    description: str | None = None
    
    @validator('bounding_box', always=True)
    def _validate_consistency(cls, v, values):
        bbox = v
        sheet = values.get('source_sheet_number')
        
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        # Require at least name or description for conceptual scopes
        if bbox is None and not values.get('name') and not values.get('description'):
            raise ValueError("name or description required for conceptual scopes")
        
        return v
```

**Rationale:**
- Allow creation without bbox/sheet
- Validate that conceptual scopes have meaningful text content

#### 1.3: Update Backend Store Validation

**File:** `backend/app/entities_store.py`

**Check:**
- Ensure file persistence handles `None` values for `bounding_box` and `source_sheet_number`
- Update any bbox-specific queries to handle optional bbox

**Example:**
```python
def get_entities_on_sheet(project_id: str, sheet_number: int) -> List[Entity]:
    entities = load_entities(project_id)
    return [
        e for e in entities 
        if e.source_sheet_number == sheet_number  # Will skip None values
    ]

def get_conceptual_scopes(project_id: str) -> List[Scope]:
    """Get scopes without spatial representation."""
    entities = load_entities(project_id)
    return [
        e for e in entities 
        if e.entity_type == 'scope' and e.bounding_box is None
    ]
```

---

### Phase 2: Frontend - Display Scopes from Entities Array

**Files to modify:**
- `frontend/src/components/RightExplorer.tsx`

#### 2.1: Fix `ScopesList` Data Source

**Change:**
```typescript
// OLD (line 42)
const ScopesList = ({ concepts, ... }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');  // WRONG
    // ...
}

// NEW
const ScopesList = ({ entities, ... }) => {
    const scopes = entities.filter((e: any) => e.entity_type === 'scope');
    
    // Separate canvas-based vs conceptual
    const canvasScopes = scopes.filter((s: any) => s.bounding_box !== null && s.bounding_box !== undefined);
    const conceptualScopes = scopes.filter((s: any) => !s.bounding_box);
    
    // ... render both groups
}
```

**Rationale:**
- Query correct data source (`entities` not `concepts`)
- Distinguish between canvas-based and conceptual scopes for better UX

#### 2.2: Update UI to Show Both Scope Types

**New UI Structure:**
```tsx
<div>
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
      Conceptual Scopes ({conceptualScopes.length})
    </div>
    {conceptualScopes.map(scope => (
      <ScopeCard 
        key={scope.id}
        scope={scope}
        type="conceptual"
        onEdit={() => selectEntity(scope.id)}
        onDelete={() => deleteScope(scope.id)}
      />
    ))}
  </div>
  
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
      Canvas Scopes ({canvasScopes.length})
    </div>
    {canvasScopes.map(scope => (
      <ScopeCard 
        key={scope.id}
        scope={scope}
        type="canvas"
        onEdit={() => selectEntity(scope.id)}
        onJump={() => jumpToCanvas(scope)}
        onDelete={() => deleteScope(scope.id)}
      />
    ))}
  </div>
</div>
```

**Visual Indicators:**
- Conceptual: 💭 icon, no "Jump" button
- Canvas: 📍 icon, "Jump" button to navigate to bbox

---

### Phase 3: Frontend - Add "Create Scope" Button & Form

**Files to modify:**
- `frontend/src/components/RightExplorer.tsx` (add button)
- `frontend/src/components/RightPanel.tsx` (scope creation form in Entities tab)
- `frontend/src/state/store.ts` (add `startScopeCreation` action)

#### 3.1: Add Button to Explorer Tab

**Location:** Above `ScopesList` in Explorer tab

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
  <div style={{ fontSize: 12, fontWeight: 600 }}>Scopes</div>
  <button 
    onClick={() => startScopeCreation('conceptual')}
    style={{ 
      background: '#2563eb', 
      color: 'white', 
      border: 'none',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 11,
      cursor: 'pointer',
      fontWeight: 500
    }}
  >
    + New Scope
  </button>
</div>
```

**Also add:**
- "Draw Scope on Canvas" button for canvas-based scopes

```tsx
<button onClick={() => startScopeCreation('canvas')}>
  + Draw Scope
</button>
```

#### 3.2: Scope Creation Modal/Form

**Option A: Inline Form in Entities Tab**

When "+ New Scope" clicked:
1. Switch to Entities tab
2. Open scope editor with empty form
3. Focus on name field

**Option B: Modal Form**

Floating modal that appears over canvas:
```tsx
<ScopeCreationModal
  open={scopeCreationMode.active}
  type={scopeCreationMode.type}  // 'canvas' | 'conceptual'
  onSave={(data) => createScope(data)}
  onCancel={() => cancelScopeCreation()}
/>
```

**Recommended: Option B** for consistency with other entity creation flows

#### 3.3: Form Fields

```tsx
<form>
  <label>Name *</label>
  <input 
    type="text" 
    placeholder="e.g., Demolish ground floor walls"
    value={formData.name}
    onChange={e => setFormData({...formData, name: e.target.value})}
  />
  
  <label>Description</label>
  <textarea 
    placeholder="Additional details about this scope..."
    value={formData.description}
    onChange={e => setFormData({...formData, description: e.target.value})}
  />
  
  {type === 'canvas' && (
    <>
      <label>Sheet</label>
      <select value={formData.sheet} onChange={e => setFormData({...formData, sheet: parseInt(e.target.value)})}>
        {pages.map((p, i) => (
          <option key={i} value={i + 1}>Sheet {i + 1}</option>
        ))}
      </select>
      
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        💡 Draw bounding box on canvas after saving
      </div>
    </>
  )}
  
  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
    <button type="submit">Save Scope</button>
    <button type="button" onClick={onCancel}>Cancel</button>
  </div>
</form>
```

---

### Phase 4: Frontend - Update Scope Creation Logic

**Files to modify:**
- `frontend/src/state/store.ts`
- `frontend/src/api/entities.ts`
- `frontend/src/ui_v2/OverlayLayer.tsx` (for canvas-based creation)

#### 4.1: Add Store Actions

```typescript
// store.ts
interface AppState {
  // ... existing
  scopeCreationMode: {
    active: boolean;
    type: 'canvas' | 'conceptual' | null;
  };
  
  startScopeCreation: (type: 'canvas' | 'conceptual') => void;
  cancelScopeCreation: () => void;
  createScope: (data: CreateScopeData) => Promise<void>;
}

const useProjectStore = create<AppState>((set, get) => ({
  // ... existing
  scopeCreationMode: { active: false, type: null },
  
  startScopeCreation: (type) => {
    set({ 
      scopeCreationMode: { active: true, type },
      rightPanelTab: 'entities',  // Switch to Entities tab
      selectedEntityId: null,
    });
  },
  
  cancelScopeCreation: () => {
    set({ scopeCreationMode: { active: false, type: null } });
  },
  
  createScope: async (data) => {
    const { projectId } = get();
    if (!projectId) return;
    
    const payload: any = {
      entity_type: 'scope',
      name: data.name,
      description: data.description,
    };
    
    // Only add spatial fields if creating canvas scope
    if (data.type === 'canvas' && data.bounding_box) {
      payload.source_sheet_number = data.source_sheet_number;
      payload.bounding_box = data.bounding_box;
    }
    
    try {
      const created = await apiCreateEntity(projectId, payload);
      await get().fetchEntities();
      get().addToast({ kind: 'success', message: 'Scope created' });
      set({ scopeCreationMode: { active: false, type: null } });
      
      // Select newly created scope
      set({ selectedEntityId: created.id });
    } catch (error: any) {
      get().addToast({ kind: 'error', message: error.message || 'Failed to create scope' });
    }
  },
}));
```

#### 4.2: Update Canvas Drawing Flow

**For "Draw Scope" button:**

1. Click "Draw Scope" in Explorer
2. Canvas enters drawing mode (similar to existing entity creation)
3. User drags to create bbox
4. Form opens at cursor with pre-filled bbox
5. User adds name/description
6. Save creates scope with bbox

**Implementation:**
```typescript
// In OverlayLayer.tsx
const handleStartScopeDrawing = () => {
  startDrawing('Scope');
};

// In handlePointerUp after bbox drawn
if (drawing.entityType === 'Scope') {
  openForm({
    type: 'Scope',
    at: { x: canvasX, y: canvasY },
    pendingBBox: { sheetId: String(pageIndex + 1), bboxPdf: [...] },
    initialValues: {},
    mode: 'create',
  });
}
```

---

### Phase 5: Frontend - Update Entity Editor for Scopes

**Files to modify:**
- `frontend/src/components/EntityEditor.tsx`

#### 5.1: Handle Scopes Without Bbox

**Current Issue:**
- Entity Editor likely assumes all entities have `bounding_box` and `source_sheet_number`
- Conceptual scopes will have `undefined` for these fields

**Changes:**
```typescript
// EntityEditor.tsx
const EntityEditor = ({ entityId, onClose }) => {
  const entity = entities.find(e => e.id === entityId);
  
  // ... existing logic
  
  return (
    <div>
      {/* Bounding Box - CONDITIONAL */}
      {entity.bounding_box && (
        <div style={{ marginBottom: 14 }}>
          <div style={styles.label}>Bounding Box</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
            [{entity.bounding_box.x1.toFixed(1)}, {entity.bounding_box.y1.toFixed(1)}, 
             {entity.bounding_box.x2.toFixed(1)}, {entity.bounding_box.y2.toFixed(1)}]
          </div>
        </div>
      )}
      
      {/* Sheet Number - CONDITIONAL */}
      {entity.source_sheet_number && (
        <div style={{ marginBottom: 14 }}>
          <div style={styles.label}>Sheet</div>
          <div style={{ fontSize: 12, color: '#334155' }}>
            {entity.source_sheet_number}
          </div>
        </div>
      )}
      
      {/* Scope Type Indicator */}
      {entity.entity_type === 'scope' && (
        <div style={{ marginBottom: 14 }}>
          <div style={styles.label}>Type</div>
          <div style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            {entity.bounding_box ? (
              <>📍 Canvas-based</>
            ) : (
              <>💭 Conceptual</>
            )}
          </div>
        </div>
      )}
      
      {/* Add option to convert conceptual → canvas */}
      {entity.entity_type === 'scope' && !entity.bounding_box && (
        <button 
          onClick={() => startDrawingScopeForEntity(entity.id)}
          style={styles.buttonSecondary}
        >
          + Add Canvas Location
        </button>
      )}
      
      {/* Name, Description fields */}
      {/* ... existing fields */}
    </div>
  );
};
```

#### 5.2: Add "Convert to Canvas" Flow

Allow user to add spatial data to existing conceptual scope:

1. Click "+ Add Canvas Location" in Entity Editor
2. Canvas enters drawing mode with scope context
3. User draws bbox
4. API updates scope with new spatial fields

```typescript
// API call
const updateScopeWithSpatialData = async (scopeId: string, sheet: number, bbox: number[]) => {
  await apiUpdateEntity(projectId, scopeId, {
    source_sheet_number: sheet,
    bounding_box: bbox,
  });
};
```

---

### Phase 6: Frontend - Update Linking UI

**Files to modify:**
- `frontend/src/ui_v2/menus/EntityMenu.tsx`
- `frontend/src/ui_v2/OverlayLayer.tsx`
- `frontend/src/components/EntitySelector.tsx` (if exists)

#### 6.1: Scope Selector for Instances

When linking instance → scope, show **all scopes** (not just canvas-based):

```tsx
<ScopeSelector
  scopes={allScopes}  // Both canvas + conceptual
  onSelect={(scopeId) => createLink(instanceId, scopeId)}
  groupBy="type"  // Group by conceptual vs canvas
/>
```

**UI:**
```
┌─ Select Scope ──────────────┐
│                              │
│ 💭 Conceptual Scopes         │
│ ✓ Demolish ground floor      │
│   Remove all doors           │
│                              │
│ 📍 Canvas Scopes             │
│   Sheet 3 annotation         │
│   Sheet 5 detail area        │
└──────────────────────────────┘
```

#### 6.2: Update `EntitySelector` Component

**If using existing component:**
```typescript
// EntitySelector.tsx
const scopeOptions = entities
  .filter(e => e.entity_type === 'scope')
  .map(s => ({
    id: s.id,
    label: s.name || s.description || s.id.slice(0, 6),
    type: s.bounding_box ? 'canvas' : 'conceptual',
    sheet: s.source_sheet_number || null,
  }));

// Group by type
const grouped = {
  conceptual: scopeOptions.filter(s => s.type === 'conceptual'),
  canvas: scopeOptions.filter(s => s.type === 'canvas'),
};
```

---

### Phase 7: Canvas Rendering - Handle Optional Bbox

**Files to modify:**
- `frontend/src/components/EntitiesOverlay.tsx`
- `frontend/src/ui_v2/OverlayLayer.tsx`

#### 7.1: Filter Out Conceptual Scopes from Canvas

Ensure rendering logic doesn't crash on `undefined` bbox:

```typescript
// EntitiesOverlay.tsx
const renderableEntities = entities.filter(e => {
  // Only render entities with spatial data
  return e.bounding_box !== null && e.bounding_box !== undefined;
});

renderableEntities.forEach(entity => {
  // Safe to access bounding_box here
  const { x1, y1, x2, y2 } = entity.bounding_box;
  // ... render
});
```

#### 7.2: Scope Overlay Styling

```typescript
// Different visual for canvas scopes
if (entity.entity_type === 'scope') {
  stroke = '#8b5cf6';  // Purple for scopes
  strokeWidth = 2;
  fill = 'rgba(139, 92, 246, 0.1)';
  
  // Add label
  renderLabel(entity.name || 'Scope', x1, y1);
}
```

---

## Data Migration

### Existing Scopes

**Check:** Are there existing scopes in production with required bbox?

**If YES:**
1. No migration needed - they'll continue working as "canvas scopes"
2. New conceptual scopes will coexist with canvas scopes

**If NO:**
1. No migration needed - fresh start

### Validation

**Backend:**
```python
# Ensure backward compatibility
def validate_scope(scope_data: dict) -> bool:
    # Old scopes (with bbox) must have sheet number
    if scope_data.get('bounding_box') and not scope_data.get('source_sheet_number'):
        return False
    
    # New conceptual scopes must have name or description
    if not scope_data.get('bounding_box') and not scope_data.get('name') and not scope_data.get('description'):
        return False
    
    return True
```

---

## Testing Checklist

### Backend:
- [ ] Create conceptual scope (no bbox, no sheet) → succeeds
- [ ] Create canvas scope (with bbox, with sheet) → succeeds
- [ ] Create scope with bbox but no sheet → fails with validation error
- [ ] Create scope with no bbox, no name, no description → fails
- [ ] Update conceptual scope to add bbox → succeeds
- [ ] GET /entities returns both scope types
- [ ] Scopes serialize correctly to JSON with null bbox

### Frontend - Explorer:
- [ ] Scopes tab shows all scopes from entities array
- [ ] Conceptual scopes display with 💭 icon
- [ ] Canvas scopes display with 📍 icon and "Jump" button
- [ ] "+ New Scope" button opens creation form
- [ ] "+ Draw Scope" button enters canvas drawing mode
- [ ] Scope counts display correctly (X total, Y conceptual, Z canvas)

### Frontend - Creation:
- [ ] Create conceptual scope → saves without bbox
- [ ] Create canvas scope via draw → saves with bbox
- [ ] Conceptual scope appears immediately in Explorer
- [ ] Canvas scope appears in Explorer AND on canvas
- [ ] Form validation prevents empty scopes

### Frontend - Editing:
- [ ] Edit conceptual scope in Entity Tab → shows fields without bbox section
- [ ] Edit canvas scope in Entity Tab → shows bbox + sheet
- [ ] "+ Add Canvas Location" button appears for conceptual scopes
- [ ] Click "+ Add Canvas Location" → enters drawing mode
- [ ] Drawing bbox updates conceptual scope to canvas scope

### Frontend - Linking:
- [ ] Link instance → scope shows ALL scopes (conceptual + canvas)
- [ ] Scopes grouped by type in selector
- [ ] Creating JUSTIFIED_BY link succeeds for both scope types
- [ ] Instance linked to conceptual scope → shows complete (green)
- [ ] Entity Tab displays linked conceptual scopes correctly

### Frontend - Canvas:
- [ ] Canvas-based scopes render with purple outline
- [ ] Conceptual scopes do NOT render on canvas
- [ ] Hovering canvas scope highlights it
- [ ] Right-click canvas scope → context menu works
- [ ] Canvas doesn't crash on scopes with null bbox

---

## Success Metrics

- ✅ Create conceptual scope in < 5 seconds via "+ New Scope" button
- ✅ All scopes visible in Explorer tab regardless of bbox presence
- ✅ Link instance to conceptual scope works seamlessly
- ✅ No crashes or console errors when handling null bbox
- ✅ Existing canvas-based scopes continue working without changes

---

## Files to Modify Summary

### Backend (3 files):
1. `backend/app/entities_models.py` - Make Scope bbox/sheet optional
2. `backend/app/entities_store.py` - Handle null bbox in queries
3. `backend/app/main.py` - Update API validation (if needed)

### Frontend (6 files):
1. `frontend/src/components/RightExplorer.tsx` - Fix ScopesList data source, add buttons
2. `frontend/src/components/RightPanel.tsx` - Add scope creation form
3. `frontend/src/components/EntityEditor.tsx` - Handle scopes without bbox
4. `frontend/src/state/store.ts` - Add scope creation actions
5. `frontend/src/components/EntitiesOverlay.tsx` - Filter null bbox
6. `frontend/src/ui_v2/OverlayLayer.tsx` - Canvas drawing for scopes

---

## Phased Rollout

### Phase 1 (MVP): Conceptual Scopes
- Backend: Make bbox optional
- Frontend: Fix Explorer data source, add "+ New Scope" button
- **Result:** Users can create and link conceptual scopes

### Phase 2: Enhanced UX
- Add "+ Draw Scope" for canvas-based scopes
- Visual distinction (icons, colors)
- "Add Canvas Location" for upgrading conceptual → canvas

### Phase 3: Polish
- Scope grouping in Explorer (by type, by sheet)
- Batch operations (delete multiple, bulk link)
- Scope templates (common construction scopes)

---

## Open Questions

1. **Should conceptual scopes have optional `scope` field (project vs sheet)?**
   - Current: Definitions have `scope: 'project' | 'sheet'`
   - Proposal: Add to Scope model for organizational hierarchy
   
2. **Allow users to convert canvas scope → conceptual (remove bbox)?**
   - Use case: User drew bbox by mistake, wants to make it conceptual
   - Implementation: Delete button for bbox in Entity Editor

3. **Search/filter conceptual vs canvas scopes?**
   - Explorer filter dropdown: "Show: All | Conceptual | Canvas"

4. **Validation for duplicate scope names?**
   - Backend: Warn if creating scope with same name as existing
   - UX: Show suggestions "Did you mean: [Existing Scope]?"

---

## Migration Path for Existing Users

**Current State:**
- Some users may have scopes created via canvas (with bbox)
- These are "canvas scopes"

**After Refactor:**
- All existing scopes continue working (backward compatible)
- New scopes can be created without bbox (conceptual)
- No data migration needed

**Communication:**
- Release notes: "You can now create scopes without drawing on canvas!"
- Tutorial: "Use '+ New Scope' for project-level scopes, '+ Draw Scope' for area-specific annotations"

