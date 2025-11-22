# AI Automation Implementation TODO

This document tracks the phased implementation of the AI Automation Strategy outlined in `AI_AUTOMATION_STRATEGY.md`.

## Legend
- ✅ Complete
- 🚧 In Progress
- ⏳ Pending
- ⏸️ Blocked/Deferred

---

## Phase 0: Repository Prep & Instrumentation (1 week)

### 1. Automation Playbooks Workspace ✅
- ✅ Created `automation_playbooks/` directory structure
- ✅ Implemented `ExperimentConfig` dataclass with YAML support
- ✅ Added `scripts/run_experiment.py` for local/Colab runs
- ✅ Added `scripts/compare_runs.py` for baseline comparison
- ✅ Added `scripts/ingest_colab_bundle.py` for artifact ingestion
- ✅ Created `Makefile` targets (`automation.run`, `automation.compare`)
- ✅ Added `artifacts/` directory with timestamped structure
- ✅ Documented workflow in `automation_playbooks/README.md`

### 2. Observability & Tracing ✅
- ✅ Created `backend/app/telemetry/` module
- ✅ Implemented `Telemetry` class with LangSmith + OpenTelemetry support
- ✅ Added trace context propagation via `ContextVar`
- ✅ Wrapped `CreateEntityUseCase` with span emission
- ✅ Updated `Settings` with tracing configuration
- ✅ Added `trace_id` to `AIUseCaseResult` for audit trails
- ✅ Integrated telemetry into FastAPI DI container

### 3. AI Use-Case Stubs & Contracts ✅
- ✅ Implemented `DetectScopesUseCase` with `ScopeSuggestionStrategy` protocol
- ✅ Implemented `DetectSymbolsUseCase` with `SymbolPostProcessor` protocol
- ✅ Implemented `LegendParserUseCase` with `LegendParserStrategy` protocol
- ✅ Created `AIUseCaseResult` container for proposals vs. persisted entities
- ✅ Added `/api/projects/{id}/ai/scopes:detect` endpoint
- ✅ Added `/api/projects/{id}/ai/legends:parse` endpoint
- ✅ Added `/api/projects/{id}/ai/symbols:detect` endpoint
- ✅ Wired AI endpoints into FastAPI with feature flag gating

### 4. Playbook Artifact Integration ✅
- ✅ Created `PlaybookArtifactLoader` for reading experiment outputs
- ✅ Implemented `PlaybookScopeStrategy` (reads `proposals.json`)
- ✅ Implemented `PlaybookLegendStrategy` (reads `proposals.json`)
- ✅ Implemented `PlaybookVisualService` (reads `detections.json`)
- ✅ Added DI hooks in `dependencies.py` for strategy injection
- ✅ Added `automation_artifacts_dir` to `Settings`

### 5. Domain Model Updates ✅
- ✅ Confirmed `PageAnchoredEntity` already exists (Legend, Schedule, AssemblyGroup, Note)
- ✅ Confirmed `CreatePageAnchoredEntityBase` supports optional `bounding_box`
- ✅ Updated `CreateEntityUseCase._mark_missing_bbox()` to set validation flags
- ✅ Updated validators to skip bbox normalization when None
- ✅ Extended backend tests for page-anchored entities

### 6. Frontend HITL UX Hooks ✅
- ✅ Extended `ui_v2.ts` state to track AI proposal context
- ✅ Added "Needs grounding" badge rendering in `EntityTag.tsx`
- ✅ Implemented "Add bounding box" action in `InlineEntityForm.tsx`
- ✅ Added grounding workflow in `OverlayLayer.tsx`
- ✅ Updated `entity_flags.ts` to check for missing bounding boxes
- ✅ Hardened canvas/thumbnail components against null bboxes

### 7. Documentation & Handoff ✅
- ✅ Created `docs/automation_playbook.md` (Colab→prod workflow)
- ✅ Documented artifact structure and trace ID propagation
- ✅ Added notebook promotion steps and CLI usage examples
- ✅ Updated `automation_playbooks/README.md` with quick start

### 8. Testing & Quality Gates ✅
- ✅ Added `backend/tests/test_playbook_strategies.py` (3 tests)
- ✅ Added `backend/tests/test_page_anchored_entities.py` (2 tests)
- ✅ All new tests passing with proper PYTHONPATH setup

---

## Phase 1: Top-Down Scope Extraction (2-3 weeks)

### 1. Data Collection & Annotation ⏳
- ⏳ Create `backend/tests/data/ai/scopes/` fixture directory
- ⏳ Collect 10-15 representative sheet snippets (PNG + OCR JSON)
- ⏳ Manually annotate expected scope entities (ground truth)
- ⏳ Document annotation guidelines in `docs/ai_data_annotation.md`

