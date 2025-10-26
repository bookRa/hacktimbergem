# Drawing Mode Bug Fix - Symbol Definition Creation

## Issue
When clicking "New" to create a new symbol definition from a symbol instance context menu, the app failed to enter drawing mode. Instead, `cancelDrawing` was called immediately, preventing the user from drawing the definition's bounding box.

## Root Cause
The bug was in the `useEffect` hook at line 1037 in `OverlayLayer.tsx` that bridges legacy entity creation state (`creatingEntity`) with the UI V2 drawing state.

### Flow Analysis
1. User clicks "New" button on symbol instance form
2. `handleRequestDefinition` sets flags (`__isNewDefinitionCreation`, `__pendingInstanceForm`)
3. It calls `closeForm()` then `startDrawing('SymbolDef')`
4. The `startDrawing` call sets `drawing.active = true` and `drawing.entityType = 'SymbolDef'`
5. **Bug:** The useEffect runs and sees:
   - `!creatingEntity` (null, because we're using UI V2 state, not legacy state)
   - `drawing.active` is true
6. **Bug:** It immediately calls `cancelDrawing()` to "sync" the states
7. This triggers the restoration logic in `cancelDrawing`, which restores the instance form instead of staying in drawing mode

### Console Output (Before Fix)
```
[DEBUG] cancelDrawing called {isCompletingDefinitionDrawing: undefined, pendingInstanceForm: true, isNewDefinitionCreation: true}
[DEBUG] cancelDrawing - RESTORING instance form
[DEBUG] cancelDrawing called {isCompletingDefinitionDrawing: undefined, pendingInstanceForm: false, isNewDefinitionCreation: undefined}
[DEBUG] cancelDrawing - regular cancel
```

The first call incorrectly restored the instance form, and the flags were cleared, causing the second call to do a regular cancel.

## Solution
Added a check in the useEffect to detect when we're in a "new definition creation" workflow and skip the premature `cancelDrawing()` call:

```typescript
useEffect(() => {
  if (!creatingEntity) {
    // Don't cancel drawing if we're in new definition creation workflow
    const isNewDefinitionCreation = (window as any).__isNewDefinitionCreation;
    if (isNewDefinitionCreation) {
      console.log('[OverlayLayer] New definition workflow active, keeping drawing mode');
      return;
    }
    
    // If legacy creation mode was cancelled, sync to UI V2
    if (drawing.active) {
      cancelDrawing();
    }
    return;
  }
  // ... rest of effect
}, [creatingEntity, drawing.active, drawing.entityType, startDrawing, cancelDrawing, definitionId]);
```

### Expected Flow (After Fix)
1. User clicks "New" -> sets flags, calls `startDrawing('SymbolDef')`
2. useEffect runs, detects `__isNewDefinitionCreation`, returns early (no premature cancel)
3. Drawing mode stays active ✓
4. User drags on canvas to draw definition bbox
5. On pointer up, `handlePointerUp` clears the flag and calls `cancelDrawing()` (no restoration)
6. Definition form opens with the drawn bbox ✓

## Files Modified
- `/Users/bigo/Projects/hacktimbergem/frontend/src/ui_v2/OverlayLayer.tsx` - Added check to prevent premature `cancelDrawing()` call during definition creation workflow

## Testing
To verify the fix:
1. Create a symbol instance (drag on canvas)
2. In the instance form, click "New" next to the Visual Definition dropdown
3. **Expected:** Drawing mode activates (cursor changes, you can drag to draw)
4. Drag on canvas to define the symbol's visual bbox
5. **Expected:** Symbol definition form opens with name/description fields
6. Fill in the form and save
7. **Expected:** Instance form reopens with the new definition pre-selected
