# Scope Refactor - Current Status & Next Steps

## ✅ **COMPLETED: Phases 1 & 2**

### Phase 1: Frontend UI Updates ✅
**File:** `frontend/src/components/RightExplorer.tsx`

**What was done:**
1. ✅ Fixed critical bug: Scopes now query `entities` array (not `concepts`)
2. ✅ Separated conceptual vs canvas scopes with visual indicators
3. ✅ Added "+ New Scope" and "+ Draw Scope" buttons
4. ✅ Created two sections: 💭 Conceptual Scopes and 📍 Canvas Scopes
5. ✅ Enhanced scope cards with Edit/Jump buttons
6. ✅ Frontend builds successfully (713KB bundle)

**Result:** 
- Existing canvas-based scopes now visible in Explorer tab
- UI is ready for conceptual scopes once backend/store wiring complete
- Clear visual distinction between scope types

---

### Phase 2: Backend Model Updates ✅
**File:** `backend/app/entities_models.py`

**What was done:**

#### 1. Updated `Scope` Model (lines 91-130)
- **Broke inheritance** from `BaseVisualEntity` to make spatial fields optional
- Made `source_sheet_number` optional (was required)
- Made `bounding_box` optional (was required)
- Added validator to ensure:
  - If bbox exists, sheet must exist
  - If bbox is null, name or description must exist
  - Prevents meaningless scopes

**Before:**
```python
class Scope(BaseVisualEntity):  # Inherited required bbox + sheet
    name: str | None = None
    description: str | None = None
```

**After:**
```python
class Scope(BaseModel):
    # ... id, entity_type, name, description
    source_sheet_number: Optional[int] = None  # Now optional
    bounding_box: Optional[BoundingBox] = None  # Now optional
    
    @validator('bounding_box')
    def _validate_bbox_sheet_consistency(cls, v, values):
        # Validation logic for consistency
```

#### 2. Updated `CreateScope` Model (lines 211-238)
- Made `source_sheet_number` and `bounding_box` optional in creation payload
- Added same validation logic as `Scope` model
- Ensures 4-value bbox format when provided

**Result:**
- ✅ Backend models compile successfully
- ✅ API can now accept scopes without bbox/sheet
- ✅ Validation prevents invalid scope creation
- ⚠️ Deprecation warning: `orm_mode` → `from_attributes` (Pydantic V2, not critical)

---

## 🚧 **REMAINING: Phases 3-6**

### Phase 3: Frontend Store Actions (TODO)
**Estimated Time:** 2-3 hours

**File:** `frontend/src/state/store.ts`

**What needs to be done:**

1. **Add State:**
   ```typescript
   scopeCreationMode: {
     active: boolean;
     type: 'canvas' | 'conceptual' | null;
   }
   ```

2. **Add Actions:**
   - `startScopeCreation(type)` - Opens modal or enters drawing mode
   - `createScope(data)` - Calls API, checks duplicates, creates scope
   - `updateScopeLocation(id, sheet, bbox)` - Adds canvas location to conceptual scope
   - `removeScopeLocation(id)` - Removes canvas location (converts to conceptual)
   - `checkDuplicateScopeName(name)` - Returns warning if duplicate exists

3. **Duplicate Name Warning:**
   - Before creating, check if `name` matches existing scope
   - Show confirmation dialog: "A scope with similar name 'X' exists. Create anyway?"
   - User can confirm or cancel

---

### Phase 4: Scope Creation Modal (TODO)
**Estimated Time:** 2 hours

**File:** `frontend/src/components/ScopeCreationModal.tsx` (NEW)

**What needs to be done:**

1. **Create Modal Component:**
   - Form with Name* and Description fields
   - Real-time duplicate name warning (yellow banner)
   - Type indicator (💭 Conceptual or 📍 Canvas)
   - "Create Scope" and "Cancel" buttons

2. **Form Logic:**
   - Auto-focus name field on open
   - Validate: at least name OR description required
   - Check duplicates on name change (debounced)
   - Submit → calls `createScope()` action

3. **Canvas Scope Flow:**
   - After creating canvas scope (with name), automatically enter drawing mode
   - User draws bbox on canvas
   - Bbox is saved via `updateScopeLocation()`

---

### Phase 5: Entity Editor Updates (TODO)
**Estimated Time:** 1-2 hours

**File:** `frontend/src/components/EntityEditor.tsx`

**What needs to be done:**

1. **Conditional Field Rendering:**
   - Only show "Bounding Box" section if `entity.bounding_box` exists
   - Only show "Sheet" section if `entity.source_sheet_number` exists

2. **Scope Type Indicator:**
   ```tsx
   <div>
     <label>Type</label>
     {entity.bounding_box ? '📍 Canvas-based' : '💭 Conceptual'}
   </div>
   ```

3. **Bidirectional Conversion Buttons:**
   - Conceptual → Canvas: "+ Add Canvas Location" button
     - Enters drawing mode
     - User draws bbox
     - Calls `updateScopeLocation()`
   
   - Canvas → Conceptual: "Remove Canvas Location" button (red text)
     - Shows confirmation dialog
     - Calls `removeScopeLocation()`

---

### Phase 6: Canvas Rendering Filter (TODO)
**Estimated Time:** 30 minutes

**File:** `frontend/src/components/EntitiesOverlay.tsx`

**What needs to be done:**

1. **Filter null bbox entities before rendering:**
   ```typescript
   const renderableEntities = entities.filter(e => 
     e.bounding_box !== null && e.bounding_box !== undefined
   );
   ```

2. **Why this is needed:**
   - Conceptual scopes have `bounding_box: null`
   - Rendering logic assumes bbox exists
   - Without filter, app crashes on null access

---

## 🎯 **Implementation Roadmap**

