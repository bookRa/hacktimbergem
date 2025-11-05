# Cascade Link Deletion Implementation

## Problem

When entities or concepts (scopes/spaces) were deleted, their associated relationship links in `links.json` were NOT deleted. This caused:

1. **Dangling References**: Links pointing to non-existent entities remained in the database
2. **Visual Bugs**: Symbol instances showed green (linked) status even after their linked scope was deleted
3. **Data Integrity Issues**: The knowledge graph contained invalid edges

### Example Bug

- A symbol instance (ID: `52b14ee4449c49638fc8a79988a32c0f`) was linked to a scope via `JUSTIFIED_BY`
- The scope (ID: `0d8a8b858c4b4d21b9a3a3a22951caa9`) was deleted
- The link remained in `links.json`, causing the symbol to incorrectly appear as "linked"

## Solution

Implemented cascade deletion in two places:

### 1. Entity Deletion (`backend/app/entities_store.py`)

**Before:**
```python
# Guard: prevent deleting any entity referenced by links (graph edges)
try:
    from .links_store import load_links
    links = load_links(project_id)
    for l in links:
        if getattr(l, "source_id", None) == entity_id or getattr(l, "target_id", None) == entity_id:
            raise ValueError("Cannot delete entity referenced by links")
except Exception:
    pass
```

**After:**
```python
# CASCADE: Delete any links referencing this entity
try:
    from .links_store import load_links, save_links
    links = load_links(project_id)
    # Filter out links that reference the entity being deleted
    filtered_links = [
        l for l in links 
        if getattr(l, "source_id", None) != entity_id and getattr(l, "target_id", None) != entity_id
    ]
    if len(filtered_links) < len(links):
        # Some links were removed, save the updated list
        save_links(project_id, filtered_links)
except Exception as e:
    # If links store fails, log but continue with entity deletion
    print(f"Warning: Failed to cascade delete links for entity {entity_id}: {e}")
```

### 2. Concept Deletion (`backend/app/concepts_store.py`)

**Before:**
```python
def delete_concept(project_id: str, concept_id: str) -> bool:
    from .links_store import load_links
    links = load_links(project_id)
    for l in links:
        if getattr(l, "source_id", None) == concept_id or getattr(l, "target_id", None) == concept_id:
            raise ValueError("Cannot delete concept referenced by links")
    # ... rest of deletion logic
```

**After:**
```python
def delete_concept(project_id: str, concept_id: str) -> bool:
    from .links_store import load_links, save_links
    links = load_links(project_id)
    # Filter out links that reference the concept being deleted
    filtered_links = [
        l for l in links 
        if getattr(l, "source_id", None) != concept_id and getattr(l, "target_id", None) != concept_id
    ]
    if len(filtered_links) < len(links):
        # Some links were removed, save the updated list
        save_links(project_id, filtered_links)
    # ... rest of deletion logic
```

## Cleanup Script

Created `backend/cleanup_dangling_links.py` to remove existing dangling links from projects.

### Features

- Scans all entities and concepts to build a set of valid IDs
- Identifies links with missing source or target IDs
- Reports detailed information about each dangling link
- Removes dangling links and saves cleaned `links.json`

### Usage

```bash
cd backend
python cleanup_dangling_links.py <project_id>
```

### Example Output

```
[Cleanup] Loading entities for project 0148e57bf39b4c2ca2cd0d629168a4a0...
[Cleanup] Found 95 entities
[Cleanup] Loading concepts for project 0148e57bf39b4c2ca2cd0d629168a4a0...
[Cleanup] Found 0 concepts
[Cleanup] Total valid IDs: 95
[Cleanup] Loading links for project 0148e57bf39b4c2ca2cd0d629168a4a0...
[Cleanup] Found 8 links

============================================================
CLEANUP SUMMARY
============================================================
Total links: 8
Valid links: 7
Dangling links: 1

============================================================
DANGLING LINKS DETAILS
============================================================

1. Link ID: 2dd3c5ec623c4cd19a8115bce0218886
   Type: JUSTIFIED_BY
   Source: 0d8a8b858c4b4d21b9a3a3a22951caa9 (MISSING)
   Target: 52b14ee4449c49638fc8a79988a32c0f (exists)

============================================================
Saving cleaned links.json...
✅ Successfully removed 1 dangling link(s)
============================================================

🧹 Cleanup complete! Removed 1 dangling link(s).
```

## Results

### For the Current Project

✅ Successfully removed 1 dangling link from project `0148e57bf39b4c2ca2cd0d629168a4a0`:
- Link ID: `2dd3c5ec623c4cd19a8115bce0218886`
- Type: `JUSTIFIED_BY`
- Source: `0d8a8b858c4b4d21b9a3a3a22951caa9` (deleted scope - MISSING)
- Target: `52b14ee4449c49638fc8a79988a32c0f` (symbol instance - exists)

### Verification

Before cleanup: `links.json` had 8 links (including the dangling one at lines 23-29)
After cleanup: `links.json` has 7 valid links

The symbol instance should now correctly display as "unlinked" (red) since its scope was deleted.

## Future Improvements

1. **Audit Logging**: Log cascade deletions for traceability
2. **Pre-delete Warnings**: Show user what links will be cascade-deleted before confirming deletion
3. **Soft Deletes**: Consider marking entities as "deleted" rather than removing them immediately
4. **Database Constraints**: When migrating to a proper database, use foreign key constraints with ON DELETE CASCADE

## Testing Checklist

- [x] Delete a scope with JUSTIFIED_BY links → links are cascade-deleted
- [x] Delete a symbol instance with JUSTIFIED_BY links → links are cascade-deleted
- [x] Delete a space with LOCATED_IN links → links are cascade-deleted
- [x] Run cleanup script on project with dangling links → dangling links removed
- [x] Run cleanup script on clean project → no changes made
- [ ] Test entity deletion API endpoint → verify frontend updates correctly
- [ ] Test concept deletion API endpoint → verify frontend updates correctly

## Files Modified

1. `backend/app/entities_store.py` - Added cascade delete for entity links
2. `backend/app/concepts_store.py` - Added cascade delete for concept links
3. `backend/cleanup_dangling_links.py` - **NEW** - Cleanup script for existing dangling links

