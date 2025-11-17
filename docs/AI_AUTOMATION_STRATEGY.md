# AI Automation Strategy for TimberGem (Nov 2025)

## 1. Executive Summary
- TimberGem’s manual-first canvas now captures every entity, link, and validation in canonical PDF space; the next evolution is to let automation draft the knowledge graph (KG) while keeping humans in control.
- This report aligns the existing Clean Architecture with six AI/automation thrusts (top-down text, bottom-up vision, legend/schedule parsing, cross-modal linking, discrepancy detection, and KG chat) plus the upcoming measurement workflow.
- It inventories current assets, identifies upgrade seams, compares orchestration/model options, and lays out phased delivery with observability and evaluation baked in.
- Companion placeholders have been added in `backend/app/use_cases/ai/` to anchor upcoming pipelines; this document is the living north star for design reviews and implementation planning.

## 2. Current System Snapshot

### 2.1 Domain + use cases already unify manual & AI flows
- All page-anchored or spatial entities persist `status`/`validation`, making them natural checkpoints for AI/HITL review.

```16:25:backend/app/domain/models/entities.py
class BaseVisualEntity(BaseModel):
    id: str = Field(..., description="Server-assigned unique id")
    entity_type: str
    source_sheet_number: int = Field(..., ge=1)
    bounding_box: BoundingBox
    status: Optional[StatusLiteral] = None
    validation: Optional[ValidationInfo] = None
```

- `CreateEntityUseCase` already enforces validation, auto-linking, and persistence; AI pipelines can (and must) keep calling this entrypoint.

```33:45:backend/app/use_cases/entities/create_entity.py
class CreateEntityUseCase:
    def __init__(self, entity_repo: IEntityRepository, validator: EntityValidator, spatial_analyzer: SpatialAnalyzer):
        self.entity_repo = entity_repo
        self.validator = validator
        self.spatial_analyzer = spatial_analyzer
```

```59:85:backend/app/use_cases/entities/create_entity.py
    def execute(self, project_id: str, payload: CreateEntityUnion) -> EntityUnion:
        self.validator.validate_create(payload)
        sheet_num = getattr(payload, "source_sheet_number", None)
        existing = self.entity_repo.find_by_sheet(project_id, sheet_num) if sheet_num else []
        entity = self._build_entity(project_id, payload, existing)
        return self.entity_repo.save(project_id, entity)
```

### 2.2 Frontend UX already models HITL controls
- The Zustand store tracks drawing/linking/OCR states, so AI proposals can surface as pending forms or inline annotations without skipping manual review.

```111:133:frontend/src/state/ui_v2.ts
const initialState: Omit<UIState, keyof UIActions> = {
  mode: 'select',
  contextMenu: { open: false, at: null, target: undefined },
  inlineForm: { open: false, type: null, at: null, pendingBBox: null, entityId: undefined, initialValues: null, mode: 'create', minimized: false },
  drawing: { active: false, entityType: null },
  ocrPicker: { open: false },
  ocrSelectionMode: { active: false, selectedBlocks: [], targetField: 'recognizedText' },
  linking: { active: false, source: undefined, pending: [] },
};
setMode: (mode) => {
  const { linking } = get();
  set({
    mode,
    linking: mode === 'link' ? linking : { active: false, source: undefined, pending: [] },
  });
},
```

### 2.3 Coordinate invariants enable reliable conversions (when needed)
- `coords.py` mirrors the frontend helper and clamps PDF-space boxes with epsilon tolerances—critical once we ground semantic entities; however, PRD feedback lets us defer precise boxes until a specialized model or a human supplies them.

```59:105:backend/app/coords.py
def canvas_to_pdf(box: Sequence[float], meta: RenderMeta, dpr: float = 1.0) -> NumberBox:
    cx1, cy1, cx2, cy2 = _normalize_box(box)
    if meta.rotation not in (0, 90, 180, 270):
        raise ValueError("Unsupported rotation")
    ...
    pdf_box = _normalize_box((px1, py1, px2, py2))
    return _clamp_pdf_box(pdf_box, meta)
```

