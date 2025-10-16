# Scope Refactor - Implementation Progress

## ✅ Phase 1: Critical Bug Fix & UI Updates (COMPLETE)

**File:** `frontend/src/components/RightExplorer.tsx`

### Changes Made:

1. **Fixed Data Source Bug** (line 43)
   ```typescript
   // BEFORE: const scopes = concepts.filter(c => c.kind === 'scope');
   // AFTER:
   const scopes = entities.filter((e: any) => e.entity_type === 'scope');
   ```
   
2. **Separated Conceptual vs Canvas Scopes** (lines 51-53)
   ```typescript
   const conceptualScopes = scopes.filter((s: any) => !s.bounding_box);
   const canvasScopes = scopes.filter((s: any) => s.bounding_box);
   ```

3. **Added Creation Buttons** (lines 63-100)
   - "+ New Scope" button (blue, primary action)
   - "+ Draw Scope" button (secondary styling)
   - Both call `startScopeCreation()` with type

4. **Visual Sections** (lines 103-214)
   - 💭 Conceptual Scopes section (if any exist)
   - 📍 Canvas Scopes section (if any exist)
   - Each shows count in header

5. **Enhanced Scope Cards**
   - Conceptual: Show name/description, evidence count, Edit button
   - Canvas: Show name/description, Sheet number, evidence count, Edit + Jump buttons
   - Both: Visual feedback for selected state

### Result:
- ✅ Existing canvas scopes now visible in Explorer
- ✅ UI ready for conceptual scopes (when backend supports them)
- ✅ Clear visual distinction between types
- ✅ Action buttons in place (will wire up next)

---

## 🔄 Phase 2: Backend Model Changes (IN PROGRESS)

**Files to modify:**
- `backend/app/entities_models.py`
- `backend/app/entities_store.py`
- `backend/tests/test_*.py` (add tests)

### Required Changes:

#### 1. Update `Scope` Model (entities_models.py, line 91-94)

**Current:**
```python
class Scope(BaseVisualEntity):  # Inherits required bbox + sheet
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
```

**Target:**
```python
class Scope(BaseModel):  # Break inheritance
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: Literal["scope"] = "scope"
    name: str | None = None
    description: str | None = None
    
    # Optional spatial fields
    source_sheet_number: Optional[int] = Field(None, ge=1)
    bounding_box: Optional[BoundingBox] = None
    
    # Standard metadata
    created_at: float = Field(default_factory=lambda: time.time())
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
    
    @validator('bounding_box', always=True)
    def _validate_bbox_sheet_consistency(cls, v, values):
        """If bbox exists, source_sheet_number must exist."""
        bbox = v
        sheet = values.get('source_sheet_number')
        
        if bbox is not None and sheet is None:
            raise ValueError("source_sheet_number required when bounding_box is provided")
        
        # Require at least name or description
        name = values.get('name')
        desc = values.get('description')
        if bbox is None and not name and not desc:
            raise ValueError("name or description required for conceptual scopes")
        
        return v
    
    class Config:
        orm_mode = True
```

#### 2. Update `CreateScope` Model (entities_models.py, line 175-180)

**Current:**
```python
class CreateScope(CreateEntityBase):
    entity_type: Literal["scope"]
    source_sheet_number: int  # Required
    bounding_box: List[float]  # Required
    name: str | None = None
    description: str | None = None
```

**Target:**
```python
class CreateScope(CreateEntityBase):
    entity_type: Literal["scope"]
    source_sheet_number: Optional[int] = None  # Optional
    bounding_box: Optional[List[float]] = None  # Optional
    name: str | None = None
    description: str | None = None
    
    @validator('bounding_box', always=True)
    def _validate_consistency(cls, v, values):
        bbox = v
        sheet = values.get('source_sheet_number')
        
        if bbox is not None:
            if sheet is None:
                raise ValueError("source_sheet_number required when bounding_box is provided")
            if len(bbox) != 4:
                raise ValueError("bounding_box must have 4 values [x1, y1, x2, y2]")
        
        # Require meaningful content for conceptual scopes
        if bbox is None:
            name = values.get('name')
            desc = values.get('description')
            if not name and not desc:
                raise ValueError("name or description required for conceptual scopes")
        
        return v
```

