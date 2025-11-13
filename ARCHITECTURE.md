# TimberGem Clean Architecture Guide

**Version:** 2.0  
**Last Updated:** November 13, 2025  
**Status:** Current and Definitive

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architectural Principles](#architectural-principles)
3. [Layer Structure](#layer-structure)
4. [Data Flow](#data-flow)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Coordinate System](#coordinate-system)
8. [Testing Strategy](#testing-strategy)
9. [AI Integration Points](#ai-integration-points)
10. [Common Patterns](#common-patterns)

---

## Overview

TimberGem uses **Clean Architecture** (also known as Hexagonal/Onion Architecture) to separate concerns and enable both manual and AI-driven workflows to operate through the same interfaces.

### Core Goals

1. **Unified Path**: Manual UI operations and AI pipelines use identical business logic
2. **Testability**: Each layer can be tested independently with mocks
3. **Flexibility**: Easily swap implementations (file storage → Neo4j, PyMuPDF → Azure CV)
4. **Traceability**: Every entity anchored to source document with PDF-space coordinates

### High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌────────────┐              ┌────────────────────────┐ │
│  │  FastAPI   │              │   React + Zustand      │ │
│  │  Routes    │              │   UI Components        │ │
│  └────────────┘              └────────────────────────┘ │
└───────────┬──────────────────────────┬──────────────────┘
            │                          │
            │ HTTP/REST                │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│              Application Layer (Use Cases)               │
│  • CreateEntity  • UpdateEntity  • CreateLink           │
│  • DetectEntities (AI)  • ListEntities                  │
└───────────┬─────────────────────────────────────────────┘
            │
            │ Uses interfaces, not implementations
            ▼
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│  ┌──────────────┐  ┌─────────────────┐                 │
│  │   Models     │  │  Domain Services │                 │
│  │ (Pydantic)   │  │  • Validators    │                 │
│  └──────────────┘  │  • Link Logic    │                 │
│                    │  • Spatial Ops   │                 │
│                    └─────────────────┘                  │
└───────────┬─────────────────────────────────────────────┘
            │
            │ Persistence abstraction (Repository pattern)
            ▼
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Layer                        │
│  ┌────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ File Repos │  │ AI Services│  │ External APIs    │   │
│  │ (JSON)     │  │ (OCR, VLM) │  │ (Future: Neo4j)  │   │
│  └────────────┘  └───────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Architectural Principles

### 1. **Dependency Inversion**

Inner layers define **interfaces**; outer layers provide **implementations**.

```python
# ❌ BAD: Use case depends on concrete implementation
from app.repositories.implementations.file_entity_repo import FileEntityRepository

class CreateEntityUseCase:
    def __init__(self):
        self.repo = FileEntityRepository()  # Tight coupling!

# ✅ GOOD: Use case depends on interface
from app.repositories.entity_repository import IEntityRepository

class CreateEntityUseCase:
    def __init__(self, repo: IEntityRepository):
        self.repo = repo  # Can be ANY implementation!
```

### 2. **Single Responsibility**

- **Use Cases**: One business operation per class
- **Domain Services**: Reusable domain logic (validation, spatial analysis)
- **Repositories**: Data access only, no business logic

### 3. **Explicit is Better Than Implicit**

- Use Pydantic models for all data contracts
- Type hints everywhere
- No "magic" - clear, traceable data flow

### 4. **Testability First**

Every component should be testable in isolation:
- Use cases: Mock repositories
- Domain services: Pure functions where possible
- Repositories: Test with temp directories

---

## Layer Structure

### 1️⃣ **Domain Layer** (`backend/app/domain/`)

**Purpose:** Core business logic and rules. No dependencies on frameworks or external systems.

#### **Models** (`domain/models/`)

Pydantic models defining the knowledge graph schema.

```python
# value_objects.py
class BoundingBox(BaseModel):
    x1: float  # PDF points, unrotated
    y1: float
    x2: float
    y2: float

# entities.py
class Drawing(DocumentEntity):
    entity_type: Literal["drawing"]
    drawing_type: str  # e.g., "floor_plan", "elevation"
    scale: Optional[str] = None
    title: Optional[str] = None

# concepts.py
class Scope(ConceptualEntity):
    entity_type: Literal["scope"]
    description: str
    category: str  # e.g., "framing", "electrical"

# relationships.py
class Link(BaseModel):
    id: str
    source_id: str
    target_id: str
    relationship_type: str  # e.g., "justified_by", "located_in"
```

**Key Principles:**
- All visual entities have `source_sheet_number` + `bounding_box`
- All coordinates in PDF point space (origin top-left, y-down)
- Conceptual entities (Scope, Space) have no bounding box
- Enums for entity types ensure type safety

#### **Domain Services** (`domain/services/`)

Reusable business logic that doesn't fit in a single entity.

```python
# entity_validator.py
class EntityValidator:
    def validate_bounding_box(self, bbox: BoundingBox, page_rect: tuple) -> ValidationResult:
        """Ensure bbox is within page bounds, no NaN, x2>x1, y2>y1"""

    def validate_entity_completeness(self, entity: EntityUnion) -> ValidationIssues:
        """Check if all required fields are present"""

# spatial_analyzer.py
class SpatialAnalyzer:
    def find_overlapping_entities(self, bbox: BoundingBox, entities: List) -> List:
        """Find entities whose bboxes overlap with given bbox"""

    def compute_iou(self, bbox1: BoundingBox, bbox2: BoundingBox) -> float:
        """Compute intersection-over-union for two bboxes"""

# link_validator.py
class LinkValidator:
    def validate_link_types(self, source: Entity, target: Entity, rel_type: str) -> bool:
        """Ensure relationship type is valid for given entity types"""

    def check_duplicate_link(self, link: Link, existing: List[Link]) -> bool:
        """Prevent duplicate relationships"""
```

**When to Use Domain Services:**
- Logic involves multiple entities
- Validation rules that apply across entity types
- Spatial/geometric operations
- Business rules that aren't tied to a single entity

---

### 2️⃣ **Application Layer** (`backend/app/use_cases/`)

**Purpose:** Orchestrate business operations. This is where the **unified path** lives - both UI and AI use these.

#### **Use Case Structure**

Every use case follows this pattern:

```python
class CreateEntityUseCase:
    def __init__(
        self,
        entity_repo: IEntityRepository,
        validator: EntityValidator
    ):
        self.entity_repo = entity_repo
        self.validator = validator

    def execute(self, project_id: str, entity_data: dict) -> EntityUnion:
        # 1. Validate input
        validation = self.validator.validate_entity_completeness(entity_data)
        if not validation.is_valid:
            raise ValidationError(validation.issues)

        # 2. Business logic
        entity = self._create_entity_from_data(entity_data)

        # 3. Persist
        self.entity_repo.save(project_id, entity)

        # 4. Return result
        return entity
```

#### **Key Use Cases**

**Entities:**
- `CreateEntityUseCase`: Create any entity type (Drawing, Scope, SymbolInstance, etc.)
- `ListEntitiesUseCase`: Query entities with filters
- `UpdateEntityUseCase`: Modify existing entity
- `DeleteEntityUseCase`: Remove entity + cascade delete links

**Concepts:**
- `CreateConceptUseCase`: Create conceptual entities (Scope, Space, Material)
- `UpdateConceptUseCase`: Modify concept properties
- `DeleteConceptUseCase`: Remove concept + cleanup

**Links:**
- `CreateLinkUseCase`: Create relationships between entities
- `DeleteLinkUseCase`: Remove relationship

**Future AI Use Cases:**
- `DetectEntitiesUseCase`: Run AI detection pipeline
- `ExtractTextFromOCRUseCase`: Parse OCR for entity prefill
- `SuggestLinksUseCase`: AI-suggested relationships

#### **Why This Matters**

```python
# ✅ SAME PATH for manual and AI creation:

# From UI:
create_entity = CreateEntityUseCase(repo, validator)
entity = create_entity.execute(project_id, {
    "entity_type": "drawing",
    "source_sheet_number": "A2.1",
    "bounding_box": user_drawn_bbox,
    "drawing_type": "floor_plan"
})

# From AI pipeline:
ai_detections = vision_model.detect_drawings(page_image)
for detection in ai_detections:
    entity = create_entity.execute(project_id, {
        "entity_type": "drawing",
        "source_sheet_number": "A2.1",
        "bounding_box": detection.bbox,  # From AI
        "drawing_type": detection.classification
    })
```

Both paths use identical validation, persistence, and business logic!

---

### 3️⃣ **Infrastructure Layer** (`backend/app/repositories/`, `app/services/`)

**Purpose:** Interface with external systems (file system, databases, APIs).

#### **Repository Pattern** (`repositories/`)

Abstracts data persistence.

```python
# Interface (defined in domain/infrastructure boundary)
class IEntityRepository(ABC):
    @abstractmethod
    def save(self, project_id: str, entity: EntityUnion) -> None: ...

    @abstractmethod
    def find_by_id(self, project_id: str, entity_id: str) -> Optional[EntityUnion]: ...

    @abstractmethod
    def list_all(self, project_id: str, filters: dict) -> List[EntityUnion]: ...

    @abstractmethod
    def delete(self, project_id: str, entity_id: str) -> None: ...

# Implementation (file-based, can be swapped for Neo4j later)
class FileEntityRepository(IEntityRepository):
    def __init__(self, storage: FileStorage):
        self.storage = storage

    def save(self, project_id: str, entity: EntityUnion) -> None:
        entities = self.storage.load_entities(project_id)
        entities[entity.id] = entity.dict()
        self.storage.save_entities(project_id, entities)
```

**Current Repositories:**
- `FileEntityRepository`: Visual entities (`entities.json`)
- `FileConceptRepository`: Conceptual entities (stored in `entities.json` with type flag)
- `FileLinkRepository`: Relationships (`links.json`)
- `FileProjectRepository`: Project metadata (`manifest.json`)

**Future:**
- `Neo4jEntityRepository`: Graph database implementation
- `PostgresEntityRepository`: Relational database

#### **AI Services** (`services/ai/`)

Interfaces for AI/ML operations.

```python
# ocr_service.py
class IOCRService(ABC):
    @abstractmethod
    def extract_text_blocks(self, page_image: bytes) -> List[TextBlock]: ...

# visual_service.py
class IVisualDetectionService(ABC):
    @abstractmethod
    def detect_drawings(self, page_image: bytes) -> List[Detection]: ...

    @abstractmethod
    def detect_symbols(self, region: bytes) -> List[SymbolDetection]: ...
```

**Current:** Stubs defined, implementation TODO  
**Future:** OpenAI Vision, Azure CV, custom models

---

### 4️⃣ **Presentation Layer** (`backend/app/api/`, `frontend/src/`)

#### **Backend API** (`app/api/`)

FastAPI routes with dependency injection.

```python
# routes/entities.py
@router.post("/{project_id}/entities", response_model=EntityUnion)
async def create_entity(
    project_id: str,
    entity_data: Dict[str, Any],
    use_case: CreateEntityUseCase = Depends(get_create_entity_use_case)
):
    """Create a new entity (manual or AI-driven - same path!)"""
    return use_case.execute(project_id, entity_data)
```

**Dependency Injection** (`api/dependencies.py`):

```python
@lru_cache()
def get_settings() -> Settings:
    return Settings()

@lru_cache()
def get_entity_validator() -> EntityValidator:
    return EntityValidator()

def get_entity_repository() -> IEntityRepository:
    return FileEntityRepository(FileStorage(get_settings()))

def get_create_entity_use_case(
    repo: IEntityRepository = Depends(get_entity_repository),
    validator: EntityValidator = Depends(get_entity_validator)
) -> CreateEntityUseCase:
    return CreateEntityUseCase(repo, validator)
```

**Benefits:**
- Easy to mock for testing
- Swap implementations without changing routes
- Clear dependency graph

#### **Frontend Architecture**

**State Management** (`frontend/src/state/`):
- `ui_v2.ts`: Canvas interaction state (drawing mode, context menus, forms)
- `project.ts`: Current project, sheets, entities
- `canvas.ts`: Viewport, zoom, pan state

**API Layer** (`frontend/src/api/`):
- `entities.ts`: Entity CRUD operations
- `concepts.ts`: Concept operations
- `links.ts`: Relationship operations

**Components** (`frontend/src/ui_v2/`):
- Canvas overlay system for entity rendering
- Context menus and inline forms
- OCR picker for AI-assisted creation

---

## Data Flow

### Example: Creating a Drawing Entity

```
┌─────────────┐
│  User draws │
│  bbox on    │
│  canvas     │
└──────┬──────┘
       │ 1. Mouse events
       ▼
┌─────────────────────┐
│ Canvas Component    │
│ (React)             │
└──────┬──────────────┘
       │ 2. Convert viewport→PDF coords
       ▼
┌─────────────────────┐
│ Zustand Store       │
│ (ui_v2.ts)          │
└──────┬──────────────┘
       │ 3. POST /api/projects/{id}/entities
       ▼
┌─────────────────────┐
│ FastAPI Route       │
│ (entities.py)       │
└──────┬──────────────┘
       │ 4. Inject CreateEntityUseCase
       ▼
┌─────────────────────┐
│ CreateEntityUseCase │
│ (use_cases/)        │
└──────┬──────────────┘
       │ 5. Validate bbox, check completeness
       ▼
┌─────────────────────┐
│ EntityValidator     │
│ (domain/services/)  │
└──────┬──────────────┘
       │ 6. Save entity
       ▼
┌─────────────────────┐
│ FileEntityRepo      │
│ (repositories/)     │
└──────┬──────────────┘
       │ 7. Write to entities.json
       ▼
┌─────────────────────┐
│ File System         │
│ projects/{id}/      │
└─────────────────────┘
```

### Example: AI-Driven Entity Detection

```
┌─────────────┐
│ User clicks │
│ "AI Detect" │
└──────┬──────┘
       │
       ▼
┌────────────────────────┐
│ DetectEntitiesUseCase  │ ← SAME USE CASE!
└──────┬─────────────────┘
       │
       │ 1. Load page image
       ▼
┌─────────────────────┐
│ VisionModelClient   │
│ (services/ai/)      │
└──────┬──────────────┘
       │ 2. Get detections
       ▼
┌─────────────────────┐
│ For each detection: │
│ CreateEntityUseCase │ ← SAME PATH as manual!
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ EntityValidator     │
│ (same validation!)  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ FileEntityRepo      │
│ (same persistence!) │
└─────────────────────┘
```

**Key Insight:** AI and manual paths converge at the use case layer!

---

## Backend Architecture

### Directory Structure

```
backend/app/
├── main.py                    # FastAPI app entry point
├── config.py                  # Settings (env vars)
├── coords.py                  # Coordinate transform helpers
├── ingest.py                  # PDF ingestion pipeline
│
├── domain/
│   ├── models/
│   │   ├── value_objects.py   # BoundingBox, etc.
│   │   ├── entities.py        # Visual entities
│   │   ├── concepts.py        # Conceptual entities
│   │   └── relationships.py   # Link models
│   └── services/
│       ├── entity_validator.py
│       ├── link_validator.py
│       └── spatial_analyzer.py
│
├── use_cases/
│   ├── entities/
│   │   ├── create_entity.py
│   │   ├── list_entities.py
│   │   ├── update_entity.py
│   │   └── delete_entity.py
│   ├── concepts/
│   │   ├── create_concept.py
│   │   ├── update_concept.py
│   │   └── delete_concept.py
│   └── links/
│       ├── create_link.py
│       └── delete_link.py
│
├── repositories/
│   ├── entity_repository.py       # IEntityRepository interface
│   ├── concept_repository.py      # IConceptRepository interface
│   ├── link_repository.py         # ILinkRepository interface
│   ├── project_repository.py      # IProjectRepository interface
│   └── implementations/
│       ├── file_entity_repo.py
│       ├── file_concept_repo.py
│       ├── file_link_repo.py
│       └── file_project_repo.py
│
├── services/
│   ├── ai/
│   │   ├── base.py                # AI service base classes
│   │   ├── ocr_service.py         # OCR interface
│   │   └── visual_service.py      # Vision model interface
│   └── storage/
│       └── file_storage.py        # JSON file I/O
│
└── api/
    ├── dependencies.py            # DI container
    └── routes/
        ├── entities.py
        ├── concepts.py
        ├── links.py
        └── projects.py
```

### Key Files Explained

#### **`main.py`**
- FastAPI app initialization
- CORS middleware
- Router registration
- Health check endpoint

#### **`config.py`**
- Environment variable loading
- Settings for DPI, AI endpoints, storage paths
- Uses dataclass (not Pydantic v2 BaseSettings to avoid dependency)

#### **`coords.py`**
- **Critical:** Coordinate transformation between PDF and canvas space
- `pdf_to_canvas()`, `canvas_to_pdf()`
- Handles rotation (0°, 90°, 180°, 270°)
- **Mirror in frontend:** `frontend/src/utils/coords.ts`

#### **`ingest.py`**
- PDF upload and processing pipeline
- Renders pages to PNG at 300 DPI
- Runs PyMuPDF OCR (`page.get_text('dict')`)
- Creates manifest.json

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── main.tsx                   # App entry point
├── pages/
│   └── ProjectPage.tsx        # Main three-pane workspace
│
├── state/
│   ├── ui_v2.ts               # Canvas interaction state
│   ├── project.ts             # Project/entities state
│   └── canvas.ts              # Viewport state
│
├── api/
│   ├── entities.ts            # Entity API calls
│   ├── concepts.ts            # Concept API calls
│   └── links.ts               # Link API calls
│
├── ui_v2/
│   ├── OverlayLayer.tsx       # Main overlay coordinator
│   ├── canvas/
│   │   ├── BBox.tsx           # Bounding box renderer
│   │   └── EntityTag.tsx      # Entity labels
│   ├── menus/
│   │   ├── ContextPicker.tsx  # Entity type picker
│   │   └── EntityMenu.tsx     # Right-click menu
│   ├── forms/
│   │   └── InlineEntityForm.tsx # Canvas-based entity editor
│   ├── overlays/
│   │   └── OCRPicker.tsx      # OCR text selection overlay
│   └── linking/
│       └── ChipsTray.tsx      # Link relationship builder
│
├── ui_primitives/
│   └── ...                    # Vendored Radix primitives
│
└── utils/
    ├── coords.ts              # Coordinate transforms (mirrors backend)
    └── ...
```

### State Management (Zustand)

#### **`ui_v2.ts`** - Canvas Interaction State

```typescript
interface UIV2State {
  mode: 'view' | 'draw' | 'link';
  contextMenu: { x: number; y: number; type?: string } | null;
  inlineForm: { entityId?: string; bbox?: BBox; type?: string } | null;
  linking: {
    sourceId: string | null;
    pendingTargets: string[];
  };
  hover: { entityId: string } | null;

  // Actions
  setMode: (mode) => void;
  openContext: (x, y, type?) => void;
  openForm: (entityId?, bbox?, type?) => void;
  startLinking: (sourceId) => void;
  finishLinking: () => void;
}
```

#### **`project.ts`** - Data State

```typescript
interface ProjectState {
  currentProject: Project | null;
  currentSheet: number;
  entities: EntityUnion[];
  links: Link[];

  // Actions
  setCurrentProject: (project) => void;
  setCurrentSheet: (sheet) => void;
  fetchEntities: (projectId) => Promise<void>;
  createEntity: (entity) => Promise<EntityUnion>;
  updateEntity: (id, updates) => Promise<void>;
}
```

### Coordinate System

**Critical invariant:** All entity `bounding_box` values are persisted in **unrotated PDF point space**.

#### **PDF Space** (Backend, Persistence)
- Origin: Top-left corner of unrotated page
- Units: Points (72 points = 1 inch)
- Y-axis: Increases downward
- Rotation: Always stored unrotated (0°)

#### **Canvas Space** (Frontend, Display)
- Origin: Top-left of canvas element
- Units: CSS pixels
- Scale factor: Depends on zoom level
- Rotation: Applied via CSS transform

#### **Conversion** (See `coords.ts` and `coords.py`)

```typescript
// Frontend: PDF → Canvas
function pdfToCanvas(pdfBox: BBox, pageRect: Rect, canvasRect: Rect, rotation: number): BBox {
  // 1. Apply rotation to PDF box (around page center)
  // 2. Scale to canvas dimensions
  // 3. Return canvas-space box
}

// Frontend: Canvas → PDF
function canvasToPdf(canvasBox: BBox, pageRect: Rect, canvasRect: Rect, rotation: number): BBox {
  // Inverse of above
}
```

**Critical:** These functions are **mirrored** in backend and frontend. Tests verify roundtrip accuracy.

---

## Testing Strategy

### Backend Tests (`backend/tests/`)

#### **Unit Tests**
- `test_coords.py`: Coordinate transform roundtrips, rotation handling
- `test_domain_services/`: Validator logic, spatial analysis

#### **Integration Tests**
- `test_entities_instances.py`: Full entity CRUD via API
- `test_concepts_links.py`: Concept + link creation
- `test_ingest.py`: PDF processing pipeline

#### **Fixtures** (`conftest.py`)
- `test_env`: Temp directory, mocked settings
- `test_app`: FastAPI TestClient with DI
- `create_test_project`: Simulated PDF ingestion

### Frontend Tests (`frontend/src/utils/__tests__/`)

- `coords.test.ts`: Coordinate transform accuracy
- `ui_v2.test.ts`: Zustand reducer logic (TODO)
- `linking.test.ts`: Link flow state machines (TODO)

### Test Coverage Goals

- **Domain Services:** 95%+ (pure logic, easy to test)
- **Use Cases:** 80%+ (mock repositories)
- **Repositories:** 70%+ (integration tests with temp files)
- **API Routes:** 70%+ (E2E with TestClient)

---

## AI Integration Points

### Current State: Interfaces Defined, Implementations TODO

#### **1. OCR-Based Detection** (Easiest)

```python
# services/ai/ocr_service.py
class PyMuPDFOCRService(IOCRService):
    def extract_text_blocks(self, project_id: str, page_num: int) -> List[TextBlock]:
        """Parse existing OCR JSON, return structured blocks"""
        # Implementation: Load ocr/{page_num}.json, parse text blocks

# use_cases/ai/detect_text_entities.py
class DetectTextEntitiesUseCase:
    def __init__(self, ocr_service: IOCRService, entity_repo: IEntityRepository):
        self.ocr = ocr_service
        self.repo = entity_repo

    def execute(self, project_id: str, page_num: int, entity_type: str):
        """Find Notes, Legends, Schedules from OCR"""
        blocks = self.ocr.extract_text_blocks(project_id, page_num)

        # Heuristics: Large blocks = notes, tabular = schedules, etc.
        for block in blocks:
            if self._is_note_block(block):
                entity = Note(
                    source_sheet_number=f"{page_num}",
                    bounding_box=block.bbox,
                    text_content=block.text,
                    note_type="general"
                )
                self.repo.save(project_id, entity)
```

#### **2. Vision Model Detection** (Hard, Stub Ready)

```python
# services/ai/visual_service.py (interface)
class IVisionModelClient(ABC):
    @abstractmethod
    def detect_drawings(self, image_path: str) -> List[Detection]: ...

    @abstractmethod
    def detect_symbols(self, image_path: str, region: BBox) -> List[Detection]: ...

# Future implementation:
class OpenAIVisionClient(IVisionModelClient):
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key)

    def detect_drawings(self, image_path: str) -> List[Detection]:
        # Call GPT-4 Vision, parse response
        response = self.client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Detect all drawings in this construction sheet. Return JSON with bboxes and types."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_path}"}}
                ]
            }]
        )
        # Parse and return