```102:135:backend/app/coords.py
def pdf_to_canvas(box: Sequence[float], meta: RenderMeta, dpr: float = 1.0) -> NumberBox:
    px1, py1, px2, py2 = _normalize_box(box)
    clamped = _clamp_pdf_box((px1, py1, px2, py2), meta)
    ...
    cx1, cy1 = rotate(ux1, uy1)
    cx2, cy2 = rotate(ux2, uy2)
    return _normalize_box((cx1, cy1, cx2, cy2))
```

### 2.4 AI extension seams already exist
- AI services are abstracted via `IAIDetectionService` + `IVisualDetectionService`; implementations can remain swappable (OpenAI, Florence-2, YOLO, custom weights, etc).

```23:55:backend/app/services/ai/base.py
class IAIDetectionService(ABC):
    @abstractmethod
    def detect(self, project_id: str, sheet_number: int, entity_type: str, context: DetectionContext) -> List[CreateEntityUnion]:
        ...
    @abstractmethod
    def supported_types(self) -> List[str]:
        ...
```

```95:161:backend/app/services/ai/visual_service.py
class IVisualDetectionService(ABC):
    @abstractmethod
    def detect_drawings(self, project_id: str, sheet_number: int, confidence_threshold: float = 0.7) -> List[Dict[str, Any]]:
        ...
    @abstractmethod
    def detect_symbols(self, project_id: str, sheet_number: int, drawing_id: str | None = None, confidence_threshold: float = 0.7) -> List[Dict[str, Any]]:
        ...
```

## 3. Automation Objectives by Workstream
| # | Workstream | Automation intent | Current assets | Immediate next step |
|---|------------|-------------------|----------------|---------------------|
| 1 | Top-down scopes | Convert OCR text into scopes/notes/assemblies with LLM reasoning + heuristics | PyMuPDF OCR JSON, `IOCRService`, `CreateEntityUseCase` | Define scope-suggestion strategy that can emit page-scoped entities with optional bbox placeholders |
| 2 | Bottom-up symbols | Detect/categorize repeated symbols via CV + embeddings | `IVisualDetectionService`, raster PNGs, bbox transforms | Stand up Colab notebook for multi-scale symbol detection prototypes |
| 3 | Legends/schedules/assemblies | Parse tabular/clustered layouts into structured KG nodes | Existing entity models + validator | Extend OCR parser to capture block geometry + run LayoutLM/Table Transformer experiments |
| 4 | Visual↔text linking | Link scopes, notes, symbols, drawings via spatial + semantic cues | Spatial analyzer, link models, bounding boxes | Prototype CLIP-style embedding matcher feeding `CreateLinkUseCase` |
| 5 | Discrepancy detection | Multi-agent reasoning to flag missing/duplicate/irrelevant items | Unified repositories, validator, future AI tool-calls | Introduce LangGraph workflow that queries repositories via tool abstractions |
| 6 | KG copilot chat | Conversational RAG over structured graph + raster snippets | REST APIs, planned LangGraph/LlamaIndex stack | Define retrieval schema + UI entry point for context-rich answers |
| 7 | Measurement readiness | Support linear/area/eaches with scale calibration + annotations | Bounding-box schema, canvas tooling (pending) | Reserve schema slots + evaluate scale-detection models and CAD-friendly UI affordances |

