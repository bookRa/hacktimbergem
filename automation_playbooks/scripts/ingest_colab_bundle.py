from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

# Ensure backend modules are importable
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Default to enabling AI playbooks so dependency wiring succeeds
os.environ.setdefault("TIMBERGEM_AI_PLAYBOOKS_ENABLED", "true")

from app.api.dependencies import (  # type: ignore  # noqa: E402
    get_detect_scopes_use_case,
    get_detect_symbols_use_case,
    get_legend_parser_use_case,
)

def _find_stage_dir(root: Path) -> Path:
    if (root / "metadata.json").exists():
        return root
    matches = list(root.rglob("metadata.json"))
    if not matches:
        raise FileNotFoundError(
            f"Could not find metadata.json inside extracted bundle: {root}"
        )
    return matches[0].parent


def _extract_bundle(path: Path) -> Tuple[Path, Optional[tempfile.TemporaryDirectory]]:
    if path.is_dir():
        return _find_stage_dir(path), None
    if zipfile.is_zipfile(path):
        temp_dir = tempfile.TemporaryDirectory(prefix="playbook_ingest_")
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(temp_dir.name)
        stage_dir = _find_stage_dir(Path(temp_dir.name))
        return stage_dir, temp_dir
    raise ValueError(f"Unsupported bundle type: {path}")


def _dest_from_metadata(metadata: dict, target_root: Path) -> Path:
    generated = metadata.get("generated_at")
    if generated:
        try:
            ts = (
                datetime.fromisoformat(generated.replace("Z", "+00:00"))
                .astimezone(timezone.utc)
                .strftime("%Y%m%dT%H%M%SZ")
            )
        except ValueError:
            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    else:
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    project_id = metadata.get("project_id") or "unknown_project"
    stage = metadata.get("stage") or "unknown_stage"
    return target_root / ts / project_id / stage


def _copy_stage_dir(source: Path, destination: Path, force: bool) -> Path:
    if destination.exists():
        if not force:
            raise FileExistsError(
                f"Destination {destination} already exists. "
                "Use --force to overwrite."
            )
        shutil.rmtree(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, destination)
    return destination


def _replay_stage(metadata: dict, dry_run: bool = True) -> Optional[dict]:
    project_id = metadata.get("project_id")
    sheet_number = metadata.get("sheet_number")
    stage = metadata.get("stage")
    if not project_id or sheet_number is None:
        return None

    sheet_number = int(sheet_number)
    if stage == "scopes":
        use_case = get_detect_scopes_use_case()
        result = use_case.execute(project_id, sheet_number, dry_run=dry_run)
    elif stage == "legends":
        use_case = get_legend_parser_use_case()
        result = use_case.execute(project_id, sheet_number, dry_run=dry_run)
    elif stage == "symbols":
        use_case = get_detect_symbols_use_case()
        result = use_case.execute(project_id, sheet_number, dry_run=dry_run)
    else:
        return None

    return result.serialize()


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Ingest a Colab artifact bundle into automation_playbooks/artifacts"
    )
    parser.add_argument(
        "--bundle",
        required=True,
        help="Path to a ZIP archive or directory containing metadata.json/proposals.json",
    )
    parser.add_argument(
        "--target-root",
        default="automation_playbooks/artifacts",
        help="Destination root for artifact storage.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite destination directory if it already exists.",
    )
    parser.add_argument(
        "--replay",
        action="store_true",
        help="Run the corresponding AI use case (dry-run) after ingestion.",
    )
    args = parser.parse_args(argv)

    bundle_path = Path(args.bundle).expanduser().resolve()
    target_root = Path(args.target_root).expanduser().resolve()

    stage_dir, temp_dir = _extract_bundle(bundle_path)
    try:
        metadata_path = stage_dir / "metadata.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        destination = _copy_stage_dir(stage_dir, _dest_from_metadata(metadata, target_root), args.force)
        print(f"[automation] Bundle copied to: {destination}")

        # Ensure backend settings pick up the destination directory
        os.environ.setdefault(
            "TIMBERGEM_AUTOMATION_ARTIFACTS_DIR", str(target_root)
        )

        if args.replay:
            replay_result = _replay_stage(metadata)
            if replay_result:
                replay_path = destination / "replay.json"
                replay_path.write_text(json.dumps(replay_result, indent=2), encoding="utf-8")
                print(f"[automation] Replay output written to {replay_path}")
            else:
                print("[automation] Replay skipped (stage not supported).")
    finally:
        if temp_dir is not None:
            temp_dir.cleanup()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