### 2. Baseline Heuristic Strategy 🚧
- ⏳ Implement `HeuristicScopeStrategy` in `backend/app/services/ai/strategies/`
- ⏳ Use OCR text patterns (keywords: "SCOPE", "GENERAL NOTES", etc.)
- ⏳ Use layout region filtering (top/bottom margins, text density)
- ⏳ Add confidence scoring based on pattern matches
- ⏳ Wire into `DetectScopesUseCase` via DI

### 3. LLM-Based Scope Strategy ⏳
- ⏳ Implement `LLMScopeStrategy` using OpenAI/Anthropic API
- ⏳ Design prompt template with OCR context + examples
- ⏳ Add structured output parsing (JSON schema validation)
- ⏳ Implement retry logic with exponential backoff
- ⏳ Add cost tracking and rate limiting

### 4. Evaluation Framework ⏳
- ⏳ Create `backend/tests/test_scope_extraction_eval.py`
- ⏳ Implement precision/recall/F1 metrics against ground truth
- ⏳ Add regression test suite that runs on CI
- ⏳ Document acceptable thresholds in `docs/ai_quality_metrics.md`

### 5. Colab Notebook for Experimentation ⏳
- ⏳ Create `automation_playbooks/notebooks/scope_extraction.ipynb`
- ⏳ Add data loading, model inference, and visualization cells
- ⏳ Include artifact export to `artifacts/{timestamp}/` structure
- ⏳ Document usage in notebook markdown cells

---

## Phase 2: Bottom-Up Symbol Detection (3-4 weeks)

### 1. Symbol Detection Model Selection ⏳
- ⏳ Evaluate YOLOv8 vs. Faster R-CNN vs. LayoutLMv3
- ⏳ Create training dataset (100+ annotated symbols)
- ⏳ Train baseline model on construction drawing symbols
- ⏳ Document model architecture in `docs/ai_model_cards.md`

### 2. Visual Detection Service Implementation ⏳
- ⏳ Implement `YOLOVisualService` or equivalent
- ⏳ Add pixel→PDF coordinate conversion using `coords.py`
- ⏳ Implement confidence filtering and NMS post-processing
- ⏳ Add batch processing for multi-sheet projects

### 3. Symbol Clustering & Matching ⏳
- ⏳ Implement CLIP-based visual similarity clustering
- ⏳ Match detected symbols to existing `SymbolDefinition` entities
- ⏳ Add fallback to create new definitions for unknown symbols
- ⏳ Implement `SymbolPostProcessor` for deduplication

### 4. OCR Integration for Symbol Text ⏳
- ⏳ Extend detection pipeline to run OCR on symbol bboxes
- ⏳ Populate `recognized_text` field for symbol instances
- ⏳ Add fuzzy matching to link symbols to schedule items

### 5. Evaluation & Iteration ⏳
- ⏳ Create annotated test set (50+ sheets with symbols)
- ⏳ Measure detection accuracy, false positives, false negatives
- ⏳ Iterate on model training and post-processing
- ⏳ Document results in `docs/ai_symbol_detection_report.md`

---

## Phase 3: Legend & Schedule Parsing (2-3 weeks)

### 1. Layout Segmentation ⏳
- ⏳ Implement `LayoutSegmentationService` using LayoutLMv3 or SAM
- ⏳ Detect legend/schedule regions on sheets
- ⏳ Extract table structure (rows, columns, cells)
- ⏳ Add region classification (legend vs. schedule vs. notes)

### 2. Table Parsing & Entity Extraction ⏳
- ⏳ Implement `TableParserStrategy` for structured data extraction
- ⏳ Parse legend items (symbol_text + description)
- ⏳ Parse schedule items (mark + description + specifications)
- ⏳ Handle multi-line cells and merged cells

### 3. LLM-Based Refinement ⏳
- ⏳ Use LLM to clean up OCR errors in extracted text
- ⏳ Infer missing fields (e.g., schedule_type from title)
- ⏳ Add semantic validation (e.g., mark format consistency)

### 4. Integration with Existing Entities ⏳
- ⏳ Auto-link legend items to symbol definitions
- ⏳ Auto-link schedule items to component definitions
- ⏳ Populate `defined_in_id` fields automatically

---

## Phase 4: Cross-Modal Linking (2-3 weeks)

### 1. Embedding-Based Similarity ⏳
- ⏳ Implement `EmbeddingService` using CLIP or sentence-transformers
- ⏳ Generate embeddings for text (descriptions, notes)
- ⏳ Generate embeddings for visual regions (symbol crops)
- ⏳ Add vector store (Milvus, LanceDB, or in-memory FAISS)

### 2. Link Suggestion Strategy ⏳
- ⏳ Implement `LinkSuggestionStrategy` protocol
- ⏳ Score candidate links using spatial + semantic signals
- ⏳ Rank suggestions by confidence
- ⏳ Filter out low-confidence links (< threshold)

