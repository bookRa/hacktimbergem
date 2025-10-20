# Data Model Refactor - Implementation Complete

## Summary

The data model refactor has been successfully implemented to add first-class container entities (Legend, Schedule, AssemblyGroup) and their item entities (LegendItem, ScheduleItem, Assembly), along with updating SymbolInstance to link to definition items.

## ✅ Backend Changes Complete

### 1. Models (`backend/app/entities_models.py`)
- ✅ Removed old unused Legend and Schedule classes
- ✅ Added new Legend, Schedule, AssemblyGroup container models (visual entities with required bbox)
- ✅ Added LegendItem, ScheduleItem, Assembly item models (optional bbox, required parent FK)
- ✅ Updated SymbolInstance with `definition_item_id` and `definition_item_type` fields
- ✅ Added Create* classes for all new entity types
- ✅ Updated EntityUnion and CreateEntityUnion to include new types
- ✅ Added validators for bbox/sheet consistency and definition item consistency
- ✅ Updated __all__ exports

### 2. Store (`backend/app/entities_store.py`)
- ✅ Updated imports to include all new entity types
- ✅ Updated `load_entities()` class map with new entity types
- ✅ Updated `create_entity()` to handle:
  - Legend, LegendItem, Schedule, ScheduleItem, AssemblyGroup, Assembly creation
  - Parent container validation for items
  - Drawing_id validation when provided
  - Definition_item validation for SymbolInstance
- ✅ Updated `update_entity()` signature and logic to handle all new fields
- ✅ Updated `delete_entity()` with deletion guards:
  - Prevent deletion of containers with child items
  - Prevent deletion of items referenced by SymbolInstances
- ✅ Updated class map with new entity types

### 3. API (`backend/app/main.py`)
- ✅ Updated PATCH endpoint kwargs extraction to include all new fields:
  - notes, schedule_type, legend_id, schedule_id, assembly_group_id
  - symbol_text, mark, code, drawing_id
  - definition_item_id, definition_item_type

## ✅ Frontend Changes Complete

### 1. API Types (`frontend/src/api/entities.ts`)
- ✅ Updated EntityType union to include new types
- ✅ Added entity interfaces for:
  - LegendEntity, LegendItemEntity
  - ScheduleEntity, ScheduleItemEntity
  - AssemblyGroupEntity, AssemblyEntity
- ✅ Updated SymbolInstanceEntity with definition_item_id and definition_item_type
- ✅ Updated Entity union type
- ✅ Updated CreateEntityInput union with creation types for new entities
- ✅ Updated PatchPayload with all new fields

### 2. Store (`frontend/src/state/store.ts`)
- ✅ Updated explorerTab type to include: 'legends', 'legendItems', 'schedules', 'scheduleItems', 'assemblies', 'assemblyGroups'
- ✅ Updated setExplorerTab signature to accept new tab values

## 🔧 Frontend UI Components - Remaining Work

### Required Updates (Not Yet Implemented)

#### 1. RightExplorer Component (`frontend/src/components/RightExplorer.tsx`)
Need to add:
- Button tabs for Legends, Schedules, and Assemblies
- `LegendsList` component showing grouped view (containers with expandable items)
- `SchedulesList` component showing grouped view
- `AssembliesList` component showing grouped view

#### 2. EntityEditor Component (`frontend/src/components/EntityEditor.tsx`)
Need to add form fields for:
- **Legend**: title, notes
- **LegendItem**: parent legend selector, symbol_text, description, notes, optional location
- **Schedule**: title, schedule_type dropdown, notes
- **ScheduleItem**: parent schedule selector, mark, description, notes, specifications editor, drawing link, optional location
- **AssemblyGroup**: title, notes
- **Assembly**: parent group selector, code, name, description, notes, specifications editor, drawing link, optional location
- **SymbolInstance**: Add definition item linking UI (dropdown/search for Assembly/ScheduleItem/LegendItem)

