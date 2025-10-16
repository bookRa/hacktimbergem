# Entity Duplication - Complete Analysis

## Fields That Cannot Be Perfectly Duplicated

### 1. **System-Generated Fields (NEVER duplicated)**
- `id` - Always generates new UUID
- `created_at` - System timestamp at creation
- `updated_at` - System timestamp, updated on changes

**Handling:** Always generate new values

---

### 2. **Spatial Constraints (MODIFIED during duplication)**
- `bounding_box` - Must be offset to avoid exact overlap
  - Current offset: 2% of page width (16-48pt range)
  - Falls back if new position would exceed page bounds
  
**Handling:** Apply offset, clamp to page boundaries

---

### 3. **Relationship Links (CANNOT duplicate)**
- Links in `links` table (JUSTIFIED_BY, LOCATED_IN, DEPICTS)
  - Scope → Instance evidence links
  - Instance → Space location links
  - Drawing → Space depiction links

**Reasoning:**
- Links represent unique relationships in context
- Duplicating would create ambiguous/incorrect relationships
- User should explicitly re-link the duplicate if needed

**Handling:** Leave blank - no links copied

**User Impact:** 
- Duplicated instances will show as `incomplete` (red border) if they need scope links
- User must manually link duplicate to appropriate scopes/spaces

---

### 4. **Foreign Key Relationships (COPY with caveats)**

#### 4a. **Symbol/Component Definitions (SHOULD copy)**
- `symbol_definition_id` (for `symbol_instance`)
- `component_definition_id` (for `component_instance`)

**Handling:** COPY - instances should reference same definition

#### 4b. **Parent Container References (CANNOT copy reliably)**
- `defined_in_id` (for component_definition nested in schedule)

**Reasoning:**
- If parent schedule is on different sheet, duplicate might not be in same context
- If duplicate is offset, it may no longer be spatially contained

**Handling:** Leave blank (set to `null`)

**User Impact:**
- Component definitions lose schedule association
- User must manually re-associate if needed

---

### 5. **Derived/Computed Fields (RECOMPUTE)**
- `status` ('complete' | 'incomplete')
- `validation.missing` object

**Handling:** Call `deriveEntityFlags()` to recompute based on new entity state

---

### 6. **Instance-Specific Contextual Data (CASE BY CASE)**

#### 6a. **OCR/User-Entered Text (SHOULD copy)**
- `recognized_text` (symbol_instance, component_instance)
- `text` (note)
- `title` (drawing, legend, schedule)
- `description` (drawing, scope, definitions)
- `name` (scope, definitions)

**Handling:** COPY - these are properties of the entity itself

#### 6b. **Specifications and Technical Data (SHOULD copy)**
- `specifications` (component_definition) - JSON object with technical specs
- `visual_pattern_description` (symbol_definition) - describes visual appearance
- `scope` (definitions) - 'sheet' | 'project' | 'building'

**Handling:** COPY - these are intrinsic to the entity type

---

## Current Implementation Gaps

### Not Yet Supported (line 641):
```typescript
const SUPPORTED = ['drawing', 'legend', 'schedule', 'scope', 'note', 
                   'symbol_definition', 'component_definition'];
// MISSING: 'symbol_instance', 'component_instance'
```

### Why Instances Weren't Included Initially:
Likely due to complexity around:
1. Should definition_id be copied? (YES - duplicating instance of same symbol)
2. Should recognized_text be copied? (YES - semantic meaning is part of the instance)
3. Should scope links be copied? (NO - relationships are contextual)

---

## Proposed Implementation for Instance Duplication

### Symbol Instance:
```typescript
if (entity.entity_type === 'symbol_instance') {
  payload.symbol_definition_id = (entity as any).symbol_definition_id;
  payload.recognized_text = (entity as any).recognized_text ?? '';
  // NOTE: Links (scopes, spaces) are NOT copied
}
```

**Result:**
- Duplicate has same definition and semantic meaning
- Shows as incomplete (red) if original was linked to scope
- User must re-link to scope if needed

### Component Instance:
```typescript
if (entity.entity_type === 'component_instance') {
  payload.component_definition_id = (entity as any).component_definition_id;
  payload.recognized_text = (entity as any).recognized_text ?? '';
  // NOTE: Links (scopes, spaces) are NOT copied
}
```

**Result:** Same as symbol instance

---

## Summary Table

| Field Type | Action | Rationale |
|------------|--------|-----------|
| `id`, `created_at`, `updated_at` | Generate new | System managed |
| `bounding_box` | Offset & clamp | Avoid overlap |
| Links (JUSTIFIED_BY, etc.) | Leave blank | Context-specific relationships |
| `symbol_definition_id` | **COPY** | Instance references same definition |
| `component_definition_id` | **COPY** | Instance references same definition |
| `defined_in_id` | Leave blank | May not be valid in new position |
| `recognized_text`, `text` | **COPY** | Intrinsic property of entity |
| `title`, `description`, `name` | **COPY** | Intrinsic property of entity |
| `specifications`, `visual_pattern_description` | **COPY** | Intrinsic technical data |
| `scope` (definitions) | **COPY** | Intrinsic categorization |
| `status`, `validation` | **RECOMPUTE** | Derived from current state |

---

## User Workflow After Duplication

### For Instances with Scope Links:
1. Right-click instance → Duplicate
2. Duplicate appears offset (red border if incomplete)
3. Right-click duplicate → Link → Select scope
4. Duplicate turns normal color (complete)

### For Component Definitions in Schedules:
1. Right-click component definition → Duplicate
2. Duplicate appears offset
3. `defined_in_id` is null (no longer in schedule)
4. If needed, user drags duplicate into a schedule to re-associate

### For All Other Entity Types:
1. Right-click → Duplicate
2. Duplicate appears offset with all properties copied
3. Ready to use immediately

---

## Edge Cases to Handle

### 1. Multiple Duplications
If user duplicates the duplicate, offset should stack:
- Original at (100, 100)
- First duplicate at (148, 148)
- Second duplicate at (196, 196)

**Current Implementation:** YES - each duplicate gets offset from its source

### 2. Near Page Boundary
If offset would exceed page bounds, clamp:
```typescript
if (nx2 > pageWidthPts) {
  const delta = nx2 - pageWidthPts;
  nx1 = Math.max(0, nx1 - delta);
  nx2 = nx1 + width;
}
```

**Current Implementation:** YES - clamping already exists

### 3. Duplicate While Linking Mode Active
Duplicating during linking should not add duplicate to pending links.

**Current Implementation:** Needs verification

---

## Testing Checklist

- [ ] Duplicate drawing → copies title, description, bbox offset
- [ ] Duplicate legend → copies title, bbox offset
- [ ] Duplicate schedule → copies title, bbox offset
- [ ] Duplicate scope → copies name, description, bbox offset (no links)
- [ ] Duplicate note → copies text, bbox offset
- [ ] Duplicate symbol_definition → copies all fields, bbox offset
- [ ] Duplicate component_definition → copies all fields, bbox offset, `defined_in_id` is null
- [ ] **Duplicate symbol_instance → copies definition_id, recognized_text, bbox offset (no scope links)**
- [ ] **Duplicate component_instance → copies definition_id, recognized_text, bbox offset (no scope links)**
- [ ] Duplicated instance shows red border if original had scope links
- [ ] Duplicate near page edge → clamped to page bounds
- [ ] Duplicate of duplicate → offsets stack correctly
- [ ] Context menu shows "Duplicate" for all entity types
- [ ] Duplicate action creates entity and selects it on canvas