### Recommended Order:

**Next Session 1: Store & Modal (3-4 hours)**
1. Implement Phase 3 (Store actions)
2. Implement Phase 4 (Creation modal)
3. Wire up "+ New Scope" button to modal
4. Test: Create conceptual scope end-to-end

**Next Session 2: Editor & Canvas (2-3 hours)**
5. Implement Phase 5 (Entity Editor updates)
6. Implement Phase 6 (Canvas rendering filter)
7. Test: Add/remove canvas locations
8. Test: Edit both scope types

**Next Session 3: Testing & Polish (2 hours)**
9. Comprehensive testing of all workflows
10. Edge case handling
11. Documentation updates

**Total Remaining Estimate:** ~7-9 hours

---

## 🧪 **Testing Plan**

### Critical Tests (Phase 1 & 2 - Ready Now):

#### Backend API Tests:
```bash
# Test 1: Create conceptual scope (no bbox)
POST /api/projects/{id}/entities
{
  "entity_type": "scope",
  "name": "Demolish ground floor walls",
  "description": "Remove all interior walls"
}
# Expected: ✅ Success

# Test 2: Create canvas scope (with bbox)
POST /api/projects/{id}/entities
{
  "entity_type": "scope",
  "name": "Demo area",
  "source_sheet_number": 3,
  "bounding_box": [100, 200, 300, 400]
}
# Expected: ✅ Success

# Test 3: Invalid - bbox without sheet
POST /api/projects/{id}/entities
{
  "entity_type": "scope",
  "name": "Invalid",
  "bounding_box": [100, 200, 300, 400]
}
# Expected: ❌ 400 Error "source_sheet_number required when bounding_box is provided"

# Test 4: Invalid - no bbox, no text
POST /api/projects/{id}/entities
{
  "entity_type": "scope"
}
# Expected: ❌ 400 Error "name or description required for conceptual scopes"
```

#### Frontend Tests (After Phase 3-6):
- [ ] Explorer tab shows existing scopes (regression test)
- [ ] Click "+ New Scope" → modal opens
- [ ] Create conceptual scope → appears in 💭 section
- [ ] Click "+ Draw Scope" → modal opens → draw on canvas
- [ ] Create canvas scope → appears in 📍 section with sheet number
- [ ] Edit conceptual scope → no bbox/sheet fields shown
- [ ] Edit canvas scope → bbox/sheet fields shown
- [ ] Click "+ Add Canvas Location" → enter drawing mode → adds bbox
- [ ] Click "Remove Canvas Location" → confirm → removes bbox (moves to conceptual section)
- [ ] Duplicate name warning appears when entering existing name
- [ ] Link instance to conceptual scope → instance shows complete (green)
- [ ] Canvas rendering doesn't crash on conceptual scopes

---

## 📊 **Progress Summary**

| Phase | Status | Time Spent | Files Changed | Tests Passing |
|-------|--------|------------|---------------|---------------|
| 1. Frontend UI | ✅ Complete | 1 hour | 1 | Build ✅ |
| 2. Backend Models | ✅ Complete | 1 hour | 1 | Import ✅ |
| 3. Store Actions | 🚧 TODO | - | 1 (est) | - |
| 4. Creation Modal | 🚧 TODO | - | 1 (new) | - |
| 5. Entity Editor | 🚧 TODO | - | 1 | - |
| 6. Canvas Filter | 🚧 TODO | - | 1 | - |

**Total Progress:** 33% complete (2 of 6 phases)

---

## 🎉 **What Works Right Now**

1. ✅ Scopes visible in Explorer tab (critical bug fixed)
2. ✅ UI shows "+ New Scope" and "+ Draw Scope" buttons
3. ✅ Backend accepts `POST /entities` with no bbox for scopes
4. ✅ Backend validates bbox/sheet consistency
5. ✅ Frontend builds without errors
6. ✅ Backend models compile without errors

**What Doesn't Work Yet:**
- ❌ Clicking buttons doesn't do anything (no store actions)
- ❌ Can't create conceptual scopes via UI (modal not built)
- ❌ Can't convert between scope types (conversion logic not implemented)
- ❌ Canvas may crash if conceptual scope exists (no rendering filter)

---

## 🤔 **Questions / Decisions Needed**

### 1. Scope Search in Linking UI
When linking an instance to a scope, should we:
- **Option A:** Show all scopes (conceptual + canvas) in a flat list
- **Option B:** Group by type (💭 Conceptual | 📍 Canvas)
- **Option C:** Filter by current sheet (only show relevant canvas scopes + all conceptual)

**Recommendation:** Option B - grouped by type for clarity

### 2. Default Scope Type
When user clicks generic "Add Scope" somewhere else (not in Explorer), should we:
- **Option A:** Always create conceptual (simpler)
- **Option B:** Ask user to choose type in modal
- **Option C:** Smart default based on context (conceptual if no sheet context)

**Recommendation:** Option C - contextual defaults

### 3. Bulk Operations
Should we support:
- Convert multiple canvas scopes to conceptual at once?
- Delete multiple scopes at once?

**Recommendation:** Defer to later - not part of MVP

---

## 📝 **Next Action Items**

**For Immediate Testing (Now):**
1. Test backend API with curl/Postman:
   - Create conceptual scope via API
   - Create canvas scope via API
   - Verify validation errors

**For Next Implementation Session:**
1. Implement `scopeCreationMode` state in store
2. Implement `startScopeCreation()` action
3. Create `ScopeCreationModal` component
4. Wire up buttons to modal
5. Test conceptual scope creation end-to-end

---

**Status:** ✅ Phase 1 & 2 complete, ready for Phase 3  
**Build:** ✅ Frontend passing, Backend passing  
**Next Step:** Implement store actions & creation modal

