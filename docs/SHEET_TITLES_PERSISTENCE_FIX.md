# Sheet Titles Persistence Bug Fix

## Issue
Sheet titles were not preserved upon page refresh. Users would enter titles for sheets, but after refreshing the browser, all titles would disappear.

## Root Cause
Sheet titles were stored **only in frontend memory** (Zustand store) with initial state `pageTitles: {}`. They were never persisted to the backend, so they were lost on every refresh.

### Where the Bug Was
1. **Frontend**: `pageTitles` lived only in the Zustand store
2. **Backend**: The `manifest.json` had no field for storing sheet/page titles
3. **Result**: All sheet titles disappeared on page reload

## Solution
Added full persistence for sheet titles from frontend to backend manifest.

### Backend Changes

#### 1. Updated `manifest.json` structure (`backend/app/ingest.py`)
Added `page_titles` field to store sheet titles per page index:

```python
def init_manifest(project_id: str):
    m = {
        "project_id": project_id,
        "status": "queued",
        "num_pages": None,
        "stages": {"render": {"done": 0, "total": 0}, "ocr": {"done": 0, "total": 0}},
        "started_at": time.time(),
        "completed_at": None,
        "error": None,
        "page_titles": {},  # Store sheet titles per page index (0-based)
    }
    write_manifest(project_id, m)
    return m
```

#### 2. Added API endpoint (`backend/app/main.py`)
Created a PATCH endpoint to update individual page titles:

```python
@app.patch("/api/projects/{project_id}/page-titles")
async def update_page_title(project_id: str, body: PageTitleUpdate):
    """Update a single page title in the manifest."""
    # Updates manifest.page_titles[page_index] = text
```

The endpoint:
- Takes `{ page_index: int, text: string }`
- Updates the manifest atomically
- Returns success confirmation

### Frontend Changes

#### 1. Load page titles on project init (`frontend/src/state/store.ts`)
When polling the manifest, extract and load page titles:

```typescript
// In pollManifest():
if (data.page_titles) {
    const pageTitles: Record<number, { text: string; fromBlocks?: number[] }> = {};
    for (const [pageIndex, text] of Object.entries(data.page_titles)) {
        if (typeof text === 'string') {
            pageTitles[parseInt(pageIndex, 10)] = { text };
        }
    }
    set({ pageTitles });
}
```

#### 2. Persist page titles on change
Updated `setPageTitle` to persist to backend:

```typescript
setPageTitle: async (pageIndex, raw, fromBlocks) => {
    let text = (raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (text.length > 120) text = text.slice(0, 117).trimEnd() + '...';
    
    // Update local state immediately (optimistic update)
    set(state => ({ 
        pageTitles: { 
            ...state.pageTitles, 
            [pageIndex]: { text, fromBlocks: ... } 
        } 
    }));
    
    // Persist to backend (fire-and-forget)
    const { projectId } = get();
    if (projectId) {
        try {
            await fetch(`/api/projects/${projectId}/page-titles`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page_index: pageIndex, text })
            });
        } catch (e) {
            console.error('[setPageTitle] Failed to persist:', e);
        }
    }
}
```

## How It Works Now

### Setting a Sheet Title
1. User enters title in the Right Panel "Sheet Title" input field
2. On blur or Enter key, `applyTitle()` calls `setPageTitle(pageIndex, text)`
3. Local state updates immediately (optimistic UI)
4. Backend API call persists the title to `manifest.json`
5. Title is now stored in: `projects/{projectId}/manifest.json` → `page_titles.{pageIndex}`

### Loading Sheet Titles
1. User loads project via `initProjectById(projectId)`
2. Frontend fetches `/api/projects/{projectId}/status` (manifest)
3. If `manifest.page_titles` exists, load all titles into Zustand store
4. Titles appear immediately in the UI

### On Refresh
1. Browser reloads, Zustand store resets to empty `pageTitles: {}`
2. App detects project ID from URL hash (`#p=projectId`)
3. Calls `initProjectById()` → `pollManifest()`
4. Loads page titles from manifest
5. ✅ All sheet titles are restored!

## Backwards Compatibility
- Old projects without `page_titles` in manifest: No error, just empty titles
- API endpoint checks `if "page_titles" not in m: m["page_titles"] = {}`
- Existing projects will get the field automatically on first title save

## Files Modified
1. `backend/app/ingest.py` - Added `page_titles: {}` to manifest init
2. `backend/app/main.py` - Added PATCH `/api/projects/{project_id}/page-titles` endpoint
3. `frontend/src/state/store.ts` - Load titles from manifest + persist on change

## Testing
1. Open an existing project
2. Add sheet titles to several pages
3. Refresh the browser (or close and reopen)
4. ✅ Verify all sheet titles are preserved
5. Check `projects/{projectId}/manifest.json` to see persisted titles

## Future Enhancements
- Add debouncing to avoid excessive API calls when user is typing
- Add error toast if backend persistence fails
- Batch update multiple page titles in one API call