## 4. Target AI System Architecture
1. **Asset & feature layer** – extend ingestion to emit: (a) OCR blocks with typography metadata, (b) multi-scale raster tiles, (c) derived embeddings (stored alongside `projects/{id}` or a vector DB).  
2. **AI service layer** – concrete implementations of `IOCRService`, `IVisualDetectionService`, and new strategy interfaces (scope suggestion, symbol clustering, legend parsers).  
3. **Use-case layer** – new `backend/app/use_cases/ai/` module (created with stubs in this PR) orchestrates services + existing create/update/list flows.  
4. **Agent/workflow layer** – LangGraph/LlamaIndex (see §5) wraps use cases as tools, maintains memory/state, and exposes trace IDs for observability.  
5. **UX layer** – UI V2 surfaces proposals as inline forms, toasts, and chips; chat mode consumes the agent API and displays mixed text/image evidence. When an entity lacks a bounding box, the UI shows a “Needs grounding” badge and lets humans draw/assign a box later.

## 5. Page-Scoped vs Bounded Entities
The new requirement is to **de-emphasize mandatory bounding boxes** for semantic containers (Legends, Schedules, AssemblyGroups, etc.) so LLMs can describe a page holistically even if region segmentation is imperfect.

| Entity type | Current behavior | Proposed adjustment | Rationale |
|-------------|------------------|---------------------|-----------|
| `Legend`, `Schedule`, `AssemblyGroup`, `Note` | Inherit `BaseVisualEntity` → bbox required | Introduce `PageAnchoredEntity` base that requires `source_sheet_number` but allows `bounding_box: Optional[BoundingBox]`. Update validators + repos accordingly. | Allows LLM-only parsing (page scope) while still referencing the sheet. Bounding boxes can be filled later by specialized models or human edits. |
| `Scope`, `ScopeSlice` (future) | Already optional bbox | No change | Scopes may remain conceptual until grounded. |
| `Drawing` | Must have bbox (needed for downstream spatial queries) | Keep requirement, but allow placeholder “approximate region” flag so UI can prompt for corrections. | Drawings define the coordinate frame for symbol placement. |
| `SymbolDefinition` | bbox required | Allow optional page-scoped definition when a user seeds a symbol via legend text only; once a crop is provided, `bounding_box` becomes required. | Enables quick text-based definition creation while still nudging toward visual grounding. |

Implementation steps:
1. Add `PageAnchoredEntity` + `CreatePageAnchoredEntityBase` in `backend/app/domain/models/entities.py`.
2. Update `CreateEntityUseCase` validator to skip bbox normalization if payload inherits from the new base and no bbox is supplied.
3. Extend UI forms to show separate “Page scope” vs “Region scope” states and capture bounding boxes later via inline actions (“Add bounding box” button).
4. Add `validation.missing.bounding_box = true` when an entity is page-scoped; this flows into the review queue so humans (or a later model) can ground it.

This approach lets LLM agents execute PRD §2.2 using page-wide structured output (JSON/Markdown) without relying on brittle layout boxes, while keeping the door open for precise region detection services when confidence improves.

## 6. Framework & Infrastructure Options

### 5.1 Agent & workflow frameworks
| Framework | Primary value | Strengths | Trade-offs | Recommendation |
|-----------|---------------|-----------|------------|----------------|
| LangGraph [R1] | Stateful, graph-defined agents with first-class tool-calling | Deterministic control flow, streaming, integrates with LangSmith | Requires LangChain stack; newest features still evolving | Use as default orchestrator for feature-complete pipelines |
| LlamaIndex (w/ Observability + LlamaParse) [R2] | Data connectors + retrieval + evaluation dashboards | Built-in KG + vector indices, multimodal RAG, eval suites | Less prescriptive agent graphing; Python-first | Pair with LangGraph for retrieval + eval; fallback orchestrator for quick notebooks |
| AutoGen [R3] | Multi-agent conversation framework | Rich agent roles, cross-language tool-calling, strong research backing | Opinionated event loop; heavier to embed in prod API | Use for experimentation (e.g., discrepancy detection) before porting to LangGraph |
| CrewAI [R4] | Lightweight role-based agents | Fast prototyping, minimal boilerplate, not tied to LangChain | Limited streaming/tooling; smaller ecosystem | Use for hacky prototypes or user studies |