#### 3. Update `PatchEntity` to Handle Scope Updates

Allow updating a conceptual scope to add bbox, or canvas scope to remove bbox.

### Test Cases to Add:

```python
# backend/tests/test_entities.py

def test_create_conceptual_scope():
    """Scope without bbox or sheet - valid"""
    payload = {
        "entity_type": "scope",
        "name": "Demolish ground floor walls",
        "description": "Remove all interior walls on ground floor"
    }
    # Should succeed

def test_create_canvas_scope():
    """Scope with bbox and sheet - valid"""
    payload = {
        "entity_type": "scope",
        "name": "Demo area",
        "source_sheet_number": 3,
        "bounding_box": [100, 200, 300, 400]
    }
    # Should succeed

def test_create_scope_bbox_without_sheet():
    """Scope with bbox but no sheet - invalid"""
    payload = {
        "entity_type": "scope",
        "name": "Invalid",
        "bounding_box": [100, 200, 300, 400]
    }
    # Should fail validation

def test_create_scope_no_bbox_no_text():
    """Scope without bbox, name, or description - invalid"""
    payload = {
        "entity_type": "scope"
    }
    # Should fail validation

def test_upgrade_conceptual_to_canvas():
    """Add bbox to existing conceptual scope"""
    # Create conceptual
    scope_id = create_scope({"entity_type": "scope", "name": "Test"})
    
    # Update to add bbox
    patch_entity(scope_id, {
        "source_sheet_number": 1,
        "bounding_box": [10, 20, 30, 40]
    })
    
    # Should succeed

def test_downgrade_canvas_to_conceptual():
    """Remove bbox from canvas scope"""
    # Create canvas scope
    scope_id = create_scope({
        "entity_type": "scope",
        "name": "Test",
        "source_sheet_number": 1,
        "bounding_box": [10, 20, 30, 40]
    })
    
    # Update to remove bbox (set to null)
    patch_entity(scope_id, {
        "bounding_box": null,
        "source_sheet_number": null
    })
    
    # Should succeed
```

---

## 🚧 Phase 3: Frontend Store Actions (TODO)

**File:** `frontend/src/state/store.ts`

### Required State & Actions:

```typescript
interface AppState {
  // ... existing
  
  scopeCreationMode: {
    active: boolean;
    type: 'canvas' | 'conceptual' | null;
  };
  
  // Actions
  startScopeCreation: (type: 'canvas' | 'conceptual') => void;
  cancelScopeCreation: () => void;
  createScope: (data: CreateScopeData) => Promise<void>;
  updateScopeLocation: (scopeId: string, sheet: number, bbox: number[]) => Promise<void>;
  removeScopeLocation: (scopeId: string) => Promise<void>;
  checkDuplicateScopeName: (name: string) => { isDuplicate: boolean; existingScope?: Entity };
}
```

### Implementation:

