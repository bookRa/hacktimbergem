# Cleanup Utilities

## cleanup_dangling_links.py

A maintenance script to identify and remove dangling relationship links from a project's `links.json` file.

### What are Dangling Links?

Dangling links are relationship records in `links.json` that reference entities or concepts that no longer exist. This can happen if:
- An entity/concept was deleted before cascade deletion was implemented
- Manual editing of entity/concept files
- System errors during deletion operations

### Symptoms of Dangling Links

- Symbol instances showing as "linked" (green) even though their scope was deleted
- Inconsistent relationship counts in the UI
- Errors when navigating to related entities

### Usage

```bash
cd backend
python cleanup_dangling_links.py <project_id>
```

### Example

```bash
python cleanup_dangling_links.py 0148e57bf39b4c2ca2cd0d629168a4a0
```

### Output

The script will:
1. Load all entities and concepts for the project
2. Load all links
3. Identify links with missing source or target IDs
4. Display detailed information about each dangling link
5. Remove dangling links and save the cleaned `links.json`

### Sample Output

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

### Safe to Run

This script only removes links where:
- The source entity/concept doesn't exist, OR
- The target entity/concept doesn't exist

It does NOT modify entities or concepts, only the `links.json` file.

### When to Run

Run this script if you notice:
- Entities showing incorrect relationship states
- Links appearing in the UI that reference deleted entities
- After recovering from a corrupted project state
- After manual editing of project files

### Prevention

As of the latest update, entity and concept deletion now automatically cascade-deletes associated links, so new dangling links should not occur under normal operation.

