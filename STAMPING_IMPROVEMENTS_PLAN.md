# Instance Stamping Improvements - Implementation Plan

## Overview

4 improvements to instance stamping feature:
1. Add "Start Stamping" button to Entity Editor (definition view)
2. Change from drag-to-draw to single-click placement with predefined size
3. Fix Escape key not canceling stamping
4. Fix switching stamp types not updating

## Current State Analysis

### How Stamping Currently Works

1. **Initiation**: User clicks stamp button in Explorer OR presses 1-9 key
2. **State**: Sets `creatingEntity = { type: 'symbol_instance'/'component_instance', meta: { definitionId } }`
3. **UI V2 Bridge**: useEffect in OverlayLayer syncs `creatingEntity` → `drawing.active = true`
4. **Drawing**: User drags to create bbox
5. **Completion**: Context menu → Form → Save
6. **Stamping Mode**: `finalizeEntityCreation` keeps `creatingEntity` active for next stamp

### Problems Identified

**Problem 1**: No stamp button in Entity Editor
- Can only start from Explorer tab
- User must switch tabs to stamp after viewing definition

**Problem 2**: Drag-to-draw is slow
- Requires precise dragging
- Context menu + form adds friction
- Not optimized for quick placement

**Problem 3**: Escape doesn't cancel
```typescript
// OverlayLayer.tsx line 939
if (event.key === 'Escape' && drawing.active) {
  cancelDrawing(); // Only cancels drawing, not creatingEntity
}
```
- Only checks `drawing.active`
- Doesn't call `cancelEntityCreation()` to clear legacy `creatingEntity`
- Bridge effect runs but stamping persists

**Problem 4**: Switching stamps doesn't update
- Clicking new stamp button updates `creatingEntity.meta.definitionId`
- But bridge effect doesn't re-run (dependency issue)
- Next stamp uses old definitionId

## Solution Design

### 1. Add Start Stamping to Entity Editor

**File**: `frontend/src/components/EntityEditor.tsx`

**Location**: After "Instances" section for definitions

**Implementation**:
```typescript
{/* Start Stamping Button */}
{(entity.entity_type === 'symbol_definition' || entity.entity_type === 'component_definition') && (
  <div style={{ marginTop: 14 }}>
    <button
      onClick={() => {
        const kind = entity.entity_type === 'symbol_definition' ? 'symbol' : 'component';
        startInstanceStamp(kind, entity.id);
        addToast({ 
          kind: 'info', 
          message: 'Click on canvas to place instances. Press Esc to cancel.' 
        });
      }}
      style={styles.button(false)}
    >
      🖌️ Start Stamping Instances
    </button>
  </div>
)}
```

**Required imports**:
- `startInstanceStamp` from store
- Toast notification

### 2. Single-Click Stamping with Predefined Size

**Changes Required**:

#### A. Get Definition BBox Size

**File**: `frontend/src/ui_v2/OverlayLayer.tsx`

```typescript
// At component level, get definition entity
const definitionEntity = useMemo(() => {
  if (!creatingEntity) return null;
  const defId = creatingEntity.meta?.definitionId;
  if (!defId) return null;
  return entities.find(e => e.id === defId);
}, [creatingEntity, entities]);

// Calculate stamp size in canvas pixels
const stampSize = useMemo(() => {
  if (!definitionEntity || !definitionEntity.bounding_box) return null;
  const bbox = definitionEntity.bounding_box;
  const width = bbox.x2 - bbox.x1;  // PDF points
  const height = bbox.y2 - bbox.y1; // PDF points
  
  // Convert to canvas pixels
  const meta = pagesMeta?.[pageIndex];
  if (!meta) return null;
  
  const renderMeta = {
    pageWidthPts: meta.pageWidthPts,
    pageHeightPts: meta.pageHeightPts,
    rasterWidthPx: meta.nativeWidth,
    rasterHeightPx: meta.nativeHeight,
    rotation: 0 as 0,
  };
  
  const [cx1, cy1] = pdfToCanvas([bbox.x1, bbox.y1], renderMeta);
  const [cx2, cy2] = pdfToCanvas([bbox.x2, bbox.y2], renderMeta);
  
  return {
    widthPx: (cx2 - cx1) * scale,
    heightPx: (cy2 - cy1) * scale,
    widthPts: width,
    heightPts: height
  };
}, [definitionEntity, pageIndex, pagesMeta, scale]);
```

#### B. Custom Stamp Cursor

**File**: `frontend/src/ui_v2/OverlayLayer.tsx`

```typescript
// In the overlay div style
const overlayStyle = useMemo(() => {
  const isStamping = creatingEntity && 
                     (creatingEntity.type === 'symbol_instance' || 
                      creatingEntity.type === 'component_instance');
  
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'auto' as const,
    cursor: isStamping ? 'crosshair' : drawing.active ? 'crosshair' : 'default',
    // Or use custom cursor icon:
    // cursor: isStamping ? 'url("/stamp-cursor.svg") 12 12, crosshair' : ...
  };
}, [creatingEntity, drawing.active]);
```

