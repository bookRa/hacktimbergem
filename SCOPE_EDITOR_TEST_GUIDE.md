# Scope Editor - Quick Test Guide

## Prerequisites
1. Have a project loaded with at least one scope entity
2. Have at least one symbol instance created
3. Backend server running on port 8000

## Test Scenarios

### 1. Basic Navigation
1. Open the project in TimberGem
2. Go to right panel → Explorer tab → Scopes section
3. Click "Open Editor" on any scope
4. **Expected**: Browser navigates to `#scope={scopeId}&p={projectId}`
5. **Expected**: Scope editor page loads with scope header

### 2. 1:1 Symbol Linking
1. In scope editor, scroll to "Primary Symbol Instance" section
2. Click "+ Link Symbol Instance" button
3. **Expected**: Modal opens showing all available symbol instances
4. Use search bar to filter symbols
5. Select a symbol instance
6. Click "Link Selected Symbol"
7. **Expected**: Modal closes, symbol appears in the section
8. **Expected**: Related entities panel populates automatically
9. Try linking the same symbol to another scope
10. **Expected**: Warning dialog appears offering to unlink & relink

### 3. Related Entities Auto-Population
1. After linking a symbol, scroll to "Related Entities" section
2. **Expected**: Definition item (Legend Item, Assembly, or Schedule Item) appears
3. **Expected**: Parent container (Legend, Schedule, or Assembly Group) appears
4. **Expected**: Each entity shows type, name/description, and sheet location

### 4. Copy Description Workflow
1. In "Related Entities" section, find definition item
2. Click "📋 Copy Description" button
3. **Expected**: Toast notification "Description copied to scope"
4. Scroll to top header
5. Click on scope description to edit
6. **Expected**: Description field contains formatted text from definition item
   - Legend Item: "Keynote {symbol}: {description}"
   - Assembly: "Install {code} - {name} - {description}"
   - Schedule Item: "Install {mark} - {description}"

### 5. Visual Context Thumbnails
1. Scroll to "Visual Context" section (right column)
2. **Expected**: Grid of thumbnail images appears
3. **Expected**: Each thumbnail shows:
   - Cropped screenshot of entity bbox
   - Label (e.g., "Primary Symbol", "Definition Item")
   - Sheet number
4. **Expected**: Thumbnails render without errors
5. Click on a thumbnail
6. **Expected**: Image maintains aspect ratio, no distortion

### 6. Inline Editing
1. In scope header, click on scope name
2. **Expected**: Name becomes editable input field
3. Type new name and press Enter
4. **Expected**: Name updates, input closes
5. Click on description
6. **Expected**: Description becomes editable textarea
7. Type new description and click outside
8. **Expected**: Description updates automatically

### 7. Evidence Links
1. Scroll to "Evidence Links" section
2. **Expected**: List of all JUSTIFIED_BY links (excluding primary symbol)
3. Click "×" button on an evidence link
4. Confirm deletion
5. **Expected**: Link removed from list
6. **Expected**: Visual context viewer updates if evidence had bbox

### 8. Navigation Back
1. Click "← Back to Project" at top
2. **Expected**: Returns to main project view at `#p={projectId}`
3. **Expected**: Canvas and panels visible
4. **Expected**: Scope still exists in scope list

### 9. Edge Cases

#### Scope with No Symbol
1. Navigate to scope editor for a scope without linked symbol
2. **Expected**: "Primary Symbol Instance" shows empty state
3. **Expected**: "Related Entities" shows message "Link a symbol instance to see related entities"
4. **Expected**: "Visual Context" shows empty state or only scope bbox

#### Symbol with No Definition Item
1. Link a symbol that has no definition_item_id
2. **Expected**: "Related Entities" shows "This symbol instance has no definition item linked"
3. **Expected**: No "Copy Description" button available

#### Conceptual Scope (No Canvas Location)
1. Navigate to scope editor for conceptual scope (no bounding_box)
2. **Expected**: Header shows "💭 Conceptual" badge
3. **Expected**: No "Jump to Canvas" button
4. **Expected**: Visual Context doesn't show scope bbox

#### 1:1 Validation
1. Link symbol A to scope 1
2. Navigate to scope 2
3. Try to link symbol A to scope 2
4. **Expected**: Confirmation dialog: "This symbol is already linked to scope 'scope 1'. Unlink and relink to current scope?"
5. Click Cancel
6. **Expected**: Link operation cancelled, symbol remains linked to scope 1
7. Try again and click OK
8. **Expected**: Symbol unlinked from scope 1, linked to scope 2

### 10. Delete Scope
1. At bottom of scope editor, click "🗑️ Delete Scope"
2. Confirm deletion
3. **Expected**: Toast notification "Scope deleted"
4. **Expected**: Navigates back to project view
5. **Expected**: Scope removed from scope list

## Performance Checks

### Screenshot Loading
1. Navigate to scope with multiple related entities
2. **Expected**: Thumbnails load progressively (loading state → image)
3. **Expected**: No browser console errors
4. Navigate away and back to same scope
5. **Expected**: Thumbnails load instantly (from cache)

### Memory Management
1. Open scope editor
2. Open browser DevTools → Memory tab
3. Take heap snapshot
4. Navigate back to project
5. Take another heap snapshot
6. **Expected**: Blob URLs revoked (no memory leak)

## Browser Console Checks

Throughout all tests, monitor browser console for:
- ❌ No TypeScript errors
- ❌ No React warnings
- ❌ No 404 errors for missing resources
- ✅ Info logs for scope editor actions (optional)

## Known Limitations (Not Bugs)

1. Cannot add new evidence from scope editor (use main canvas linking mode)
2. Thumbnails load sequentially, not in parallel (optimization pending)
3. Inline editing loses focus if external state updates (rare edge case)

## Success Metrics

- ✅ All navigation works without errors
- ✅ 1:1 symbol linking enforced correctly
- ✅ Related entities populate automatically
- ✅ Copy description formats correctly
- ✅ Thumbnails render without distortion
- ✅ Inline editing saves automatically
- ✅ Delete scope removes from list
- ✅ No memory leaks on navigation
- ✅ No console errors

## Quick Fixes for Common Issues

### Thumbnails Not Loading
- Check backend is running (`http://localhost:8000`)
- Verify page images exist (`/api/projects/{pid}/pages/{n}.png`)
- Check browser console for 404 errors

### Symbol Picker Empty
- Verify symbol instances exist in project
- Check entities array in Zustand store
- Ensure symbol_definition_id is valid

### Copy Description Not Working
- Check if definition item has description field
- Verify updateEntityMeta action in store
- Check toast notifications for error messages

### Route Not Changing
- Check URL hash format: `#scope={id}&p={pid}`
- Verify parseRoute function in router.ts
- Check onRouteChange listener in App.tsx

---

**Average Test Time**: 15-20 minutes  
**Critical Paths**: Navigation, 1:1 Linking, Copy Description  
**Edge Cases**: 5 scenarios covered