```

#### **3. Unified Detection Use Case**

```python
# use_cases/ai/detect_entities.py
class DetectEntitiesUseCase:
    def __init__(
        self,
        vision: IVisionModelClient,
        ocr: IOCRService,
        entity_repo: IEntityRepository,
        create_entity: CreateEntityUseCase
    ):
        self.vision = vision
        self.ocr = ocr
        self.create_entity = create_entity

    def execute(self, project_id: str, page_num: int, entity_types: List[str]):
        """Run AI detection for specified entity types"""

        if "drawing" in entity_types:
            detections = self.vision.detect_drawings(page_image_path)
            for det in detections:
                # Use same CreateEntityUseCase as manual flow!
                self.create_entity.execute(project_id, {
                    "entity_type": "drawing",
                    "source_sheet_number": f"{page_num}",
                    "bounding_box": det.bbox,
                    "drawing_type": det.classification
                })

        if "note" in entity_types:
            blocks = self.ocr.extract_text_blocks(project_id, page_num)
            # ... similar pattern
```

**Key Point:** AI detection uses `CreateEntityUseCase` - **the exact same path as manual creation!**

---

## Common Patterns

### Pattern 1: Adding a New Entity Type

1. **Add Pydantic model** (`domain/models/entities.py`):
   ```python
   class NewEntity(DocumentEntity):
       entity_type: Literal["new_entity"]
       custom_field: str
   ```

2. **Add to union type**:
   ```python
   EntityUnion = Union[Drawing, Legend, ..., NewEntity]
   ```

3. **Update validator** (`domain/services/entity_validator.py`):
   ```python
   def validate_new_entity(self, entity: NewEntity) -> ValidationResult:
       # Custom validation logic
   ```

4. **Frontend API types** (`frontend/src/api/entities.ts`):
   ```typescript
   interface NewEntity extends DocumentEntity {
     entity_type: 'new_entity';
     customField: string;
   }
   ```

5. **Frontend form** (`frontend/src/ui_v2/forms/InlineEntityForm.tsx`):
   ```typescript
   if (entityType === 'new_entity') {
     return <NewEntityForm ... />
   }
   ```

6. **Add tests!**

### Pattern 2: Adding a New Repository Implementation

1. **Define interface** (if not exists):
   ```python
   class ICustomRepository(ABC):
       @abstractmethod
       def custom_method(self, ...): ...
   ```

2. **Create implementation**:
   ```python
   class Neo4jCustomRepository(ICustomRepository):
       def custom_method(self, ...):
           # Neo4j Cypher queries
   ```

3. **Update DI** (`api/dependencies.py`):
   ```python
   def get_custom_repository() -> ICustomRepository:
       if settings.use_neo4j:
           return Neo4jCustomRepository(neo4j_client)
       else:
           return FileCustomRepository(file_storage)
   ```

4. **Test with mocks**:
   ```python
   def test_use_case_with_mock_repo():
       mock_repo = Mock(spec=ICustomRepository)
       use_case = MyUseCase(mock_repo)
       # Test without real database
   ```

### Pattern 3: Adding an AI Detection Feature

1. **Define service interface** (`services/ai/`):
   ```python
   class IMyAIService(ABC):
       @abstractmethod
       def detect_something(self, image: bytes) -> List[Detection]: ...
   ```

2. **Create use case** (`use_cases/ai/`):
   ```python
   class DetectSomethingUseCase:
       def __init__(self, ai_service: IMyAIService, create_entity: CreateEntityUseCase):
           self.ai = ai_service
           self.create_entity = create_entity

       def execute(self, project_id: str, page_num: int):
           detections = self.ai.detect_something(page_image)
           for det in detections:
               # Reuse CreateEntityUseCase!
               self.create_entity.execute(project_id, det.to_entity_data())
   ```

3. **Wire up DI**:
   ```python
   def get_my_ai_service() -> IMyAIService:
       return OpenAIMyService(api_key=settings.openai_key)
   ```

4. **Add API endpoint**:
   ```python
   @router.post("/{project_id}/ai/detect-something")
   async def detect_something(
       project_id: str,
       page_num: int,
       use_case: DetectSomethingUseCase = Depends(get_detect_something_use_case)
   ):
       return use_case.execute(project_id, page_num)
   ```

5. **Frontend button**:
   ```typescript
   <Button onClick={() => api.detectSomething(projectId, pageNum)}>
     AI Detect
   </Button>
   ```

---

## Migration Paths

### From File Storage to Neo4j

1. **Create Neo4j implementations**:
   ```python
   class Neo4jEntityRepository(IEntityRepository):
       def __init__(self, driver: neo4j.Driver):
           self.driver = driver

       def save(self, project_id: str, entity: EntityUnion):
           with self.driver.session() as session:
               session.run(
                   "MERGE (e:Entity {id: $id}) SET e += $props",
                   id=entity.id, props=entity.dict()
               )
   ```

2. **Update DI to use feature flag**:
   ```python
   def get_entity_repository() -> IEntityRepository:
       if settings.use_neo4j:
           return Neo4jEntityRepository(neo4j_driver)
       else:
           return FileEntityRepository(file_storage)
   ```

3. **Write migration script**:
   ```python
   # migrate_to_neo4j.py
   file_repo = FileEntityRepository(...)
   neo4j_repo = Neo4jEntityRepository(...)

   for project_id in file_repo.list_projects():
       entities = file_repo.list_all(project_id)
       for entity in entities:
           neo4j_repo.save(project_id, entity)
   ```

4. **Zero code changes in use cases or API routes!**

---

## Troubleshooting

### Common Issues

#### **1. "Pydantic import error: BaseSettings"**

**Cause:** Pydantic v2 moved `BaseSettings` to separate package.  
**Fix:** We use `dataclass` in `config.py` to avoid this.

#### **2. "FastAPI: Invalid args for response field"**

**Cause:** Repository interface type hints in route function signatures.  
**Fix:** Always use `Depends()` for injected dependencies:

```python
# ❌ BAD
async def my_route(repo: IEntityRepository):
    ...

