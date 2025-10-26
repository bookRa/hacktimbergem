# Component Stamping & Complete Duplication Implementation

## ✅ Feature 1: Component Instance Stamping

### Changes Made

**File:** `frontend/src/components/RightExplorer.tsx`

#### 1. Added Imports
```typescript
import React, { useEffect } from 'react';
```

#### 2. Added State & Keyboard Shortcuts to ComponentsDefinitions
```typescript
const { creatingEntity, startInstanceStamp, cancelEntityCreation } = useProjectStore(...);

useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) {
      const d = defs[n - 1];
      if (d) { startInstanceStamp('component', d.id); e.preventDefault(); }
    }
    if (e.key === 'Escape') { 
      if (creatingEntity && creatingEntity.type === 'component_instance') { 
        cancelEntityCreation(); 
      }
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [defs, creatingEntity, startInstanceStamp, cancelEntityCreation]);
```

#### 3. Added Stamp Palette UI
```typescript
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
  {defs.slice(0, 9).map((d: any, idx: number) => {
    const active = creatingEntity && 
                   creatingEntity.type === 'component_instance' && 
                   creatingEntity.meta?.definitionId === d.id;
    return (
      <button 
        key={d.id} 
        onClick={() => startInstanceStamp('component', d.id)} 
        title={`Press ${idx + 1}`} 
        style={{ 
          background: active ? '#2563eb' : '#f5f7fa', 
          color: active ? '#fff' : '#111', 
          // ... styling
        }}
      >
        [{idx + 1}] {d.name || d.id.slice(0,6)}
      </button>
    );
  })}
  {(creatingEntity && creatingEntity.type === 'component_instance') && (
    <button onClick={() => cancelEntityCreation()}>
      Cancel Stamping (Esc)
    </button>
  )}
</div>
```

### User Workflow

1. **Open Explorer Tab** → Navigate to "Component Definitions" section
2. **Stamp Palette Appears** → Shows first 9 component definitions with keyboard shortcuts
3. **Click Button or Press Number Key** → Enters stamp mode (button turns blue)
4. **Click on Canvas** → Places component instance
5. **Multiple Stamps** → Continue clicking to place multiple instances
6. **Cancel** → Click "Cancel Stamping" button or press `Esc`

### Keyboard Shortcuts
- `1-9` → Activate stamp mode for corresponding component definition
- `Esc` → Cancel stamping

---

## ✅ Feature 2: Complete Entity Duplication

### Changes Made

**File:** `frontend/src/ui_v2/OverlayLayer.tsx`

#### 1. Expanded Supported Entity Types (line 641-645)
```typescript
const SUPPORTED: Entity['entity_type'][] = [
  'drawing', 'legend', 'schedule', 'scope', 'note', 
  'symbol_definition', 'component_definition',
  'symbol_instance', 'component_instance'  // ← NEW
];
```

#### 2. Added Instance Field Copying (line 696-706)
```typescript
} else if (entity.entity_type === 'symbol_instance') {
  // Copy definition reference and recognized text
  // NOTE: Links (JUSTIFIED_BY to scopes) are NOT copied - user must re-link
  payload.symbol_definition_id = (entity as any).symbol_definition_id;
  payload.recognized_text = (entity as any).recognized_text ?? '';
} else if (entity.entity_type === 'component_instance') {
  // Copy definition reference and recognized text
  // NOTE: Links (JUSTIFIED_BY to scopes) are NOT copied - user must re-link
  payload.component_definition_id = (entity as any).component_definition_id;
  payload.recognized_text = (entity as any).recognized_text ?? '';
}
```

### User Workflow - All Entity Types

#### For Instances (Symbol/Component):
1. **Right-click instance** → "Duplicate"
2. **Duplicate appears offset** with:
   - ✅ Same definition reference
   - ✅ Same semantic meaning/recognized text
   - ✅ Same bounding box size
   - ❌ **No scope links** (shows red border if incomplete)
3. **Re-link if needed** → Right-click → "Link..." → Select scope

