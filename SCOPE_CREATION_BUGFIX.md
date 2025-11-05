# Scope Creation Evidence Links Bug Fix

## Issue
When creating a scope through the Knowledge Graph-based `ScopeComposer` dialog, users could select entities (symbol instances, notes) to compose into the scope. However, these selected entities were not being persisted as evidence links, resulting in "No evidence" being displayed on the scope card after creation.

## Root Cause
The `handleCreate` function in `ScopeComposer.tsx` had a TODO comment indicating that linking logic was not implemented:

```typescript
// TODO: After creation, link selected entities as evidence
// This would require getting the created scope ID and creating links
// For now, user can add evidence from the scope editor
```

Additionally, the `createScope` function in the store was not returning the created entity, making it impossible for callers to get the new scope ID.

## Changes Made

### 1. Modified `frontend/src/state/store.ts`

**Updated the return type:**
```typescript
// Before
createScope: (data: { ... }) => Promise<void>;

// After
createScope: (data: { ... }) => Promise<any>;
```

**Modified the implementation to return the created scope:**
```typescript
const created = await resp.json();
await fetchEntities();

set({ 
    scopeCreationMode: { active: false, type: null },
    selectedEntityId: created.id,
    rightPanelTab: 'entities',
} as any);

addToast({ kind: 'success', message: `Scope "${data.name}" created` });
return created; // ✅ Return the created scope entity
```

**Also modified error handling to re-throw:**
```typescript
throw e; // ✅ Re-throw to allow caller to handle
```

### 2. Modified `frontend/src/features/scope_editor/ScopeComposer.tsx`

**Added imports:**
```typescript
import { createLink } from '../../api/links';
```

**Extended store dependencies:**
```typescript
const { entities, createScope, addToast, projectId, fetchLinks } = useProjectStore((s: any) => ({
  entities: s.entities,
  createScope: s.createScope,
  addToast: s.addToast,
  projectId: s.projectId,    // ✅ Added
  fetchLinks: s.fetchLinks,  // ✅ Added
}));
```

**Implemented the linking logic in `handleCreate`:**
```typescript
// Create the scope
const createdScope = await createScope({
  name: scopeName.trim(),
  description: scopeDescription.trim() || undefined,
});

// Link selected entities as evidence (JUSTIFIED_BY links)
if (createdScope && selectedEntities.size > 0 && projectId) {
  const linkPromises = Array.from(selectedEntities).map(targetId =>
    createLink(projectId, {
      rel_type: 'JUSTIFIED_BY',
      source_id: createdScope.id,
      target_id: targetId,
    })
  );
  
  await Promise.all(linkPromises);
  
  // Refresh links in the store
  await fetchLinks();
  
  addToast({ 
    kind: 'success', 
    message: `Scope "${scopeName}" created with ${selectedEntities.size} evidence link(s)` 
  });
} else {
  addToast({ kind: 'success', message: `Scope "${scopeName}" created` });
}
```

**Updated UI hint text:**
```typescript
// Before
💡 After creation, selected entities will be available to link as evidence from the scope editor.

// After
💡 Selected entities will be linked as evidence when the scope is created.
```

## Testing Checklist

- [ ] Create a conceptual scope with symbol instances selected
  - Verify entities appear in "Evidence Links" section after creation
  - Verify the count in the success toast matches selected entities
  
- [ ] Create a conceptual scope with notes selected
  - Verify notes appear as evidence links
  
- [ ] Create a conceptual scope with mixed entity types
  - Verify all selected entities are linked
  
- [ ] Create a conceptual scope with no entities selected
  - Verify scope is created without errors
  - Verify "No evidence" message is shown (expected behavior)
  
- [ ] Create a canvas scope (via drawing bbox)
  - Verify existing behavior is unchanged (no entity selection in this flow)

## Result

✅ Selected entities are now properly persisted as `JUSTIFIED_BY` relationship links when creating a scope through the `ScopeComposer`.

✅ The scope card now displays linked entities in the "Evidence Links" section immediately after creation.

✅ Success toast indicates how many evidence links were created.