### 5.2 Retrieval & storage
- Continue storing canonical truth in file repositories (per Clean Architecture) while layering an **optional vector store** for embeddings: Milvus for scale-out clusters [R5] or LanceDB for serverless/desktop experiments [R6].  
- Neo4j (already planned) can remain the KG-of-record; AI pipelines should write through use cases so both JSON and graph stores stay in sync.

### 5.3 Observability & evaluation
- **LangSmith** for agent/event tracing, dataset curation, and regression tests [R7].  
- **LlamaIndex Observability** for retrieval diagnostics and latency/quality dashboards [R2].  
- **Arize Phoenix** as an open-source LLM evaluation + drift monitor to avoid vendor lock-in [R8].  
- **Weights & Biases LLMOps** for experiment tracking + Colab integration during model tuning [R9].  
- Adopt OpenTelemetry spans (FastAPI already makes this straightforward) so traces from agents map back to REST calls and UI events.

## 7. Model & Capability Strategy

### 7.1 Top-down scope extraction (Workstream 1)
- **Pipeline**: reuse the PyMuPDF OCR artifacts via `IOCRService`, feed them into a Layout-aware encoder (LayoutLMv3 [R10]) + instruction-tuned LLM (e.g., Llama 3.1 Instruct, Mistral-Nemo) to propose scopes/notes, then map proposals to `CreateEntityUseCase`.  
- **Data strategy**: leverage existing OCR JSON and manual scopes as supervised pairs; create evaluation fixtures (sheet snippets + expected scopes) stored under `backend/tests/data/ai/scopes`.  
- **HITL**: proposals enter UI as incomplete entities with `status='incomplete'` and `validation.missing` flags (already supported by the schema).  
- **Deliverable**: `DetectScopesUseCase` (stubbed) calling a pluggable `ScopeSuggestionStrategy`.

### 7.2 Bottom-up symbol detection (Workstream 2)
- **Model options**: Ultralytics YOLOv8 for anchor-based detection [R11], Florence-2 for grounding + captioning of patches [R12], and Segment Anything 2 (SAM 2) for multi-scale masks [R13]. Combine YOLO for coarse symbol boxes + Florence-2 captions to propose symbol types.  
- **Workflow**: (1) tile each sheet into overlapping windows, (2) detect candidates, (3) convert pixel boxes → PDF via `coords.canvas_to_pdf`, (4) embed crops (CLIP) for de-dup clustering, (5) call `CreateEntityUseCase`.  
- **Dev environment**: heavy training happens in your Google Colab Pro seat; inference-friendly weights (quantized) run locally via ONNX or Apple ANE acceleration.  
- **Placeholder**: `DetectSymbolsUseCase` stub to orchestrate `IVisualDetectionService` + `CreateEntityUseCase`.

### 7.3 Legend / schedule / assembly parsing (Workstream 3)
- **Models**: LayoutLMv3 [R10] plus table-specific models like Microsoft Table Transformer/TATR [R14] to segment rows/columns; combine with regex heuristics for marks/codes.  
- **Implementation**: extend `IOCRService` to return block structure + baseline ordering; add a `legend_parser.py` strategy that outputs `CreateLegend`, `CreateLegendItem`, `CreateSchedule`, and `CreateScheduleItem` payloads.  
- **Testing**: create golden sheets with known legend counts; unit-test the parser before hooking to LLM summarizers.

### 7.4 Visual ↔ text linking (Workstream 4)
- **Semantic embeddings**: CLIP for image/text similarity [R15]; Qwen2.5-VL (7B) for multimodal reasoning including bounding boxes [R16].  
- **Linking logic**: (a) spatial proximity (existing `SpatialAnalyzer`), (b) embedding similarity threshold, (c) textual cues (“See detail 3/A5.1”).  
- **Use cases**: new `SuggestLinksUseCase` (future) will call `CreateLinkUseCase` after human approval.