#### For Definitions (Symbol/Component):
1. **Right-click definition** → "Duplicate"
2. **Duplicate appears offset** with:
   - ✅ All fields copied (name, description, scope, specs/patterns)
   - ✅ Same bounding box size
   - ❌ `defined_in_id` cleared (no parent schedule association)

#### For All Other Types:
1. **Right-click entity** → "Duplicate"
2. **Duplicate appears offset** with all fields copied

### Spatial Offset Behavior
- **Default Offset:** 2% of page width (16-48pt range)
- **Smart Clamping:** If offset exceeds page bounds, shifts left/up to fit
- **Stacking:** Duplicate of duplicate applies offset from previous position

---

## Documentation Created

### 1. `DUPLICATION_ANALYSIS.md`
Comprehensive analysis document covering:

#### Fields That Cannot Be Perfectly Duplicated:
1. **System-Generated** - `id`, `created_at`, `updated_at` → Always new
2. **Spatial** - `bounding_box` → Offset to avoid overlap
3. **Relationships** - Links (JUSTIFIED_BY, etc.) → Not copied
4. **Parent References** - `defined_in_id` → Cleared (may be invalid)
5. **Derived** - `status`, `validation` → Recomputed

#### Fields That ARE Copied:
- ✅ Definition references (`symbol_definition_id`, `component_definition_id`)
- ✅ User content (`recognized_text`, `text`, `title`, `description`, `name`)
- ✅ Technical data (`specifications`, `visual_pattern_description`, `scope`)

#### Rationale:
- **Links not copied** because they represent unique contextual relationships
- **Definition IDs copied** because duplicate is another instance of same type
- **Parent container cleared** because spatial offset may invalidate containment

#### User Impact:
- Duplicated instances show **red border** (incomplete) if original had scope links
- User must **explicitly re-link** scope/space relationships
- All other properties ready to use immediately

---

## Testing Checklist

### Component Stamping:
- [x] Build succeeds
- [ ] Stamp palette appears in Explorer → Component Definitions
- [ ] Click stamp button → enters stamp mode (blue highlight)
- [ ] Press 1-9 keys → activates corresponding definition
- [ ] Click canvas → places instance at cursor
- [ ] Multiple clicks → places multiple instances
- [ ] Press Esc or click "Cancel Stamping" → exits mode
- [ ] Keyboard shortcuts don't fire when typing in input fields

### Duplication - All Entity Types:
- [x] Build succeeds
- [ ] Right-click drawing → Duplicate → copies title, description
- [ ] Right-click legend → Duplicate → copies title
- [ ] Right-click schedule → Duplicate → copies title
- [ ] Right-click scope → Duplicate → copies name, description (no links)
- [ ] Right-click note → Duplicate → copies text
- [ ] Right-click symbol_definition → Duplicate → copies all fields
- [ ] Right-click component_definition → Duplicate → copies all fields, `defined_in_id` null
- [ ] **Right-click symbol_instance → Duplicate → copies definition_id, recognized_text**
- [ ] **Right-click component_instance → Duplicate → copies definition_id, recognized_text**

### Duplication - Spatial:
- [ ] All duplicates appear offset from original
- [ ] Duplicate near page right edge → shifts left to fit
- [ ] Duplicate near page bottom edge → shifts up to fit
- [ ] Duplicate of duplicate → offsets stack correctly
- [ ] Duplicate is auto-selected after creation

### Duplication - Validation:
- [ ] Duplicated instance without scope links → shows red border
- [ ] Duplicated instance with definition → definition field populated
- [ ] Right-click duplicated instance → "Edit properties" → fields pre-filled
- [ ] Entity Tab shows duplicate with correct validation status

### Duplication - Context Menu:
- [ ] Context menu shows "Duplicate" for all entity types
- [ ] Duplicate action completes without errors
- [ ] Toast appears confirming duplication (if implemented)

---

## Files Modified

1. **`frontend/src/components/RightExplorer.tsx`**
   - Added `useEffect` import
   - Added keyboard shortcuts to `ComponentsDefinitions`
   - Added stamp palette UI for component instances
   