#### C. Single-Click Placement Handler

**File**: `frontend/src/ui_v2/OverlayLayer.tsx`

Replace drag logic with click logic:

```typescript
const handleStampClick = useCallback(async (event: React.PointerEvent) => {
  const isStampMode = creatingEntity && 
                     (creatingEntity.type === 'symbol_instance' || 
                      creatingEntity.type === 'component_instance') &&
                     stampSize;
  
  if (!isStampMode || !stampSize || !projectId) return;
  
  const overlayEl = overlayRef.current;
  const rect = overlayEl?.getBoundingClientRect();
  if (!overlayEl || !rect) return;
  
  // Get click position
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  // Center the stamp on click position
  const x1 = clickX - stampSize.widthPx / 2;
  const y1 = clickY - stampSize.heightPx / 2;
  const x2 = x1 + stampSize.widthPx;
  const y2 = y1 + stampSize.heightPx;
  
  // Convert to PDF coordinates and create entity
  await finalizeEntityCreation(x1 / scale, y1 / scale, x2 / scale, y2 / scale);
  
  // finalizeEntityCreation keeps creatingEntity active, so user can continue stamping
}, [creatingEntity, stampSize, projectId, scale, finalizeEntityCreation]);
```

#### D. Update Pointer Handlers

```typescript
const handlePointerDown = useCallback((event: React.PointerEvent) => {
  // Check if in stamp mode first
  const isStampMode = creatingEntity && 
                     (creatingEntity.type === 'symbol_instance' || 
                      creatingEntity.type === 'component_instance');
  
  if (isStampMode) {
    // Single-click stamping
    event.preventDefault();
    event.stopPropagation();
    handleStampClick(event);
    return;
  }
  
  // ... existing drag-to-draw logic for other entity types
}, [creatingEntity, handleStampClick, /* other deps */]);
```

### 3. Fix Escape Not Canceling Stamping

**File**: `frontend/src/ui_v2/OverlayLayer.tsx`

**Current code** (lines 934-946):
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && editSessionRef.current) {
      event.preventDefault();
      cancelEditSession();
    }
    if (event.key === 'Escape' && drawing.active) {
      event.preventDefault();
      cancelDrawing();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [cancelEditSession, cancelDrawing, drawing.active]);
```

**Fix**:
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && editSessionRef.current) {
      event.preventDefault();
      cancelEditSession();
      return; // Early return to prevent multiple handlers
    }
    
    // Check for stamping mode first (legacy creatingEntity)
    const isStamping = creatingEntity && 
                      (creatingEntity.type === 'symbol_instance' || 
                       creatingEntity.type === 'component_instance');
    
    if (event.key === 'Escape' && isStamping) {
      event.preventDefault();
      cancelEntityCreation(); // Cancel legacy state
      cancelDrawing();        // Cancel UI V2 state
      return;
    }
    
    if (event.key === 'Escape' && drawing.active) {
      event.preventDefault();
      cancelDrawing();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [cancelEditSession, cancelDrawing, cancelEntityCreation, drawing.active, creatingEntity]);
```

### 4. Fix Switching Stamp Types

**File**: `frontend/src/ui_v2/OverlayLayer.tsx`

**Current bridge effect** (lines 961-980):
```typescript
useEffect(() => {
  if (!creatingEntity) {
    if (drawing.active && 
        (drawing.entityType === 'SymbolInst' || drawing.entityType === 'CompInst')) {
      cancelDrawing();
    }
    return;
  }

  if (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance') {
    const targetType = creatingEntity.type === 'symbol_instance' ? 'SymbolInst' : 'CompInst';
    if (!drawing.active || drawing.entityType !== targetType) {
      startDrawing(targetType);
    }
  }
}, [creatingEntity, drawing.active, drawing.entityType, startDrawing, cancelDrawing]);
```

**Problem**: Dependency array doesn't include `creatingEntity.meta.definitionId`

**Fix**: Add definitionId to dependencies
```typescript
const definitionId = creatingEntity?.meta?.definitionId;

useEffect(() => {
  if (!creatingEntity) {
    if (drawing.active && 
        (drawing.entityType === 'SymbolInst' || drawing.entityType === 'CompInst')) {
      cancelDrawing();
    }
    return;
  }

  if (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance') {
    const targetType = creatingEntity.type === 'symbol_instance' ? 'SymbolInst' : 'CompInst';
    if (!drawing.active || drawing.entityType !== targetType) {
      startDrawing(targetType);
    }
  }
}, [creatingEntity, drawing.active, drawing.entityType, startDrawing, cancelDrawing, definitionId]);
//                                                                                      ^^^^^^^^^^^^ Added
```

