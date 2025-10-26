# Scope Refactor - Executive Summary

## 🎯 Goal
Make scopes **first-class conceptual entities** that can exist independently of canvas, while still supporting canvas-based scopes for spatial annotation.

---

## 🔍 Root Cause Analysis

### Why Scopes Don't Show in Explorer:
```typescript
// Current code (LINE 42 of RightExplorer.tsx)
const ScopesList = ({ concepts, ... }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');  // ❌ WRONG
```

**Issue:** Scopes are stored as **entities** (in `entities.json`), but UI queries **concepts** array.

**Fix:** Change to:
```typescript
const ScopesList = ({ entities, ... }) => {
    const scopes = entities.filter(e => e.entity_type === 'scope');  // ✅ CORRECT
```

---

## 🏗️ Architecture Changes

### Backend Changes (3 files)

#### 1. Make `bounding_box` Optional for Scopes

**Current:**
```python
class Scope(BaseVisualEntity):  # Inherits required bbox + sheet
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
```

**New:**
```python
class Scope(BaseModel):  # Break inheritance to make spatial fields optional
    id: str
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
    
    # Optional spatial fields
    source_sheet_number: Optional[int] = None
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @validator('bounding_box')
    def validate_consistency(cls, v, values):
        # If bbox exists, sheet must exist
        # If neither exists, name or description must exist
        ...
```

**Files:**
- `backend/app/entities_models.py` - Model changes
- `backend/app/entities_store.py` - Handle null bbox in queries
- `backend/app/main.py` - API validation updates (if needed)

---

### Frontend Changes (6 files)

#### 1. Fix Explorer Data Source (CRITICAL BUG FIX)

**File:** `frontend/src/components/RightExplorer.tsx`

```typescript
// Change line 42 from:
const scopes = concepts.filter(c => c.kind === 'scope');

// To:
const scopes = entities.filter(e => e.entity_type === 'scope');
```

#### 2. Add "Create Scope" Button

**Location:** Explorer tab, above ScopesList

```tsx
<button onClick={() => startScopeCreation('conceptual')}>
  + New Scope
</button>
<button onClick={() => startScopeCreation('canvas')}>
  + Draw Scope
</button>
```

#### 3. Show Both Scope Types

```tsx
<div>
  <h4>💭 Conceptual Scopes (3)</h4>
  {conceptualScopes.map(scope => (
    <ScopeCard 
      scope={scope} 
      actions={['Edit', 'Delete', 'Add Location']}
    />
  ))}
  
  <h4>📍 Canvas Scopes (5)</h4>
  {canvasScopes.map(scope => (
    <ScopeCard 
      scope={scope} 
      actions={['Edit', 'Jump', 'Delete']}
    />
  ))}
</div>
```

#### 4. Scope Creation Form

**Option A:** Modal form (recommended)
**Option B:** Inline in Entities tab

**Form fields:**
- Name * (required)
- Description (optional)
- Sheet (only for canvas scopes)

#### 5. Update Entity Editor

**Handle scopes without bbox:**
- Don't display "Bounding Box" section if null
- Don't display "Sheet" section if null
- Show scope type indicator (💭 Conceptual vs 📍 Canvas)
- Add "+ Add Canvas Location" button for conceptual scopes

#### 6. Filter Canvas Rendering

**File:** `frontend/src/components/EntitiesOverlay.tsx`

```typescript
const renderableEntities = entities.filter(e => 
  e.bounding_box !== null && e.bounding_box !== undefined
);
```

---

## 📊 Two Scope Types

| Feature | Conceptual Scope | Canvas Scope |
|---------|------------------|--------------|
| **Definition** | Project-level requirement | Area-specific annotation |
| **Bbox** | ❌ None | ✅ Required |
| **Sheet** | ❌ None | ✅ Required |
| **Example** | "Demolish ground floor walls" | "Demo area (Sheet 3)" |
| **Creation** | "+ New Scope" button | "+ Draw Scope" → canvas drag |
| **Visible in Explorer** | ✅ Yes | ✅ Yes |
| **Visible on Canvas** | ❌ No | ✅ Yes |
| **Can Link to Instances** | ✅ Yes | ✅ Yes |
| **Icon** | 💭 | 📍 |

---

## 🔄 User Workflows

### Create Conceptual Scope:
1. Click "+ New Scope" in Explorer
2. Fill name/description in form
3. Save → appears in "Conceptual Scopes" section
4. Link to instances via JUSTIFIED_BY

### Create Canvas Scope:
1. Click "+ Draw Scope" in Explorer
2. Drag bbox on canvas
3. Fill name/description in form
4. Save → appears in "Canvas Scopes" section + renders on canvas
5. Link to instances via JUSTIFIED_BY

### Convert Conceptual → Canvas:
1. Open conceptual scope in Entity Editor
2. Click "+ Add Canvas Location"
3. Drag bbox on canvas
4. Save → scope moves to "Canvas Scopes" section

---

## 🎨 Visual Design