```typescript
startScopeCreation: (type) => {
  set({ 
    scopeCreationMode: { active: true, type },
    // For conceptual: open form immediately
    // For canvas: enter drawing mode
  });
  
  if (type === 'conceptual') {
    // Open modal form
    openScopeCreationModal();
  } else {
    // Enter canvas drawing mode
    startDrawing('Scope');
  }
},

createScope: async (data) => {
  const { projectId, entities } = get();
  if (!projectId) return;
  
  // Check for duplicate names
  if (data.name) {
    const duplicate = entities.find(
      e => e.entity_type === 'scope' && 
      (e.name === data.name || e.description === data.name)
    );
    
    if (duplicate) {
      const confirmCreate = window.confirm(
        `A scope with similar name "${duplicate.name || duplicate.description}" already exists. Create anyway?`
      );
      if (!confirmCreate) return;
    }
  }
  
  const payload: any = {
    entity_type: 'scope',
    name: data.name,
    description: data.description,
  };
  
  // Only add spatial fields if provided
  if (data.source_sheet_number && data.bounding_box) {
    payload.source_sheet_number = data.source_sheet_number;
    payload.bounding_box = data.bounding_box;
  }
  
  try {
    const created = await apiCreateEntity(projectId, payload);
    await get().fetchEntities();
    get().addToast({ kind: 'success', message: 'Scope created' });
    set({ 
      scopeCreationMode: { active: false, type: null },
      selectedEntityId: created.id,
      rightPanelTab: 'entities'
    });
  } catch (error: any) {
    get().addToast({ kind: 'error', message: error.message || 'Failed to create scope' });
  }
},

updateScopeLocation: async (scopeId, sheet, bbox) => {
  // Called when adding canvas location to conceptual scope
  const { projectId } = get();
  if (!projectId) return;
  
  try {
    await apiUpdateEntity(projectId, scopeId, {
      source_sheet_number: sheet,
      bounding_box: bbox,
    });
    await get().fetchEntities();
    get().addToast({ kind: 'success', message: 'Canvas location added to scope' });
  } catch (error: any) {
    get().addToast({ kind: 'error', message: error.message || 'Failed to update scope' });
  }
},

removeScopeLocation: async (scopeId) => {
  // Called when removing canvas location from scope (canvas → conceptual)
  const { projectId } = get();
  if (!projectId) return;
  
  try {
    await apiUpdateEntity(projectId, scopeId, {
      source_sheet_number: null,
      bounding_box: null,
    });
    await get().fetchEntities();
    get().addToast({ kind: 'success', message: 'Scope converted to conceptual (canvas location removed)' });
  } catch (error: any) {
    get().addToast({ kind: 'error', message: error.message || 'Failed to update scope' });
  }
},
```

---

## 🚧 Phase 4: Scope Creation Modal (TODO)

**File:** `frontend/src/components/ScopeCreationModal.tsx` (NEW)

### Component Structure:

```tsx
interface ScopeCreationModalProps {
  open: boolean;
  type: 'canvas' | 'conceptual';
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
}

export const ScopeCreationModal: React.FC<ScopeCreationModalProps> = ({
  open,
  type,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);
  const { entities } = useProjectStore();
  
  // Check for duplicates on name change
  useEffect(() => {
    if (!name) {
      setIsDuplicateWarning(false);
      return;
    }
    
    const duplicate = entities.find(
      e => e.entity_type === 'scope' && 
      (e.name?.toLowerCase() === name.toLowerCase() || 
       e.description?.toLowerCase() === name.toLowerCase())
    );
    
    setIsDuplicateWarning(!!duplicate);
  }, [name, entities]);
  
  const handleSave = async () => {
    if (!name && !description) {
      alert('Please provide a name or description');
      return;
    }
    
    await onSave({ name, description });
    setName('');
    setDescription('');
  };
  
  if (!open) return null;
  
  return (
    <div className="tg-ui2" style={{ /* modal overlay styles */ }}>
      <div style={{ /* modal card styles */ }}>
        <h3>{type === 'conceptual' ? 'Create Conceptual Scope' : 'Create Canvas Scope'}</h3>
        
        {type === 'conceptual' && (
          <p style={{ fontSize: 12, color: '#64748b' }}>
            💭 This scope will not have a canvas location. You can link it to any instances across the project.
          </p>
        )}
        
        <div style={{ marginBottom: 12 }}>
          <label>Name *</label>
          <input
            type="text"
            placeholder="e.g., Demolish ground floor walls"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          {isDuplicateWarning && (
            <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
              ⚠️ A scope with a similar name already exists
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label>Description</label>
          <textarea
            placeholder="Additional details..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        {type === 'canvas' && (
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16, padding: 8, background: '#f5f7fa', borderRadius: 6 }}>
            💡 After saving, draw the bounding box on the canvas to mark the scope area.
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={!name && !description}>
            Create Scope
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 🚧 Phase 5: Entity Editor Updates (TODO)

**File:** `frontend/src/components/EntityEditor.tsx`

### Required Changes:

1. **Conditional Rendering of Spatial Fields**
   ```tsx
   {/* Only show if scope has bbox */}
   {entity.bounding_box && (
     <div>
       <label>Bounding Box</label>
       {/* ... bbox display */}
     </div>
   )}
   
   {/* Only show if scope has sheet */}
   {entity.source_sheet_number && (
     <div>
       <label>Sheet</label>
       {/* ... sheet display */}
     </div>
   )}
   ```

2. **Scope Type Indicator**
   ```tsx
   {entity.entity_type === 'scope' && (
     <div>
       <label>Type</label>
       <div>
         {entity.bounding_box ? '📍 Canvas-based' : '💭 Conceptual'}
       </div>
     </div>
   )}
   ```

3. **Bidirectional Conversion Buttons**
   ```tsx
   {/* Conceptual → Canvas */}
   {entity.entity_type === 'scope' && !entity.bounding_box && (
     <button onClick={() => startAddingCanvasLocation(entity.id)}>
       + Add Canvas Location
     </button>
   )}
   
   {/* Canvas → Conceptual */}
   {entity.entity_type === 'scope' && entity.bounding_box && (
     <button 
       onClick={() => confirmRemoveCanvasLocation(entity.id)}
       style={{ color: '#dc2626' }}
     >
       Remove Canvas Location
     </button>
   )}
   ```

4. **Conversion Handlers**
   ```tsx
   const startAddingCanvasLocation = (scopeId: string) => {
     // Enter drawing mode with scope context
     set({ 
       drawing: { active: true, entityType: 'Scope', forExistingEntity: scopeId }
     });
     addToast({ kind: 'info', message: 'Draw bounding box on canvas' });
   };
   
   const confirmRemoveCanvasLocation = (scopeId: string) => {
     if (window.confirm('Remove canvas location? This will convert the scope to conceptual.')) {
       removeScopeLocation(scopeId);
     }
   };
   ```

---

## 🚧 Phase 6: Canvas Rendering Updates (TODO)

**File:** `frontend/src/components/EntitiesOverlay.tsx`

### Required Change:

Filter out entities without bounding boxes before rendering:

```tsx
const renderableEntities = entities.filter(e => {
  // Only render entities with spatial data
  return e.bounding_box !== null && e.bounding_box !== undefined;
});

