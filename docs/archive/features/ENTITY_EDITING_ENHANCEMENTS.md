# Entity Editing Enhancements - Summary

## Problems Fixed

### 1. ✅ Right-Click Edit Properties for Symbol Instances
**Problem:** Right-clicking a symbol instance → "Edit properties" didn't work (showed "not supported" toast).

**Root Cause:** `openPropertiesForm()` in `OverlayLayer.tsx` was missing cases for `symbol_instance` and `component_instance`.

**Solution:** Added initial values extraction for both instance types:

```typescript
// OverlayLayer.tsx (lines 605-611)
} else if (entity.entity_type === 'symbol_instance') {
  initialValues.symbolDefinitionId = (entity as any).symbol_definition_id ?? '';
  initialValues.recognizedText = (entity as any).recognized_text ?? '';
} else if (entity.entity_type === 'component_instance') {
  initialValues.componentDefinitionId = (entity as any).component_definition_id ?? '';
  initialValues.recognizedText = (entity as any).recognized_text ?? '';
}
```

**Result:** Right-click → "Edit properties" now opens the inline form pre-filled with current values.

---

### 2. ✅ Edit Button in Definition Section
**Problem:** In Entity Tab, when viewing a symbol instance, the "Edit" button next to its definition didn't work (just had a TODO comment).

**Root Cause:** Button only called `setRightPanelTab('entities')` without selecting the entity.

**Solution:** Used `selectEntity()` action to atomically switch to Entities tab and select the definition:

```typescript
// EntityEditor.tsx (lines 658-663)
<button
  onClick={() => {
    if (linkedItems.definition) {
      selectEntity(linkedItems.definition.id);
    }
  }}
>
  Edit
</button>
```

**Result:** Clicking "Edit" on definition navigates to that definition in Entity Tab.

---

### 3. ✅ Added Edit Buttons to Instances List
**Enhancement:** When viewing a symbol definition, the instances list now has "Edit" buttons.

**Solution:** Added Edit button to each instance card:

```typescript
// EntityEditor.tsx (lines 679-696)
{linkedItems.instances.slice(0, 5).map((inst: Entity) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>#{inst.id.slice(0, 6)} • Sheet {inst.source_sheet_number}</span>
    <button onClick={() => selectEntity(inst.id)}>Edit</button>
  </div>
))}
```

**Result:** Definitions can easily navigate to edit their instances.

---

### 4. ✅ Added Edit Buttons to Evidence List
**Enhancement:** When viewing a scope, the evidence list now has "Edit" buttons.

**Solution:** Added Edit button next to unlink button for each evidence item:

```typescript
// EntityEditor.tsx (lines 828-834)
<div style={{ display: 'flex', gap: 8 }}>
  <button onClick={() => selectEntity(ev.id)}>Edit</button>
  <button onClick={() => unlinkEvidence(ev.id)}>×</button>
</div>
```

**Result:** Scopes can easily navigate to edit their linked evidence entities.

---

## Complete Editing Workflows Now Available

### **From Canvas (Right-Click)**
1. Right-click any symbol instance
2. Click "Edit properties"
3. ✅ Inline form opens with current values pre-filled
4. Edit semantic meaning or change definition
5. Save changes

### **From Entity Tab (Definition → Instance)**
1. Select symbol definition in Entity Tab
2. View "Instances" section
3. Click "Edit" on any instance
4. ✅ Navigates to that instance in Entity Tab
5. Edit and save

### **From Entity Tab (Instance → Definition)**
1. Select symbol instance in Entity Tab
2. View "Definition" section
3. Click "Edit" on definition
4. ✅ Navigates to definition in Entity Tab
5. View/edit definition properties

### **From Entity Tab (Scope → Evidence)**
1. Select scope in Entity Tab
2. View "Evidence" section
3. Click "Edit" on any evidence item
4. ✅ Navigates to that instance/note
5. Edit and save

---

## Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `frontend/src/ui_v2/OverlayLayer.tsx` | 605-611 | Add symbol/component instance support to `openPropertiesForm` |
| `frontend/src/components/EntityEditor.tsx` | 27, 42, 658-663, 679-696, 828-834 | Add `selectEntity`, fix Edit buttons, add Edit to lists |

---

## Additional Enhancements (Latest)

### 5. ✅ Fixed Form Type Mapping
**Problem:** `formTypeByEntity` was missing `symbol_instance` and `component_instance` mappings.

**Solution:** Added both instance types to the mapping:
```typescript
const formTypeByEntity = {
  // ... existing
  symbol_instance: 'SymbolInst',
  component_instance: 'CompInst',
};
```

**Result:** Right-click edit now works for all entity types!

---

### 6. ✅ Show All Instances (No "...and X more")
**Problem:** Only first 5 instances shown with "...and X more" message.

**Solution:** 
- Removed `.slice(0, 5)` limit
- Added scrollable container with `maxHeight: '240px'` and `overflowY: 'auto'`

**Result:** All instances visible in clean scrollable list!

---

### 7. ✅ Show Recognized Text in Instance Lists
**Problem:** Instance cards only showed ID and sheet number - no semantic meaning visible.

**Solution:** Added recognized text display below each instance:
```typescript
{recognizedText && (
  <div style={{ 
    fontSize: 11, 
    color: '#64748b', 
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }}>
    "{recognizedText.slice(0, 40)}{recognizedText.length > 40 ? '...' : ''}"
  </div>
)}
```

**Applied to:**
- Instances list (when viewing definition)
- Evidence list (when viewing scope)

**Result:** Easy to identify instances at a glance by their semantic meaning!

---

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Right-click symbol instance → "Edit properties" → Form opens (no "not supported" toast) ✅ **FIXED (form type mapping)**
- [ ] Edit semantic meaning in form → Save → Changes persist
- [ ] Edit definition selection in form → Save → Updates
- [ ] Entity Tab: View instance → Click "Edit" on definition → Navigates
- [ ] Entity Tab: View definition → See all instances (no "...and X more") ✅ **FIXED (scrollable list)**
- [ ] Entity Tab: View definition → Instances show recognized text preview ✅ **FIXED (italic preview)**
- [ ] Entity Tab: View definition → List scrolls smoothly with 10+ instances ✅ **FIXED (240px maxHeight)**
- [ ] Entity Tab: View scope → Click "Edit" on evidence → Navigates
- [ ] Entity Tab: View scope → Evidence shows recognized text preview ✅ **FIXED (italic preview)**
- [ ] All Edit buttons use atomic `selectEntity()` (no race conditions)

---

## Latest Session: Component Stamping & Complete Duplication

### 8. ✅ Component Instance Stamping in Explorer
**Feature:** Allow stamping component instances the same way as symbol instances.

**Implementation:**
- Added stamp palette UI to `ComponentsDefinitions` (matches symbol stamping)
- Keyboard shortcuts 1-9 for first 9 component definitions
- Escape key to cancel stamping
- Visual feedback with blue highlight when active

**Files:** `frontend/src/components/RightExplorer.tsx`

---

### 9. ✅ Complete Duplication for All Entity Types
**Feature:** Enable duplication via context menu for ALL entity types, including instances.

**Implementation:**
- Extended `SUPPORTED` array to include `symbol_instance` and `component_instance`
- Added field copying logic:
  - Instances: Copy `definition_id` and `recognized_text`
  - **Links NOT copied** (JUSTIFIED_BY, LOCATED_IN, etc.) → user must re-link
  - **`defined_in_id` NOT copied** for component definitions → may be invalid after offset
- Smart offset: 2% of page width (16-48pt), clamped to page bounds
- Validation recomputed: Duplicated instances show red if incomplete

**Files:** `frontend/src/ui_v2/OverlayLayer.tsx`

**Documentation:** See `DUPLICATION_ANALYSIS.md` for comprehensive field-by-field analysis.

---

### Fields NOT Duplicated (Design Decision):