### 3. Spatial Reasoning ⏳
- ⏳ Implement proximity-based linking (symbols near drawings)
- ⏳ Use containment relationships (instances within drawings)
- ⏳ Add directional heuristics (callouts pointing to regions)

### 4. LLM-Based Link Validation ⏳
- ⏳ Use LLM to validate proposed links with context
- ⏳ Provide evidence snippets (OCR text, visual crops)
- ⏳ Allow human override with feedback loop

---

## Phase 5: HITL Review & Refinement (Ongoing)

### 1. Proposal Review UI ⏳
- ⏳ Design "AI Proposals" panel in right sidebar
- ⏳ Show pending entities/links with confidence scores
- ⏳ Add approve/reject/edit actions
- ⏳ Implement batch approval workflow

### 2. Feedback Loop ⏳
- ⏳ Track user corrections (accepted vs. rejected proposals)
- ⏳ Store feedback in `artifacts/{timestamp}/feedback.json`
- ⏳ Use feedback to retrain models or adjust thresholds
- ⏳ Add feedback export for model fine-tuning

### 3. Explainability & Transparency ⏳
- ⏳ Show evidence for each proposal (OCR snippets, visual crops)
- ⏳ Display confidence scores and reasoning
- ⏳ Add "Why was this suggested?" tooltip
- ⏳ Link to trace IDs for debugging

### 4. Incremental Grounding ⏳
- ⏳ Implement "Needs grounding" filter in entity list
- ⏳ Add bulk grounding workflow (draw multiple bboxes)
- ⏳ Allow AI to suggest bboxes for page-scoped entities
- ⏳ Track grounding completion metrics

---

## Phase 6: Production Hardening (1-2 weeks)

### 1. Performance Optimization ⏳
- ⏳ Add caching for OCR/layout results
- ⏳ Implement batch processing for multi-sheet projects
- ⏳ Optimize coordinate transformations (vectorize)
- ⏳ Add progress tracking for long-running AI jobs

### 2. Error Handling & Resilience ⏳
- ⏳ Add retry logic for API failures (LLM, vision models)
- ⏳ Implement graceful degradation (fallback strategies)
- ⏳ Add circuit breakers for external services
- ⏳ Log errors to observability platform

### 3. Security & Privacy ⏳
- ⏳ Add API key rotation for external services
- ⏳ Implement rate limiting per project/user
- ⏳ Sanitize inputs before sending to LLMs
- ⏳ Add audit logs for AI-generated entities

### 4. Monitoring & Alerting ⏳
- ⏳ Set up Grafana dashboards for AI metrics
- ⏳ Add alerts for low confidence scores
- ⏳ Track cost per project (API usage)
- ⏳ Monitor latency and throughput

---

## Infrastructure & Tooling

### Colab Integration ⏳
- ⏳ Create shared Colab notebook template
- ⏳ Add authentication for backend API access
- ⏳ Implement artifact upload/download helpers
- ⏳ Document GPU setup and dependencies

### CI/CD Pipeline ⏳
- ⏳ Add regression tests to CI (pytest + fixtures)
- ⏳ Run evaluation suite on every PR
- ⏳ Block merges if metrics degrade
- ⏳ Add smoke tests for AI endpoints

### Model Registry ⏳
- ⏳ Set up model versioning (MLflow, W&B, or S3)
- ⏳ Track model lineage (training data, hyperparameters)
- ⏳ Add model deployment workflow
- ⏳ Document model promotion criteria

---

## Documentation Needs

### Developer Guides ⏳
- ⏳ `docs/AI_AUTOMATION_DEVELOPER_GUIDE.md` (architecture overview)
- ⏳ `docs/ai_data_annotation.md` (annotation guidelines)
- ⏳ `docs/ai_model_cards.md` (model specifications)
- ⏳ `docs/ai_quality_metrics.md` (evaluation criteria)

### User Documentation ⏳
- ⏳ Update `PRD.md` with AI features
- ⏳ Add "AI Automation" section to user guide
- ⏳ Create video walkthrough of HITL workflow
- ⏳ Document best practices for reviewing proposals

---

## Current Status Summary

**Completed:** Phase 0 (Repository Prep & Instrumentation) - 100% ✅

**Next Steps:**
1. Begin Phase 1 data collection (scope extraction fixtures)
2. Implement baseline heuristic scope strategy
3. Create first Colab notebook for experimentation
4. Draft developer guide structure

**Blockers:** None currently

**Risks:**
- Model accuracy may require multiple iterations
- LLM costs could be higher than expected
- Annotation effort may be underestimated

---

## Notes

- All AI endpoints are feature-flagged via `TIMBERGEM_AI_PLAYBOOKS_ENABLED`
- Trace IDs propagate from Colab → artifacts → backend for full auditability
- Page-anchored entities can be created without bboxes and grounded later
- Frontend HITL UX is ready to surface AI proposals (pending backend integration)

**Last Updated:** 2025-11-22

