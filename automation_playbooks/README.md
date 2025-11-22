# Automation Playbooks

This workspace mirrors the experimentation workflow described in `docs/AI_AUTOMATION_STRATEGY.md` §13. It provides a common surface for running automation experiments locally or in Google Colab while keeping artifacts versioned and reproducible.

## Directory layout

- `configs/` – YAML templates that describe the experiment provider/model/environment parameters passed into runners.
- `notebooks/` – Colab-ready notebooks. Use the configs as inputs and sync outputs back into the repo.
- `scripts/` – Lightweight Python CLIs for orchestrating experiments, syncing artifacts, and replaying outputs.
- `artifacts/` – Timestamped run outputs organized as `artifacts/{timestamp}/{project_id}/{stage}/`. Each run stores metadata, logs, and optional crops/heatmaps for review.

## Quick start

1. Copy `configs/sample_scope.yaml` and adjust the provider/model/sheet metadata.
2. Execute `make automation.run CONFIG=automation_playbooks/configs/sample_scope.yaml` to materialize a local run folder and metadata skeleton.
3. For Colab runs, use the same config path and point the notebook at the generated artifact directory (printed by the CLI) to keep outputs in sync.

See `docs/automation_playbook.md` (added in Phase 0→1) for the full notebook → adapter promotion flow, data sync commands, and traceability expectations.

## Colab ingest & replay

- Use `make automation.ingest BUNDLE=/path/to/artifact.zip [-- FORCE=1] [REPLAY=1]` to copy a Colab-exported bundle into `automation_playbooks/artifacts/{timestamp}/{project}/{stage}`.
- Pass `REPLAY=1` to automatically run the corresponding FastAPI use case (dry-run) after ingestion; the serialized response is stored as `replay.json` alongside the artifacts.
- The ingest command also sets `TIMBERGEM_AUTOMATION_ARTIFACTS_DIR` so backend playbook strategies and visual services can load the new data immediately.