### 7.5 Discrepancy detection (Workstream 5)
- **Agents**: LangGraph graph with specialized nodes—Legend Auditor, Symbol Coverage Checker, Cross-Sheet Reference Checker—each calling read-only repository tools.  
- **Signals**: compare counts (legend items vs symbol instances), detect orphaned references, flag missing drawings.  
- **Outcome**: actionable tasks in UI (Needs Attention list) plus structured reports for QA.

### 7.6 KG copilot chat (Workstream 6)
- **Architecture**: Retrieval-Augmented Generation combining (a) structured graph queries, (b) raster snippets (CLIP embeddings), (c) textual OCR spans. LlamaIndex offers hybrid KG + vector queries [R2].  
- **Models**: start with open Llama 3.1/3.2 instruct models; allow swapping to Qwen2.5-VL for multimodal responses.  
- **UX**: chat panel on right-hand side, each response includes cited snippets (image thumbnails + text). Provide “adopt suggestion” buttons that invoke existing use cases.

### 7.7 Measurement readiness (Future)
- **Scale capture**: detect explicit scale bars or derive from legend text using OCR + LLM reasoning.  
- **Geometry tools**: extend canvas to capture polylines/polygons; reuse `BoundingBox` + future `Measurement` value object.  
- **Models**: SAM 2 for boundary proposals [R13], YOLO line detectors for linear features.  
- **Plan**: keep measurement schema doc updated while AI teams focus on automation; integrate once scopes/symbols stable.

## 8. Human-in-the-loop (HITL) & UX integration
- Continue to mark AI-created entities as incomplete until a user confirms; leverage the existing store actions (`openForm`, `setMode`, `linking`) to insert review steps.  
- Provide diff views (original OCR vs AI interpretation) to accelerate trust.  
- Ensure every agent/tool call logs the acting user/agent for audit trails in `entities.json` and future Neo4j nodes.

## 9. Observability & Evaluation Plan
1. **Tracing**: wrap new AI use cases with tracing decorators that emit LangSmith + OpenTelemetry spans.  
2. **Dataset management**: curate “evaluation corpora” (sheet sets + expected entities) and run nightly LangGraph regression flows.  
3. **Metric tiers**: precision/recall for detections, acceptance rate (% of AI proposals accepted), time-to-approve per entity, copilot response groundedness.  
4. **Feedback loop**: store rejection reasons in `validation` fields so future fine-tuning can learn from human edits.

## 10. Phased Implementation Roadmap (subject to refinement)
| Phase | Scope | Key deliverables | Exit criteria |
|-------|-------|------------------|---------------|
| 0 – Repository prep (1 week) | Instrumentation + data plumbing | New `use_cases/ai` stubs, LangSmith project, Colab notebooks scaffold | Traces emitted for manual entity creation; sample OCR dataset exported |
| 1 – Top-down MVP (3 weeks) | Scope/Note suggestions | LayoutLM + LLM pipeline, UI inline approvals, evaluation harness | ≥70% precision on held-out sheets; UI shows review queue |
| 2 – Symbol lab (4 weeks, overlapping) | Symbol detection experiments | Colab training scripts, Florence/YOLO inference service, PDF bbox conversion | Demo detects ≥60% of target symbols on sample set |
| 3 – Legend/schedule + linking (4 weeks) | Structured parsing + auto-link suggestions | Legend parser, CLIP link scorer, `SuggestLinksUseCase` beta | Legends auto-filled with ≥80% accuracy on benchmark |
| 4 – Discrepancy agents + observability uplift (3 weeks) | LangGraph workflows + Phoenix dashboards | Consistency report endpoint, Phoenix experiment board | Pilot project processed with full trace + discrepancy log |
| 5 – Copilot chat + measurement preview (ongoing) | Conversational UX + scale groundwork | Chat UI, RAG backend, measurement schema proposal | Chat answers cite structured + visual evidence; measurement RFC approved |