# ✅ GOOD
async def my_route(repo: IEntityRepository = Depends(get_entity_repository)):
    ...
```

#### **3. Coordinate mismatch between frontend and backend**

**Cause:** Different rotation handling or missing scale factor.  
**Fix:** Check `coords.py` and `coords.ts` tests. Ensure both use same formulas.

#### **4. Entities not loading in tests**

**Cause:** Test environment not setting `TIMBERGEM_PROJECTS_DIR`.  
**Fix:** Use `test_env` fixture, which sets env vars and clears DI caches:

```python
def test_my_feature(test_env, test_app):
    # test_env ensures correct paths
    response = test_app.post("/api/projects/test/entities", json=...)
```

---

## Summary

TimberGem's Clean Architecture provides:

✅ **Separation of Concerns:** Domain logic independent of frameworks  
✅ **Testability:** Every layer tested in isolation  
✅ **Flexibility:** Swap implementations (file → Neo4j) without changing business logic  
✅ **Unified Path:** Manual and AI workflows use identical use cases  
✅ **Traceability:** Every entity anchored to source document with PDF coordinates  

**Key Files to Remember:**
- `backend/app/main.py` - Entry point
- `backend/app/api/dependencies.py` - DI wiring
- `backend/app/use_cases/` - Business logic (THE CORE)
- `backend/app/domain/models/` - Data contracts
- `frontend/src/state/ui_v2.ts` - Canvas interaction state
- `frontend/src/utils/coords.ts` - Coordinate transforms

**Next Steps:**
1. Implement OCR-based detection use cases
2. Add vision model stubs with provider options
3. Expand test coverage to 80%+
4. Create migration guide for Neo4j

---

**Questions? Check the code!** This architecture is self-documenting through type hints and clear naming.

