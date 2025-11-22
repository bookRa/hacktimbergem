from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from automation_playbooks.experiment_config import (
    ExperimentConfig,
    ensure_artifact_dir,
)


def _write_metadata(artifact_dir: Path, payload: Dict) -> None:
    metadata_path = artifact_dir / "metadata.json"
    metadata_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_trace_stub(artifact_dir: Path, trace_id: str) -> None:
    trace_path = artifact_dir / "trace.txt"
    trace_path.write_text(
        "Trace placeholder\n"
        "=================\n"
        f"trace_id={trace_id}\n"
        "Update this file with LangSmith/OTel links once the run is complete.\n",
        encoding="utf-8",
    )


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Prepare an automation experiment run context."
    )
    parser.add_argument(
        "--config",
        required=True,
        help="Path to the YAML config that describes the experiment.",
    )
    parser.add_argument(
        "--timestamp",
        help="Optional UTC timestamp (YYYYmmddTHHMMSSZ). Defaults to now.",
    )
    parser.add_argument(
        "--trace-id",
        help="Optional trace identifier emitted by LangSmith/OpenTelemetry.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the resolved paths without writing artifacts.",
    )
    args = parser.parse_args(argv)

    config = ExperimentConfig.from_file(args.config)
    if args.timestamp:
        run_dt = datetime.strptime(args.timestamp, "%Y%m%dT%H%M%SZ").replace(
            tzinfo=timezone.utc
        )
    else:
        run_dt = datetime.now(tz=timezone.utc)

    artifact_dir = config.build_artifact_dir(run_dt)
    metadata = config.metadata()
    metadata["artifact_dir"] = str(artifact_dir)
    if args.trace_id:
        metadata["trace_id"] = args.trace_id

    if args.dry_run:
        print(json.dumps(metadata, indent=2))
        return 0

    ensure_artifact_dir(artifact_dir)
    _write_metadata(artifact_dir, metadata)
    if args.trace_id:
        _write_trace_stub(artifact_dir, args.trace_id)

    print(f"[automation] Created artifact directory: {artifact_dir}")
    print(f"[automation] Metadata:\n{json.dumps(metadata, indent=2)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

