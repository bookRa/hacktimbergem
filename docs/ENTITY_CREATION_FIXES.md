# Entity Creation and Jump-to-Sheet Fixes

## Issues Fixed

### 1. **Crash when clicking "Jump to Sheet" on entities without bounding boxes**

**Problem**: When clicking "Jump to Sheet" on Legend, Schedule, or other entities, the app would crash with:
```
TypeError: Cannot read properties of null (reading 'x1')
at OverlayLayer.tsx:291
```

**Root Cause**: Some entity types (`legend_item`, `schedule_item`, `assembly`) don't have bounding boxes. The code was trying to access `entity.bounding_box.x1` without checking if `bounding_box` exists.

**Fix**: 
- Added a filter in `OverlayLayer.tsx` to exclude entities without bounding boxes before rendering (line 281-284)
- Added null check in the duplicate function (line 687-690)
- Used non-null assertions (`!`) after filtering to satisfy TypeScript

**Files Modified**:
- `frontend/src/ui_v2/OverlayLayer.tsx`

---

### 2. **"Add Legend" button (and similar entity creation buttons) not working**

**Problem**: Clicking "+ New Legend" or similar buttons in the Explorer tab didn't activate drawing mode on the canvas.

**Root Cause**: The `useEffect` hook that bridges legacy `creatingEntity` state to UI V2 `drawing` state only handled `symbol_instance` and `component_instance`. It didn't handle regular entity types like `legend`, `drawing`, `schedule`, etc.

**Fix**:
- Extended the bridge `useEffect` to handle all drawable entity types
- Created a mapping from backend entity types to UI V2 drawing types
- Added proper type definitions to avoid TypeScript errors

**Code Changes** (lines 1003-1041 in `OverlayLayer.tsx`):
```typescript
// Map backend entity types to UI V2 drawing types
type DrawableEntityType = 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef';
const legacyToUIV2TypeMap: Partial<Record<string, DrawableEntityType>> = {
  'drawing': 'Drawing',
  'legend': 'Legend',
  'schedule': 'Schedule',
  'note': 'Note',
  'scope': 'Scope',
  'symbol_definition': 'SymbolDef',
  'component_definition': 'CompDef',
  'symbol_instance': 'SymbolInst',
  'component_instance': 'CompInst',
  'assembly_group': 'Schedule',
};

useEffect(() => {
  if (!creatingEntity) {
    if (drawing.active) {
      cancelDrawing();
    }
    return;
  }

  const targetType = legacyToUIV2TypeMap[creatingEntity.type];
  if (!targetType) {
    console.warn('[OverlayLayer] Unknown entity type for drawing:', creatingEntity.type);
    return;
  }
  
  if (!drawing.active || drawing.entityType !== targetType || (definitionId && drawing.active)) {
    startDrawing(targetType);
  }
}, [creatingEntity, drawing.active, drawing.entityType, startDrawing, cancelDrawing, definitionId]);
```

**Files Modified**:
- `frontend/src/ui_v2/OverlayLayer.tsx`

---

### 3. **TypeScript type errors for entity mappings**

**Problem**: TypeScript complained that entity type mappings were missing entries for `legend_item`, `schedule_item`, `assembly_group`, and `assembly`.

**Root Cause**: These entity types don't have bounding boxes and therefore can't be rendered on canvas. Using `Record` type required all entity types to be present.

**Fix**:
- Changed `Record<Entity['entity_type'], T>` to `Partial<Record<Entity['entity_type'], T>>` for mappings
- Added fallback values (`?? 'Drawing'`) when accessing mappings to handle undefined cases
- Updated both `OverlayLayer.tsx` and `EntityEditor.tsx`

**Files Modified**:
- `frontend/src/ui_v2/OverlayLayer.tsx` (lines 55, 102)
- `frontend/src/components/EntityEditor.tsx` (line 318)

---

## Testing

- ✅ Build passes: `npm run build`
- ✅ Tests pass: `npm test` (10/10 tests passing)
- ✅ TypeScript compilation successful

## User Flow

### Creating a Legend:
1. Navigate to Explorer tab
2. Click "Legends" subtab
3. Click "+ New Legend" button
4. Drawing mode activates on canvas (cursor changes to crosshair)
5. Drag to draw bounding box
6. Form appears for legend details
7. Save to create the legend

### Jump to Sheet:
1. Select any entity with a bounding box in the Explorer or Entities tab
2. Click "Jump to Sheet" button
3. Canvas navigates to the correct page and scrolls to the entity
4. Entity is highlighted on the canvas

**Note**: Entities without bounding boxes (legend_item, schedule_item, assembly) cannot be displayed on canvas and will not appear in the overlay layer.

---

## Architecture Notes

### Entity Creation State Management:

1. **Legacy State** (`useProjectStore`):
   - `creatingEntity` - Tracks which entity type is being created
   - `startEntityCreation(type)` - Initiates creation
   - `cancelEntityCreation()` - Cancels creation

2. **UI V2 State** (`useUIV2Store`):
   - `drawing.active` - Whether drawing mode is active
   - `drawing.entityType` - Type of entity being drawn
   - `startDrawing(entityType)` - Activates drawing UI
   - `cancelDrawing()` - Deactivates drawing UI

3. **Bridge**: 
   - `useEffect` in `OverlayLayer.tsx` synchronizes these two states
   - When `creatingEntity` changes, it automatically calls `startDrawing()`
   - When `creatingEntity` is cleared, it calls `cancelDrawing()`

### Entity Types Without Bounding Boxes:

The following entity types are **not rendered on canvas**:
- `legend_item` - Items within a legend (metadata only)
- `schedule_item` - Rows within a schedule (metadata only)
- `assembly` - Parts within an assembly group (metadata only)

These entities exist in the database and can be edited in the Entities Tab, but they don't have spatial coordinates and therefore don't appear as overlays on the PDF canvas.