#### 3. Canvas Components
- Update canvas overlay rendering to visually distinguish containers vs items
- Update entity tags to show parent-child relationships
- Add toolbar/context menu options for creating containers and items

#### 4. CanvasToolbar Component (`frontend/src/components/CanvasToolbar.tsx`)
- Add buttons for creating Legend, Schedule, AssemblyGroup containers

## 📋 Testing Checklist

### Backend API Testing
```bash
# Test with curl or Postman

# 1. Create a Legend container
POST /api/projects/{project_id}/entities
{
  "entity_type": "legend",
  "source_sheet_number": 1,
  "bounding_box": [100, 100, 300, 400],
  "title": "Keynote Legend",
  "notes": "Main legend for the project"
}

# 2. Create a LegendItem (child of Legend)
POST /api/projects/{project_id}/entities
{
  "entity_type": "legend_item",
  "legend_id": "<legend_id_from_step_1>",
  "symbol_text": "A1",
  "description": "Wall assembly type A1",
  "notes": "See sheet 3 for details"
}

# 3. Create a SymbolInstance with definition_item link
POST /api/projects/{project_id}/entities
{
  "entity_type": "symbol_instance",
  "source_sheet_number": 1,
  "bounding_box": [500, 200, 520, 220],
  "symbol_definition_id": "<existing_symbol_def_id>",
  "definition_item_id": "<legend_item_id_from_step_2>",
  "definition_item_type": "legend_item"
}

# 4. Test deletion guards
# Try deleting the Legend from step 1 - should fail with "Cannot delete legend with existing legend items"
DELETE /api/projects/{project_id}/entities/<legend_id>

# Try deleting the LegendItem from step 2 - should fail if SymbolInstance references it
DELETE /api/projects/{project_id}/entities/<legend_item_id>

# 5. Update SymbolInstance to link to different definition item
PATCH /api/projects/{project_id}/entities/<symbol_instance_id>
{
  "definition_item_id": null,
  "definition_item_type": null
}
```

### Frontend UI Testing
1. ✅ Verify no TypeScript compilation errors
2. ⚠️ Add new tabs to RightExplorer and verify they render
3. ⚠️ Update EntityEditor to handle new entity types
4. ⚠️ Test creating containers (Legend, Schedule, AssemblyGroup) on canvas
5. ⚠️ Test creating items from within container editors
6. ⚠️ Test linking SymbolInstance to definition items
7. ⚠️ Verify visual overlays distinguish containers vs items

## 🎯 Next Steps

1. **Implement Frontend UI Components**
   - Update RightExplorer with new tabs and list components
   - Update EntityEditor with forms for all new entity types
   - Update canvas components for creation flows

2. **Manual Integration Testing**
   - Test full workflow: Create Legend → Add LegendItem → Create SymbolInstance → Link to LegendItem
   - Test deletion guards work as expected
   - Verify coordinate transforms work for items with optional bbox
   - Test hierarchical views in Explorer tabs

3. **Visual Polish**
   - Add distinct visual styling for containers vs items on canvas
   - Improve parent-child relationship indicators
   - Add helpful tooltips and validation messages

## 📝 Notes

- All backend changes are complete and linter-clean
- Frontend types and store are updated and linter-clean
- Frontend UI components need to be implemented to provide the full user experience
- No backward compatibility concerns since we're on a clean `data_model_refactor` branch
- Fresh `entities.json` structure will be used for all test projects

## 🔍 File Changes Summary

### Backend
- `backend/app/entities_models.py` - Comprehensive model updates
- `backend/app/entities_store.py` - CRUD and validation updates
- `backend/app/main.py` - API endpoint updates

### Frontend
- `frontend/src/api/entities.ts` - TypeScript type definitions
- `frontend/src/state/store.ts` - Store type updates
- `frontend/src/components/RightExplorer.tsx` - Needs UI updates
- `frontend/src/components/EntityEditor.tsx` - Needs form updates
- `frontend/src/components/CanvasToolbar.tsx` - Needs button updates
- Canvas overlay components - Need visual distinction updates