### Explorer Tab UI:
```
┌─ Scopes ───────────────── + New Scope  + Draw Scope ─┐
│                                                        │
│ 💭 Conceptual Scopes (3)                              │
│ ┌────────────────────────────────────────────────┐   │
│ │ Demolish ground floor walls                    │   │
│ │ ⚠ No evidence                                  │   │
│ │                          [Edit] [+ Location]   │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ 📍 Canvas Scopes (5)                                  │
│ ┌────────────────────────────────────────────────┐   │
│ │ Demo area • Sheet 3                            │   │
│ │ ✓ 12 evidence                                  │   │
│ │                          [Edit] [Jump]         │   │
│ └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Entity Tab UI (Conceptual Scope):
```
┌─ Entity Editor ───────────────────────────────────────┐
│ Type: 💭 Conceptual                                   │
│                                                        │
│ Name: Demolish ground floor walls                     │
│ Description: Remove all interior walls on ground...   │
│                                                        │
│ Evidence (0)                                           │
│ (No evidence linked)                              [+]  │
│                                                        │
│ [+ Add Canvas Location]                                │
│                                                        │
│ [Save Changes]  [Delete]  [Deselect]                  │
└────────────────────────────────────────────────────────┘
```

---

## ✅ Validation Rules

### Backend:
```python
# Conceptual scope (no bbox)
{
  "entity_type": "scope",
  "name": "Demolish walls",  # ✅ Name OR description required
  "description": null,
  "bounding_box": null,      # ✅ OK
  "source_sheet_number": null  # ✅ OK
}

# Canvas scope (with bbox)
{
  "entity_type": "scope",
  "name": "Demo area",
  "bounding_box": [100, 200, 300, 400],  # ✅ Has bbox
  "source_sheet_number": 3  # ✅ Required when bbox exists
}

# Invalid: bbox without sheet
{
  "bounding_box": [100, 200, 300, 400],
  "source_sheet_number": null  # ❌ Error: sheet required with bbox
}

# Invalid: neither bbox nor text
{
  "name": null,
  "description": null,
  "bounding_box": null  # ❌ Error: name or description required
}
```

---

## 🚀 Implementation Phases

### Phase 1: Fix Critical Bug (1 hour)
- ✅ Fix Explorer to query `entities` not `concepts`
- ✅ Scopes now visible in Explorer tab

### Phase 2: Backend Optional Bbox (2 hours)
- ✅ Update Scope model to make bbox/sheet optional
- ✅ Add validation for consistency
- ✅ Test API with both scope types

### Phase 3: Frontend Creation (3 hours)
- ✅ Add "+ New Scope" button
- ✅ Create scope creation form/modal
- ✅ Wire up store actions
- ✅ Test conceptual scope creation

### Phase 4: Canvas Integration (2 hours)
- ✅ Add "+ Draw Scope" button
- ✅ Canvas drawing flow
- ✅ Update Entity Editor for both types
- ✅ Filter canvas rendering

### Phase 5: Polish & Testing (2 hours)
- ✅ Visual indicators (icons)
- ✅ "+ Add Canvas Location" for conversion
- ✅ Comprehensive testing
- ✅ Documentation

**Total Estimate:** ~10 hours

---

## ⚠️ Breaking Changes

### Backward Compatibility:
✅ **NO BREAKING CHANGES**

**Reason:** Existing scopes with bbox continue working as "canvas scopes". New optional bbox field is additive.

**Migration:** None needed

---

## 🧪 Testing Strategy

### Critical Tests:
1. **Explorer displays scopes** (fix verification)
2. **Create conceptual scope** (no bbox)
3. **Create canvas scope** (with bbox)
4. **Link instance to conceptual scope** (shows complete)
5. **Canvas doesn't crash on null bbox** (rendering filter)
6. **Entity Editor handles both types** (conditional rendering)

---

## 📝 Open Questions for User

### 1. Form Style Preference?
- **Option A:** Modal form (floating over canvas) ← Recommended
- **Option B:** Inline form in Entities tab

### 2. Scope Hierarchy?
Should conceptual scopes have `scope: 'project' | 'building'` field for organization?

Example:
```
Project Scopes (3)
  - Demolish ground floor
  - Install new HVAC
  
Building A Scopes (2)
  - Remove doors
  - Paint walls
```

### 3. Duplicate Name Warning?
Should we warn users if creating scope with same name as existing scope?

### 4. Conversion Direction?
- ✅ Conceptual → Canvas (via "+ Add Canvas Location")
- ❓ Canvas → Conceptual (remove bbox via "Remove Location")?

---

## 🎯 Success Criteria

- ✅ All scopes visible in Explorer (conceptual + canvas)
- ✅ Create conceptual scope without drawing on canvas
- ✅ Link instances to conceptual scopes seamlessly
- ✅ No console errors for null bbox
- ✅ Existing canvas scopes continue working
- ✅ Clear visual distinction between scope types

---

## 📦 Deliverables

1. **Updated Backend Models** - Optional bbox/sheet for Scope
2. **Explorer Bug Fix** - Query entities not concepts
3. **Scope Creation UI** - "+ New Scope" and "+ Draw Scope" buttons
4. **Scope Creation Forms** - For both types
5. **Entity Editor Updates** - Handle both scope types
6. **Canvas Rendering Filter** - Skip conceptual scopes
7. **Visual Indicators** - Icons and colors
8. **Comprehensive Tests** - All workflows verified
9. **Documentation** - User guide for scope types

---

**Ready to proceed?** Please review and provide feedback on:
1. Form style preference (modal vs inline)
2. Open questions above
3. Any additional requirements or concerns