## 11. Key Risks & Mitigations
- **Model drift / sheet diversity** – maintain labeled regression sets across disciplines (architectural, MEP, civil) and auto-run evaluation per commit.  
- **Performance on MacBook Pro** – quantize models, stream detections, and offload heavy training/inference to Colab or optional GPU runners; keep local fallback heuristics.  
- **User trust** – every automation must expose provenance (sheet, bbox, OCR snippet, model used) and default to opt-in (status stays incomplete).  
- **Vendor lock-in** – favor open weights (Llama, Qwen, Florence OSS variants) and self-hosted observability (Phoenix) even if commercial APIs are prototyped early.  
- **Measurement dependency** – ensure AI work does not assume measurement features exist; keep interfaces abstract so measurement can plug in later.

## 12. Multi-Modal Parsing Blueprint (from IMAGE_INTERPRETATION_ANALYSIS_PRD)
The PRD describes how estimators reason across drawings, legends, tables, and notes. The table below fuses that logic with our architecture so each stage has a concrete entry point in the codebase.

| Stage (PRD §2) | Goal | AI/Model assets | TimberGem hooks | Entity actions |
|---|---|---|---|---|
| 2.1 Ingestion & layout segmentation | Rasterise sheets, classify regions (drawings, legends, tables, notes) | DocLayNet-style layout model, sliding-window table detector [R17] | Extend `backend/app/ingest.py` to call a new `LayoutSegmentationService` behind `IOCRService`; emit region boxes into `projects/{id}/layout.json` | Call `CreateEntityUseCase` immediately to persist `Drawing`, `Legend`, `Schedule`, `AssemblyGroup`, `Note` with `status='incomplete'` |
| 2.2 Text extraction & classification | Parse notes, legends, schedules, assemblies into structured data | PyMuPDF OCR + LayoutLMv3 + table transformer + LLM prompts | Implement `ScopeSuggestionStrategy`, `LegendParser`, `ScheduleParser` under `backend/app/use_cases/ai/`; reuse `IOCRService.get_ocr` for line-level boxes | Create `Scope`, `LegendItem`, `ScheduleItem`, `Assembly` entities; set `parent_id` fields and `validation` hints |
| 2.3 Symbol family seeding | Let humans map legend glyphs to definitions | CLIP embeddings for crops stored as `SymbolFamily` records | Frontend: extend `ui_v2` forms to capture symbol crops + metadata; Backend: persist family embeddings under `projects/{id}/symbols/{family_id}.npz` and map to `SymbolDefinition` | `SymbolDefinition` already supports `defined_in_id`; attach embeddings + provenance |
| 2.4 Symbol candidate detection | Detect and label symbol instances bottom-up | YOLOv8 / Florence-2 / SAM2 for detection, CLIP for similarity, OCR for nearby labels | Implement `IVisualDetectionService.detect_symbols` calling the detector; plug results into `DetectSymbolsUseCase` with optional `SymbolPostProcessor` | After family match + label validation, call `CreateEntityUseCase` to persist `SymbolInstance` + link to definition/assembly |
| 2.5 Cross-modal linking & scope slicing | Connect notes ⇄ drawings ⇄ symbols ⇄ schedules; emit `ScopeSlice` summaries | SpatialAnalyzer, CLIP similarity, LLM reasoning for references | Build `LinkSuggestionStrategy` (leveraging `LinkContextsUseCase`) plus a new `ScopeSliceBuilder` domain service; store slices as new entity type or derived artifact | Invoke `CreateLinkUseCase` for validated relationships; when introducing `ScopeSlice`, extend domain models and repo schemas |
| 2.6 Discrepancy agents | Catch missing or inconsistent data | LangGraph agents (Legend Auditor, Coverage Checker, Reference Resolver) | Define LangGraph workflows that call read-only repositories/tools, log findings to `projects/{id}/reports/*.json`, surface via API | No automatic entity creation; instead raise tasks that users resolve via existing UI flows |
| 2.7 Chat & measurement | Expose KG via conversational RAG; prep measurement tooling | LlamaIndex hybrid retrieval, LangGraph agents, SAM2 for measurement hints | Backend API: `/chat` endpoint backed by LangGraph workflow; Frontend: chat panel consuming results; measurement stored as future `Measurement` value objects | Chat proposes but does not auto-create entities; measurement persists polylines with references to drawings/scopes |