2. **`frontend/src/ui_v2/OverlayLayer.tsx`**
   - Expanded `SUPPORTED` entity types array
   - Added field copying logic for `symbol_instance`
   - Added field copying logic for `component_instance`

---

## Files Created

1. **`DUPLICATION_ANALYSIS.md`**
   - Complete field-by-field analysis
   - Rationale for each decision
   - User impact documentation
   - Testing checklist

2. **`STAMPING_AND_DUPLICATION_IMPLEMENTATION.md`** (this file)
   - Implementation summary
   - Code snippets
   - User workflows
   - Testing checklist

---

## Key Implementation Notes

### Why Links Aren't Copied:
```
Links represent contextual relationships:
- Scope → Instance: "This instance is justified by this scope"
- Instance → Space: "This instance is located in this space"

If we auto-copy these links, we'd create ambiguous situations:
- Two instances justified by same scope (potentially correct, but user should decide)
- Two instances in same space (may be correct, but requires spatial verification)

Decision: User must explicitly re-link the duplicate to clarify intent.
```

### Why Definition IDs ARE Copied:
```
Definition IDs represent "what type of thing is this":
- symbol_definition_id: "This is a fire exit symbol"
- component_definition_id: "This is a door component"

A duplicate instance is another occurrence of the same type, so copying
the definition reference is correct and expected behavior.
```

### Offset Algorithm:
```typescript
// Calculate 2% of page width, clamped between 16-48pt
const offset = Math.min(48, Math.max(16, Math.floor(pageWidthPts * 0.02)));

// Apply offset
let nx1 = entity.bounding_box.x1 + offset;
let ny1 = entity.bounding_box.y1 + offset;

// Clamp if exceeds bounds
if (nx2 > pageWidthPts) {
  const delta = nx2 - pageWidthPts;
  nx1 = Math.max(0, nx1 - delta);
  nx2 = nx1 + width;
}
```

**Rationale:**
- Visible offset makes it clear a duplicate was created
- Percentage-based scales appropriately for different page sizes
- Clamping ensures duplicate stays within page boundaries

---

## User-Facing Summary

### New Capabilities:

1. **Component Stamping**
   - Stamp component instances just like symbols
   - Keyboard shortcuts 1-9 for quick stamping
   - Visual feedback with blue highlight

2. **Instance Duplication**
   - Duplicate symbol instances with definition & meaning preserved
   - Duplicate component instances with definition & meaning preserved
   - Red border indicates when re-linking is needed

3. **Complete Duplication Support**
   - All 9 entity types now support duplication
   - Smart offset prevents overlaps
   - Validation state recomputed automatically

### Expected Behavior:

✅ **Will Duplicate:** Definition references, text content, technical specs
❌ **Won't Duplicate:** Links, parent containers, system IDs
🔄 **Recomputed:** Validation status, completeness flags
📍 **Modified:** Bounding box (offset), spatial position

---

## Next Steps / Future Enhancements

### Potential Improvements:
1. **Link Duplication Option** - Dialog asking "Copy scope links too?" with checkbox
2. **Bulk Duplication** - Select multiple entities → Duplicate all
3. **Duplicate Across Sheets** - Duplicate to different sheet with sheet selector
4. **Smart Offset** - Detect nearby entities and avoid all overlaps (not just original)
5. **Undo Support** - Ctrl+Z to undo duplication

### Known Limitations:
- Maximum 9 definitions in stamp palette (based on keyboard shortcuts)
- Offset may not be visually optimal for very small/large entities
- No visual preview during duplication (appears immediately at offset)
- Links must be manually recreated (intentional, but could add "duplicate with links" option)

---

## Success Metrics

✅ **Build:** Compiles without errors  
✅ **Code Quality:** Clear comments explaining link behavior  
✅ **Documentation:** Comprehensive analysis of duplication edge cases  
✅ **User Experience:** Offset prevents confusion, red border indicates action needed  
✅ **Consistency:** All entity types follow same duplication pattern  

---

**Implementation Status:** ✅ **COMPLETE**  
**Build Status:** ✅ **PASSING**  
**Ready for Testing:** ✅ **YES**