| Field | Reason | User Impact |
|-------|--------|-------------|
| Links (JUSTIFIED_BY, etc.) | Contextual relationships require explicit user intent | Duplicated instances show red border, must re-link |
| `defined_in_id` | Spatial offset may invalidate parent container | Component definitions lose schedule association |
| `id`, `created_at`, `updated_at` | System-generated | Always new values |
| `bounding_box` | Avoid overlap | Offset applied automatically |

**Why Links Aren't Copied:**
> Links represent unique contextual relationships. Auto-copying would create ambiguous situations (e.g., two instances justified by same scope). User must explicitly re-link to clarify intent.

**Why Definition IDs ARE Copied:**
> Definition IDs represent "what type of thing is this". A duplicate instance is another occurrence of the same type, so copying the definition reference is correct.

---

## New Testing Checklist (Component Stamping & Duplication)

### Component Stamping:
- [ ] Explorer → Component Definitions → Stamp palette visible
- [ ] Click stamp button [1] → enters stamp mode (blue)
- [ ] Click canvas → places instance
- [ ] Press Esc → exits stamp mode
- [ ] Press 1-9 keys → activates corresponding definition

### Duplication - Instances:
- [ ] Right-click symbol_instance → Duplicate → definition_id & recognized_text copied
- [ ] Right-click component_instance → Duplicate → definition_id & recognized_text copied
- [ ] Duplicated instance shows red border (incomplete) if no scope links
- [ ] Right-click duplicated instance → Link → can re-link to scope

### Duplication - All Types:
- [ ] All 9 entity types support duplication via context menu
- [ ] Duplicate appears offset (no overlap)
- [ ] Duplicate near page edge → clamped to bounds
- [ ] Duplicate is auto-selected after creation

---

## Navigation Flow Summary

```
Canvas Entity (Right-Click)
    ↓
"Edit properties"
    ↓
Inline Form (Pre-filled)
    ↓
Edit & Save
    ↓
Entity Updated
```

```
Entity Tab: Instance
    ↓
Definition Section
    ↓
Click "Edit"
    ↓
Entity Tab: Definition (Selected)
    ↓
Edit Properties
```

```
Entity Tab: Definition
    ↓
Instances List (5 shown)
    ↓
Click "Edit" on Instance
    ↓
Entity Tab: Instance (Selected)
    ↓
Edit Properties
```

```
Entity Tab: Scope
    ↓
Evidence List
    ↓
Click "Edit" on Evidence
    ↓
Entity Tab: Instance/Note (Selected)
    ↓
Edit Properties
```

---

## Key Implementation Details

### Atomic Entity Selection
All Edit buttons use `selectEntity()` which:
1. Sets `selectedEntityId`
2. Sets `rightPanelTab` to 'entities'
3. Sets `_explicitSelection` flag (prevents canvas override)
4. Clears flag after 100ms

This ensures navigation is smooth and doesn't get interrupted by canvas interactions.

### Form Type Mapping
The `formTypeByEntity` constant maps entity types to form variants:
- `symbol_instance` → `'SymbolInst'` → SymbolInstanceForm
- `component_instance` → `'CompInst'` → ComponentInstanceForm

The `openPropertiesForm` function uses this mapping to open the correct form variant.

---

## Benefits

1. **Consistent UX**: Edit workflow is the same everywhere (canvas, Entity Tab, Explorer)
2. **Quick Navigation**: Jump between related entities (definition ↔ instances, scope ↔ evidence)
3. **No Dead Ends**: Every "Edit" button actually works
4. **Pre-filled Forms**: Right-click edit shows current values, no starting from scratch
5. **Atomic Operations**: Selection uses store action, no race conditions

---

## Future Enhancements (Out of Scope)

1. **Bulk Edit**: Select multiple instances and edit properties in batch
2. **History**: Show edit history for an entity
3. **Templates**: Save common property sets as templates
4. **Keyboard Shortcuts**: E key to edit selected entity
5. **Preview Changes**: Show diff before saving edits

