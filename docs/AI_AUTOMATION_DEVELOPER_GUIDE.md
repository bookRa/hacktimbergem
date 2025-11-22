# AI Automation Developer Guide

> **Status:** 🚧 Work in Progress - This guide will be expanded as implementation progresses

This guide explains the architecture, design decisions, and development workflows for TimberGem's AI Automation system. It complements the strategic overview in `AI_AUTOMATION_STRATEGY.md` with concrete implementation details.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Design Principles](#key-design-principles)
3. [Component Reference](#component-reference)
4. [Development Workflows](#development-workflows)
5. [Testing Strategy](#testing-strategy)
6. [Debugging & Observability](#debugging--observability)
7. [Common Patterns](#common-patterns)
8. [FAQ](#faq)

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Experimentation Layer                         │
│  (Colab Notebooks, Local Scripts, automation_playbooks/)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Artifacts (proposals.json, detections.json)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Artifact Ingestion                            │
│  (PlaybookArtifactLoader, ingest_colab_bundle.py)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Strategy Injection
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Use Cases                                  │
│  (DetectScopesUseCase, DetectSymbolsUseCase, etc.)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ CreateEntityUnion payloads
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Unified Entity Pipeline                       │
│  (CreateEntityUseCase, EntityValidator, EntityRepository)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Persisted entities
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HITL Review Layer                             │
│  (Frontend UI V2, InlineEntityForm, EntityTag)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Coordinate System Invariants

**Critical:** All AI-generated bounding boxes must be in **unrotated PDF point space** (origin top-left, y increases downward).

- **Backend:** Use `backend/app/coords.py` for all coordinate transformations
- **Frontend:** Use `frontend/src/utils/coords.ts` for canvas↔PDF conversions
- **Never** store viewport or pixel coordinates in entities
- **Always** convert at boundaries (Colab → PDF, PDF → Canvas)

### Traceability Chain

Every AI-generated entity must be traceable back to its source:

```
Colab Run → Artifact (metadata.json) → Backend Trace ID → Entity (created_at, validation)
```

- Trace IDs propagate via `AIUseCaseResult.trace_id`
- LangSmith/OpenTelemetry spans capture project/sheet/entity metadata
- Artifacts include `trace_id` in `metadata.json` for audit trails

---

## Key Design Principles

### 1. Manual-First, AI-Accelerated

**Principle:** All core workflows must work without AI. AI is an accelerator with explicit user verification.

**Implementation:**
- AI use cases call the same `CreateEntityUseCase` as manual UI
- Validation rules are identical (no special AI bypass)
- Users can edit/reject/approve all AI proposals

### 2. Permissive Creation, Strict Validation

**Principle:** Allow incomplete entities to be created, but mark them clearly for human review.

**Implementation:**
- `PageAnchoredEntity` allows `bounding_box: Optional[BoundingBox]`
- `CreateEntityUseCase._mark_missing_bbox()` sets `validation.missing.bounding_box=true`
- Frontend shows "Needs grounding" badge for incomplete entities
- Users can add bboxes later via "Add bounding box" action

### 3. Strategy Pattern for Experimentation

**Principle:** Swap AI backends (heuristics, LLM, vision models) without changing orchestration logic.

**Implementation:**
- Use cases depend on abstract protocols (`ScopeSuggestionStrategy`, `LegendParserStrategy`)
- Concrete strategies injected via FastAPI DI (`dependencies.py`)
- Feature flags control which strategy is active (`ai_playbooks_enabled`)

### 4. Artifact-Based Handoff

**Principle:** Colab experiments produce versioned artifacts that backend can replay deterministically.

**Implementation:**
- Artifacts stored in `automation_playbooks/artifacts/{timestamp}/{project_id}/{stage}/`
- `PlaybookArtifactLoader` reads `proposals.json` and `detections.json`
- `metadata.json` captures experiment config for reproducibility

---

## Component Reference

### Backend Components

#### 1. AI Use Cases (`backend/app/use_cases/ai/`)

**Purpose:** Orchestrate AI services and existing entity creation flows.

**Key Classes:**
- `DetectScopesUseCase`: Top-down scope/note extraction from OCR
- `DetectSymbolsUseCase`: Bottom-up symbol detection from raster
- `LegendParserUseCase`: Legend/schedule table parsing
- `LinkContextsUseCase`: Cross-modal linking (future)

**Usage Example:**
```python
use_case = DetectScopesUseCase(
    ocr_service=ocr_service,
    create_entity=create_entity_use_case,
    strategy=playbook_scope_strategy,  # Injected via DI
)

result = use_case.execute(
    project_id="abc123",
    sheet_number=1,
    dry_run=True,  # Preview proposals without persisting
)

# result.proposed: List[CreateEntityUnion]
# result.created: List[EntityUnion] (if dry_run=False)
# result.trace_id: str (for audit)
```

#### 2. Strategy Interfaces (`backend/app/services/ai/strategies/`)

**Purpose:** Abstract AI backends for easy experimentation.

**Key Protocols:**
- `ScopeSuggestionStrategy`: Proposes scope/note entities from OCR
- `LegendParserStrategy`: Extracts legend/schedule items
- `SymbolPostProcessor`: Refines symbol detections (clustering, deduplication)

**Concrete Implementations:**
- `PlaybookScopeStrategy`: Reads proposals from Colab artifacts
- `PlaybookLegendStrategy`: Reads legend items from artifacts
- `HeuristicScopeStrategy`: (Future) Keyword-based OCR parsing
- `LLMScopeStrategy`: (Future) OpenAI/Anthropic API

**Adding a New Strategy:**
1. Implement the protocol interface
2. Register in `dependencies.py` with feature flag
3. Add tests in `backend/tests/test_ai_strategies.py`

#### 3. Artifact Loader (`backend/app/services/ai/playbook_artifacts.py`)

**Purpose:** Read and validate Colab experiment outputs.

**Key Class:** `PlaybookArtifactLoader`

**Artifact Structure:**
```
artifacts/
  20241122T150000Z/          # Timestamp
    abc123/                   # Project ID
      scopes/                 # Stage
        metadata.json         # Experiment config
        proposals.json        # Entity payloads
        detections.json       # Visual detections (optional)
        trace.txt             # Trace ID reference
```

**Usage Example:**
```python
loader = PlaybookArtifactLoader(artifacts_root="automation_playbooks/artifacts")

proposals = loader.load_proposals(
    project_id="abc123",
    stage="scopes",
    sheet_number=1,
)
# Returns: List[CreateEntityUnion]
```

#### 4. Telemetry (`backend/app/telemetry/`)

**Purpose:** Emit traces for observability and audit.

**Key Class:** `Telemetry`

**Configuration:**
```bash
export TIMBERGEM_TRACING_ENABLED=true
export LANGSMITH_API_KEY=<your-key>
export LANGSMITH_PROJECT=TimberGem
```

**Usage in Use Cases:**
```python
with telemetry.span("DetectScopes", attributes={"project_id": project_id}):
    # AI logic here
    pass
```

### Frontend Components

#### 1. UI V2 State (`frontend/src/state/ui_v2.ts`)

**Purpose:** Manage canvas interactions and AI proposal flows.

**Key State:**
- `inlineForm.entityMetadata`: Tracks page-scoped vs. bounded entities
- `inlineForm.needsGrounding`: Flags entities missing bboxes

**Key Actions:**
- `openFormWithAIProposal()`: Surface AI suggestion in inline form
- `startGroundingMode()`: Allow user to draw bbox for page-scoped entity

#### 2. Entity Flags (`frontend/src/state/entity_flags.ts`)

**Purpose:** Derive completion status from entity attributes.

**Key Function:** `deriveEntityFlags()`

**Logic:**
```typescript
if (!entity.bounding_box && isPageAnchored(entity.entity_type)) {
  return {
    status: 'incomplete',
    validation: { missing: { bounding_box: true } }
  };
}
```

#### 3. Grounding Workflow (`frontend/src/ui_v2/OverlayLayer.tsx`)

**Purpose:** Allow users to add bboxes to page-scoped entities.

**Flow:**
1. User clicks "Add bounding box" in `InlineEntityForm`
2. `startGroundingMode(entityId)` called
3. User drags bbox on canvas
4. `updateScopeLocation(entityId, sheet, bbox)` patches entity
5. Entity status changes from `incomplete` to `complete`

---

## Development Workflows

### Workflow 1: Adding a New AI Strategy

**Scenario:** You want to add an LLM-based scope extraction strategy.

**Steps:**

1. **Define the strategy class:**
```python
# backend/app/services/ai/strategies/llm_scope.py

from app.use_cases.ai.detect_scopes import ScopeSuggestionStrategy
from app.services.ai.ocr_service import OCRData

class LLMScopeStrategy(ScopeSuggestionStrategy):
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model
    
    def propose(
        self,
        *,
        project_id: str,
        sheet_number: int,
        ocr: OCRData,
        regions: Sequence[LayoutRegion] | None = None,
    ) -> List[CreateEntityUnion]:
        # 1. Build prompt with OCR context
        prompt = self._build_prompt(ocr)
        
        # 2. Call LLM API
        response = self._call_llm(prompt)
        
        # 3. Parse structured output
        proposals = self._parse_response(response)
        
        # 4. Convert to CreateEntityUnion payloads
        return [self._to_entity_payload(p, sheet_number) for p in proposals]
```

2. **Register in DI container:**
```python
# backend/app/api/dependencies.py

def get_scope_suggestion_strategy() -> ScopeSuggestionStrategy | None:
    settings = get_settings()
    if settings.ai_llm_enabled:
        return LLMScopeStrategy(api_key=settings.openai_api_key)
    elif settings.ai_playbooks_enabled:
        loader = PlaybookArtifactLoader(settings.automation_artifacts_dir)
        return PlaybookScopeStrategy(loader)
    return None
```

3. **Add tests:**
```python
# backend/tests/test_llm_scope_strategy.py

def test_llm_scope_strategy_returns_proposals(mock_openai):
    strategy = LLMScopeStrategy(api_key="test-key")
    ocr = OCRData(page_number=1, width_pts=612, height_pts=792, blocks=[...])
    
    proposals = strategy.propose(
        project_id="test",
        sheet_number=1,
        ocr=ocr,
    )
    
    assert len(proposals) > 0
    assert all(p.entity_type in ["scope", "note", "legend"] for p in proposals)
```

4. **Update configuration:**
```python
# backend/app/config.py

@dataclass
class Settings:
    # ...
    ai_llm_enabled: bool = field(
        default_factory=lambda: _bool_env("TIMBERGEM_AI_LLM_ENABLED", "false")
    )
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )
```

### Workflow 2: Running a Colab Experiment

**Scenario:** You want to test a new scope extraction model in Colab.

**Steps:**

1. **Create experiment config:**
```yaml
# automation_playbooks/configs/llm_scope_test.yaml
run_name: llm_scope_gpt4
project_id: abc123
sheet_number: 1
stage: scopes
provider: openai
model: gpt-4
environment: colab
options:
  temperature: 0.2
  max_tokens: 2000
```

2. **Run experiment locally (optional):**
```bash
make automation.run CONFIG=automation_playbooks/configs/llm_scope_test.yaml
# Creates: automation_playbooks/artifacts/20241122T150000Z/abc123/scopes/
```

3. **In Colab notebook:**
```python
# Load config
from automation_playbooks.experiment_config import ExperimentConfig
config = ExperimentConfig.from_file("configs/llm_scope_test.yaml")

# Run your model
proposals = run_llm_scope_extraction(config)

# Export artifacts
artifact_dir = config.build_artifact_dir()
artifact_dir.mkdir(parents=True, exist_ok=True)

with open(artifact_dir / "proposals.json", "w") as f:
    json.dump([p.dict() for p in proposals], f, indent=2)

with open(artifact_dir / "metadata.json", "w") as f:
    json.dump(config.metadata(), f, indent=2)

print(f"Artifacts saved to: {artifact_dir}")
```

4. **Ingest artifacts into backend:**
```bash
python automation_playbooks/scripts/ingest_colab_bundle.py \
  --artifact-dir automation_playbooks/artifacts/20241122T150000Z/abc123/scopes
```

5. **Test via API:**
```bash
curl -X POST http://localhost:8000/api/projects/abc123/ai/scopes:detect \
  -H "Content-Type: application/json" \
  -d '{"sheet_number": 1, "dry_run": true}'
```

### Workflow 3: Adding a Grounding Action

**Scenario:** You want to allow users to add bboxes to page-scoped entities.

**Steps:**

1. **Update entity state to track grounding mode:**
```typescript
// frontend/src/state/store.ts

groundingMode: {
  active: boolean;
  entityId: string | null;
  entityType: string | null;
}

startGrounding: (entityId: string, entityType: string) => {
  set({ groundingMode: { active: true, entityId, entityType } });
  // Trigger drawing mode
  import('./ui_v2').then(({ useUIV2Store }) => {
    useUIV2Store.getState().startDrawing(entityType);
  });
}
```

2. **Handle bbox completion:**
```typescript
// frontend/src/ui_v2/OverlayLayer.tsx

if (groundingMode.active && groundingMode.entityId) {
  // User finished drawing bbox
  const { entityId } = groundingMode;
  
  await patchEntity(projectId, entityId, {
    source_sheet_number: pageIndex + 1,
    bounding_box: bboxPdf,
  });
  
  set({ groundingMode: { active: false, entityId: null, entityType: null } });
  addToast({ kind: 'success', message: 'Bounding box added' });
}
```

3. **Add UI trigger:**
```typescript
// frontend/src/ui_v2/forms/InlineEntityForm.tsx

{!entity.bounding_box && (
  <TGButton
    variant="outline"
    onClick={() => {
      const { startGrounding } = useProjectStore.getState();
      startGrounding(entity.id, entity.entity_type);
      onCancel(); // Close form so user can draw
    }}
  >
    📍 Add Bounding Box
  </TGButton>
)}
```

---

## Testing Strategy

### Unit Tests

**Location:** `backend/tests/`

**Coverage:**
- Strategy implementations (`test_playbook_strategies.py`)
- Use case orchestration (`test_detect_scopes_usecase.py`)
- Page-anchored entity validation (`test_page_anchored_entities.py`)
- Coordinate transformations (`test_coords.py`)

**Running Tests:**
```bash
cd backend
PYTHONPATH=/path/to/backend pytest tests/
```

### Integration Tests

**Location:** `backend/tests/integration/` (future)

**Coverage:**
- End-to-end AI pipeline (OCR → proposals → persistence)
- Artifact ingestion → API → entity creation
- Trace ID propagation across layers

### Regression Tests

**Location:** `backend/tests/data/ai/` (fixtures)

**Coverage:**
- Ground truth datasets for scope/symbol extraction
- Precision/recall/F1 metrics against annotated data
- Block merges if metrics degrade below threshold

**Running Regression Suite:**
```bash
pytest tests/test_scope_extraction_eval.py --regression
```

### Frontend Tests

**Location:** `frontend/src/**/__tests__/`

**Coverage:**
- Entity flag derivation (`entity_flags.test.ts`)
- Coordinate transformations (`coords.test.ts`)
- UI V2 state reducers (`ui_v2.test.ts`)

**Running Frontend Tests:**
```bash
cd frontend
npm test
```

---

## Debugging & Observability

### Viewing Traces

**LangSmith:**
1. Navigate to https://smith.langchain.com
2. Select project "TimberGem"
3. Filter by `trace_id` or `project_id`
4. View span hierarchy and attributes

**OpenTelemetry (Console):**
```bash
export TIMBERGEM_TRACING_ENABLED=true
# Traces will print to console during development
```

### Debugging AI Proposals

**Check artifact contents:**
```bash
cat automation_playbooks/artifacts/20241122T150000Z/abc123/scopes/proposals.json
```

**Verify loader behavior:**
```python
from app.services.ai.playbook_artifacts import PlaybookArtifactLoader

loader = PlaybookArtifactLoader("automation_playbooks/artifacts")
proposals = loader.load_proposals("abc123", "scopes", sheet_number=1)
print(f"Loaded {len(proposals)} proposals")
```

**Test use case in isolation:**
```python
from app.use_cases.ai.detect_scopes import DetectScopesUseCase

result = use_case.execute("abc123", 1, dry_run=True)
print(f"Proposed: {len(result.proposed)}")
print(f"Trace ID: {result.trace_id}")
```

### Common Issues

**Issue:** "No module named 'app'"
**Fix:** Set `PYTHONPATH=/path/to/backend` before running tests

**Issue:** Proposals not loading from artifacts
**Fix:** Check `automation_artifacts_dir` in Settings matches artifact location

**Issue:** Frontend shows "Needs grounding" but entity has bbox
**Fix:** Verify `entity_flags.ts` logic matches backend validation

---

## Common Patterns

### Pattern 1: Dry-Run Preview

**Use Case:** Preview AI proposals before persisting.

```python
result = use_case.execute(project_id, sheet_number, dry_run=True)

# result.proposed contains CreateEntityUnion payloads
# result.created is empty (nothing persisted)

# User reviews proposals in UI, then:
result = use_case.execute(project_id, sheet_number, dry_run=False)
# Now result.created contains persisted entities
```

### Pattern 2: Confidence Filtering

**Use Case:** Only surface high-confidence proposals to users.

```python
class LLMScopeStrategy(ScopeSuggestionStrategy):
    def propose(self, ...) -> List[CreateEntityUnion]:
        raw_proposals = self._call_llm(...)
        
        # Filter by confidence
        filtered = [
            p for p in raw_proposals
            if p.metadata.get("confidence", 0) > 0.7
        ]
        
        return filtered
```

### Pattern 3: Incremental Grounding

**Use Case:** Allow users to add bboxes to page-scoped entities later.

```python
# 1. Create page-scoped entity without bbox
payload = CreateLegend(
    entity_type="legend",
    source_sheet_number=1,
    bounding_box=None,  # Optional for page-anchored
    title="General Notes",
)

entity = create_entity_use_case.execute(project_id, payload)
# entity.status == "incomplete"
# entity.validation.missing.bounding_box == True

# 2. User draws bbox later
patch_payload = {
    "bounding_box": [100, 100, 400, 300],
}
updated = update_entity_use_case.execute(project_id, entity.id, patch_payload)
# updated.status == "complete"
# updated.validation.missing.bounding_box == False
```

---

## FAQ

### Q: How do I add a new entity type to AI proposals?

**A:** 
1. Add the entity type to `backend/app/domain/models/entities.py`
2. Update `CreateEntityUnion` discriminated union
3. Add creation logic in `CreateEntityUseCase._build_entity()`
4. Update strategy implementations to return new entity type
5. Add frontend support in `entity_flags.ts` and UI V2 components

### Q: Can AI proposals include links between entities?

**A:** Not yet. Phase 4 (Cross-Modal Linking) will add `LinkSuggestionStrategy` for proposing relationships. For now, AI can only propose entities, and users must create links manually.

### Q: How do I run AI pipelines on multiple sheets at once?

**A:** Use the batch processing pattern:

```python
for sheet_number in range(1, num_sheets + 1):
    result = use_case.execute(project_id, sheet_number, dry_run=False)
    print(f"Sheet {sheet_number}: {len(result.created)} entities created")
```

### Q: What happens if an AI proposal fails validation?

**A:** The entity is not created, and the error is logged. The use case returns partial results:

```python
result = use_case.execute(project_id, sheet_number, dry_run=False)
# result.created contains only successfully created entities
# Failed proposals are skipped (logged but not returned)
```

### Q: How do I compare two experiment runs?

**A:** Use the `compare_runs.py` script:

```bash
make automation.compare \
  BASELINE=automation_playbooks/artifacts/20241122T150000Z/abc123/scopes \
  CANDIDATE=automation_playbooks/artifacts/20241122T160000Z/abc123/scopes
```

### Q: Can I use multiple strategies at once?

**A:** Yes, implement a composite strategy:

```python
class HybridScopeStrategy(ScopeSuggestionStrategy):
    def __init__(self, strategies: List[ScopeSuggestionStrategy]):
        self.strategies = strategies
    
    def propose(self, ...) -> List[CreateEntityUnion]:
        all_proposals = []
        for strategy in self.strategies:
            all_proposals.extend(strategy.propose(...))
        
        # Deduplicate and merge
        return self._deduplicate(all_proposals)
```

---

## Next Steps

This guide will be expanded with:

- [ ] Detailed LLM prompt engineering guidelines
- [ ] Model training and fine-tuning workflows
- [ ] Cost optimization strategies (caching, batching)
- [ ] Advanced debugging techniques (visual diff tools)
- [ ] Production deployment checklist
- [ ] Performance benchmarking results

**Contributing:** If you add a new AI component, please update this guide with:
1. Component reference entry
2. Development workflow example
3. Common patterns/pitfalls
4. FAQ entries

---

**Last Updated:** 2025-11-22  
**Maintainers:** AI Automation Team  
**Related Docs:** `AI_AUTOMATION_STRATEGY.md`, `AI_AUTOMATION_TODO.md`, `automation_playbook.md`