renderableEntities.forEach(entity => {
  // Safe to access bounding_box here
  const { x1, y1, x2, y2 } = entity.bounding_box;
  // ... render
});
```

---

## 📊 Current Status

| Phase | Status | Files Modified | Notes |
|-------|--------|----------------|-------|
| 1. Bug Fix & UI | ✅ Complete | `RightExplorer.tsx` | Build succeeds, UI ready |
| 2. Backend Models | 🚧 Ready to implement | `entities_models.py` | Need to update Scope class |
| 3. Store Actions | 🚧 Pending | `store.ts` | Depends on Phase 2 |
| 4. Creation Modal | 🚧 Pending | (new file) | Depends on Phase 3 |
| 5. Entity Editor | 🚧 Pending | `EntityEditor.tsx` | Depends on Phase 3 |
| 6. Canvas Filter | 🚧 Pending | `EntitiesOverlay.tsx` | Depends on Phase 2 |

---

## Next Steps

1. **Implement Backend Changes** (Phase 2)
   - Update `Scope` model to make bbox optional
   - Update `CreateScope` model validators
   - Add tests for conceptual scopes
   
2. **Implement Store Actions** (Phase 3)
   - Add `scopeCreationMode` state
   - Add `startScopeCreation`, `createScope` actions
   - Add conversion actions
   
3. **Create Modal Component** (Phase 4)
   - Build `ScopeCreationModal.tsx`
   - Wire up duplicate warning
   - Handle form submission
   
4. **Update Entity Editor** (Phase 5)
   - Conditional spatial field rendering
   - Conversion buttons
   - Handler implementations
   
5. **Update Canvas Rendering** (Phase 6)
   - Filter null bbox entities
   - Test rendering with mixed scope types

---

## Testing Plan

### Critical Tests:
- [ ] Existing canvas scopes visible in Explorer (REGRESSION TEST)
- [ ] Create conceptual scope via "+ New Scope"
- [ ] Create canvas scope via "+ Draw Scope"
- [ ] Link instance to conceptual scope (shows complete)
- [ ] Add canvas location to conceptual scope (upgrade)
- [ ] Remove canvas location from canvas scope (downgrade)
- [ ] Duplicate name warning appears correctly
- [ ] Canvas doesn't crash on null bbox
- [ ] Entity Editor handles both scope types

---

**Current Build Status:** ✅ **PASSING** (710KB bundle)