### 12.1 Implementation notes per PRD stage
1. **Segmentation-first entity creation** – add a `LayoutSegmentationService` interface (mirroring `IOCRService`) so `backend/app/ingest.py` can persist region metadata before OCR. The segmentation output feeds directly into `CreateEntityUseCase`, ensuring every downstream automation has a spatial anchor (matches PRD §2.1).
2. **Top-down reasoning loops** – `DetectScopesUseCase` now represents PRD §2.2 items: it should orchestrate `IOCRService`, a parser strategy, and `CreateEntityUseCase`. Separate parser classes (`LegendParser`, `ScheduleParser`, `AssemblySummarizer`) keep Clean Architecture boundaries intact while satisfying the instruction-tuned LLM workflows described in the PRD.
3. **SymbolFamily persistence** – introduce a lightweight repository (JSON + embeddings) so user-seeded symbol families survive reloads. Each family links to an existing `SymbolDefinition` (`backend/app/domain/models/entities.py`), aligning with PRD §2.3’s “teach the system before detection” requirement.
4. **Bottom-up symbol pipeline** – `DetectSymbolsUseCase` (stubbed in `backend/app/use_cases/ai/`) embodies PRD §2.4: it should call `IVisualDetectionService`, convert pixel bboxes via `coords.canvas_to_pdf`, enrich detections with nearby OCR text (via `IOCRService`), and only then persist `SymbolInstance` entities. Unmatched candidates stay in-memory for UI review, preserving HITL control.
5. **Cross-modal linking + ScopeSlice** – PRD §2.5 introduces `ScopeSlice`. To support it, add a new domain model (or extend `Scope` with child slices) and a `ScopeSliceBuilder` service that clusters linked evidence using `SpatialAnalyzer` + embeddings. `LinkContextsUseCase` will call this builder after `LinkSuggestionStrategy` proposes relationships.
6. **Discrepancy agents** – map PRD §2.6 agents to LangGraph nodes that invoke read-only repository adapters. Results get surfaced via a “Refinement Report” API route (`backend/app/api/routes/projects.py` extension) and appear in UI via the Needs Attention list.
7. **Chat + measurement** – while deferred (PRD §2.7), we should reserve API contracts: `POST /api/projects/{id}/chat` for LangGraph RAG, and extend entity models with a future `Measurement` type. Measurement tooling must respect the coordinate helpers in `backend/app/coords.py` so polygon/line data aligns with existing bounding boxes.

### 12.2 Deliverables checklist (mirrors PRD §4)
- **Layout segmentation service** – packaged model + adapter implementing the new interface; integration tests ensuring region entities are created via `CreateEntityUseCase`.
- **Text parsers & prompts** – scripts + unit tests that turn OCR JSON into `CreateLegendItem`, `CreateScheduleItem`, `CreateAssembly`, and `CreateScope` payloads.
- **Symbol detector prototypes** – Colab notebooks, exported ONNX weights, and an inference wrapper consumed by `IVisualDetectionService`.
- **Linking algorithms** – CLIP-based similarity helpers plus `LinkSuggestionStrategy` wired through `LinkContextsUseCase`.
- **ScopeSlice logic** – domain model + builder + persistence schema updates, with roundtrip tests once introduced.
- **Validation agents** – LangGraph graphs plus FastAPI endpoints for triggering/running discrepancy audits; outputs stored for UI consumption.

## 13. Experimentation & Dev Workflow
To support rapid experimentation across layout, OCR, and vision models (e.g., DeepSeek OCR, Florence-2, YOLO, custom CLIP heads) we are adopting a unified dev workflow:

1. **Automation Playbooks repo section** – add `automation_playbooks/` (ignored by production build) containing:
   - Colab notebooks (`*.ipynb`) for quick experiments; include `Makefile` targets to sync data via `gdown`/`rclone`.
   - Python scripts using a shared `ExperimentConfig` dataclass (model name, provider, credentials, sheet IDs) so runs are reproducible.
2. **Model adapters** – wrap each external API (DeepSeek OCR, AWS Textract, custom ONNX models) behind lightweight adapters implementing `IOCRService`, `LayoutSegmentationService`, or `IVisualDetectionService`. Each adapter exposes:
   - `provider`: `"deepseek_ocr"`, `"azure_formrecognizer"`, `"local_yolo"`, etc.
   - `environment`: `"local"`, `"colab"`, `"api"`.
   - `config_path`: path to a YAML/JSON config referenced in git (with secrets pulled from `.env`).
3. **Run orchestration** – provide `invoke`/`make` commands:
   - `make automation.run project_id=demo sheet=2 model=deepseek_ocr`
   - `make automation.compare baseline=deepseek_ocr candidate=layoutlmv3`
   These commands save outputs (OCR JSON, logits, embeddings) under `artifacts/{timestamp}/{project}/{stage}/`.
4. **Asset review** – store intermediate crops/heatmaps as PNGs in the artifact tree; add a `docs/automation_playbook.md` index describing how to open them (QuickLook on macOS, or `npm run preview-artifacts` gallery).
5. **Traceability** – instrument every adapter with LangSmith/OpenTelemetry trace IDs so we can correlate notebook runs, CLI experiments, and backend use-case executions.
6. **Hardware notes** – default inference runs locally on the M2 using Metal-optimized PyTorch (for CLIP/LLM) or ONNX Runtime. For heavy models, provide Colab scripts with `pip install -r requirements_automation.txt` and optional paid tiers (Colab Pro/Pro+ or Modal GPU jobs). Document cost expectations per run.

This workflow keeps experimentation clear, debuggable, and reviewable. Once a model pipeline graduates, we promote its adapter into `backend/app/services/ai/implementations/` and reference it from FastAPI dependencies.

## 14. Reference Links
1. [R1] LangGraph Documentation – https://python.langchain.com/docs/langgraph  
2. [R2] LlamaIndex Observability Overview – https://docs.llamaindex.ai/en/stable/module_guides/observability/observability_overview/  
3. [R3] Microsoft AutoGen – https://microsoft.github.io/autogen  
4. [R4] CrewAI Docs – https://docs.crewai.com/  
5. [R5] Milvus Overview – https://milvus.io/docs/overview.md  
6. [R6] LanceDB Documentation – https://lancedb.github.io/lancedb  
7. [R7] LangSmith Product Page – https://www.langchain.com/langsmith  
8. [R8] Arize Phoenix – https://phoenix.arize.com  
9. [R9] Weights & Biases LLMOps Guide – https://docs.wandb.ai/guides/llm  
10. [R10] LayoutLMv3 Paper – https://arxiv.org/abs/2204.08387  
11. [R11] Ultralytics YOLOv8 Docs – https://docs.ultralytics.com  
12. [R12] Microsoft Florence-2 (Hugging Face) – https://huggingface.co/microsoft/Florence-2-large  
13. [R13] Segment Anything Model 2 – https://ai.facebook.com/blog/segment-anything-model-2/  
14. [R14] Table Transformer (TATR) – https://huggingface.co/microsoft/table-transformer-detection  
15. [R15] CLIP Research Note – https://openai.com/research/clip  
16. [R16] Qwen2.5-VL Release (Hugging Face) – https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct
17. [R17] “A Study on Methods for Parsing Architectural Multi-Modal Data and Extracting Modeling Parameters” – https://www.mdpi.com/2075-5309/15/22/4048

