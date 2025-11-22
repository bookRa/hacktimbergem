## Automation Playbook Workflow

This document describes the Phase 0→1 experimentation loop anchored in `automation_playbooks/`. It translates the process outlined in `docs/AI_AUTOMATION_STRATEGY.md` §13 into concrete steps that work locally **and** in Google Colab.

### 1. Author a config

1. Copy `automation_playbooks/configs/sample_scope.yaml`.
2. Update:
   - `project_id`, `sheet_number`, `stage` (`scopes`, `legends`, `symbols`, …)
   - `provider`, `model`, `environment` (`local`, `colab`, `api`)
   - Optional `options` (confidence thresholds, trace provider, etc.)
3. The config doubles as provenance—`run_experiment.py` persists it inside each artifact folder.

### 2. Materialize a run skeleton

```
make automation.run CONFIG=automation_playbooks/configs/<config>.yaml \
     [TIMESTAMP=20250101T120000Z] [TRACE_ID=<trace-id>]
```

This command:
- Creates `automation_playbooks/artifacts/{timestamp}/{project}/{stage}/`
- Writes `metadata.json` (config + trace IDs)
- Seeds a `trace.txt` placeholder when `TRACE_ID` is provided

You can now sync this folder to Colab (Drive, `rclone`, etc.) and produce real outputs (`proposals.json`, `detections.json`, crops, logs).

### 3. Run in Colab

Inside Colab:
1. Clone/Sync the repo (or just the `automation_playbooks` tree).
2. Install dependencies for the experiment (`pip install -r requirements_automation.txt` plus model-specific wheels).
3. Load the YAML config to drive notebooks or scripts.
4. Save outputs back into the same artifact directory:
   - `proposals.json` — list of `CreateEntity` payloads (matching backend schema)
   - `detections.json` — optional raw detector payloads (pixel/PDF coords)
   - Visual evidence (`crops/*.png`, `logs/*.jsonl`)
   - Any notebook HTML exports for review

### 4. Ingest Colab bundles locally

After downloading the artifact folder (or zip):

```
make automation.ingest BUNDLE=/path/to/bundle.zip [FORCE=1] [REPLAY=1]
```

- Copies the bundle into the canonical artifacts tree while preserving timestamp/project/stage.
- Sets `TIMBERGEM_AUTOMATION_ARTIFACTS_DIR` automatically so backend strategies read the new data.
- `REPLAY=1` triggers the matching FastAPI use case in dry-run mode and stores `replay.json` to compare backend orchestration vs. notebook output.

### 5. Wire into backend strategies

When `TIMBERGEM_AI_PLAYBOOKS_ENABLED=true`, the dependency container injects:

| Stage    | Strategy/Service                                | Source file |
|----------|-------------------------------------------------|-------------|
| scopes   | `PlaybookScopeSuggestionStrategy`               | `backend/app/services/ai/strategies/playbook_scope.py` |
| legends  | `PlaybookLegendParserStrategy`                  | same as above |
| symbols  | `PlaybookVisualDetectionService`                | `backend/app/services/ai/implementations/playbook_visual_service.py` |

The strategies read `metadata.json` → locate the latest run (by timestamp) for `{project_id, sheet_number, stage}` → parse `proposals.json`/`detections.json` into `CreateEntityUnion` payloads.

### 6. Observability expectations

- `TIMBERGEM_TRACING_ENABLED=true` + LangSmith/OpenTelemetry credentials let use cases emit spans for **manual** and **AI** flows alike.
- Each automation use case (`DetectScopes`, `LegendParser`, `DetectSymbols`) now wraps execution in telemetry spans and returns the resulting `trace_id` in API responses.
- Recorded traces should be added to the artifact folder (update `trace.txt` with the LangSmith URL or OTEL trace ID) so reviewers can correlate notebook runs with backend dry-runs.

### 7. Promotion checklist

Before promoting an experiment into a production adapter:

1. Ensure artifacts include:
   - Config + metadata
   - Raw inputs (OCR JSON, crops, embeddings if applicable)
   - Model outputs (`proposals.json`, ranked candidates, rejection reasons)
   - Traces/logs
2. Add/refresh regression fixtures under `backend/tests/test_playbook_strategies.py` (copy representative proposal/detection JSON).
3. Implement or update playbook-backed strategies/services if the stage is new.
4. Extend FastAPI endpoints/tests to cover the new stage if needed.
5. Document any Colab-specific setup (env vars, gcloud auth, GPU requirements) in this file or within the notebook header.

### 8. FAQ

- **Where do we store large blobs?** Keep the committed repo lightweight. Upload large crops/weights to object storage (S3, GCS) and reference them via signed URLs or README pointers.
- **How do we compare runs?** Use `make automation.compare BASELINE=<path> CANDIDATE=<path>` to diff `metadata.json` keys. For semantic diffs, drop bespoke scripts/notebooks under `automation_playbooks/scripts/` or `notebooks/`.
- **Can multiple teams share the same artifact root?** Yes. Each run is namespaced by timestamp → project → stage. If you need a different root, set `TIMBERGEM_AUTOMATION_ARTIFACTS_DIR` before running backend services/CLIs.

This workflow keeps experiments reproducible, reviewable, and ready for promotion into production adapters as the automation roadmap unfolds.