**Alternative**: Force re-sync in `startInstanceStamp`

**File**: `frontend/src/state/store.ts`

```typescript
startInstanceStamp: (kind, definitionId, opts) => {
  const state = get();
  
  // If already stamping with different definition, update it
  if (state.creatingEntity && 
      (state.creatingEntity.type === 'symbol_instance' || 
       state.creatingEntity.type === 'component_instance')) {
    // Just update the definitionId
    set({
      creatingEntity: {
        ...state.creatingEntity,
        type: kind === 'symbol' ? 'symbol_instance' : 'component_instance',
        meta: { definitionId, ...opts }
      }
    });
    return;
  }
  
  // Otherwise, start fresh stamping mode
  const nextLayers = { ...state.layers } as any;
  if (!nextLayers.drawings) nextLayers.drawings = true;
  if (kind === 'symbol' && !nextLayers.symbols) nextLayers.symbols = true;
  if (kind === 'component' && !nextLayers.components) nextLayers.components = true;
  
  set({ 
    layers: nextLayers, 
    creatingEntity: { 
      type: kind === 'symbol' ? 'symbol_instance' : 'component_instance', 
      startX: -1, 
      startY: -1, 
      meta: { definitionId, ...opts } 
    } 
  } as any);
},
```

## Implementation Checklist

### Phase 1: Entity Editor Button
- [ ] Add `startInstanceStamp` import to EntityEditor
- [ ] Add "Start Stamping" button after Instances section
- [ ] Test: Click button starts stamping mode
- [ ] Test: Toast notification appears

### Phase 2: Single-Click Stamping
- [ ] Add `definitionEntity` useMemo to OverlayLayer
- [ ] Add `stampSize` useMemo calculation
- [ ] Add `handleStampClick` function
- [ ] Update `handlePointerDown` to detect stamp mode
- [ ] Add custom cursor style
- [ ] Test: Single click places instance
- [ ] Test: Instance has correct size
- [ ] Test: Can continue clicking to place more
- [ ] Test: No context menu appears
- [ ] Test: No form appears

### Phase 3: Fix Escape Key
- [ ] Update escape handler in OverlayLayer
- [ ] Add `cancelEntityCreation` to dependencies
- [ ] Add `creatingEntity` check before `drawing.active` check
- [ ] Test: Escape cancels stamping
- [ ] Test: Console shows correct debug message
- [ ] Test: No residual state after cancel

### Phase 4: Fix Stamp Switching
- [ ] Extract `definitionId` from creatingEntity.meta
- [ ] Add `definitionId` to bridge effect dependencies
- [ ] Or update `startInstanceStamp` to force re-sync
- [ ] Test: Click stamp button A, then B
- [ ] Test: Next stamp uses definition B
- [ ] Test: No need to cancel/restart

### Phase 5: Integration Testing
- [ ] Test all 4 improvements together
- [ ] Test with symbol definitions
- [ ] Test with component definitions
- [ ] Test cross-sheet stamping
- [ ] Test with multiple definitions
- [ ] Test keyboard shortcuts still work
- [ ] Test stamp palette in Explorer still works
- [ ] No regressions in existing features

## Files to Modify

1. `frontend/src/components/EntityEditor.tsx` - Add stamp button
2. `frontend/src/ui_v2/OverlayLayer.tsx` - Main implementation
   - Add definitionEntity memo
   - Add stampSize memo
   - Add handleStampClick
   - Update handlePointerDown
   - Fix escape handler
   - Fix bridge effect
3. `frontend/src/state/store.ts` - Optional: improve startInstanceStamp
4. Custom cursor asset (optional) - Create stamp.svg icon

## Risk Assessment

**Low Risk**:
- Adding button to Entity Editor (additive)
- Fixing escape handler (clear bug fix)

**Medium Risk**:
- Single-click stamping (changes interaction model)
- Could break drag-to-draw for other entity types
- Need careful pointer event handling

**High Risk**:
- None - all changes are targeted and reversible

## Rollback Plan

If issues arise:
1. Revert OverlayLayer changes
2. Keep Entity Editor button (harmless)
3. Keep escape fix (improves UX)
4. Investigate single-click implementation separately

## Success Criteria

✅ User can start stamping from Entity Editor  
✅ Single click places instance with definition size  
✅ No context menu or form after placement  
✅ User can continue clicking to place more instances  
✅ Escape key cancels stamping immediately  
✅ Switching stamp types updates the next stamp correctly  
✅ No regressions in existing entity creation flows  
✅ Build passes with no errors  
✅ No console errors during stamping  

---

**Status**: Ready for Implementation  
**Estimated Effort**: 2-3 hours  
**Priority**: High (UX improvement + bug fixes)

