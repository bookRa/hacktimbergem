"""Helpers for loading automation playbook artifacts."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from pydantic import TypeAdapter

from app.domain.models import CreateEntityUnion

LOGGER = logging.getLogger("timbergem.playbooks")


def _parse_timestamp(folder: Path) -> datetime:
    """Parse timestamp folder names formatted as %Y%m%dT%H%M%SZ."""
    try:
        return datetime.strptime(folder.name, "%Y%m%dT%H%M%SZ")
    except ValueError:
        return datetime.fromtimestamp(folder.stat().st_mtime)


@dataclass(slots=True)
class PlaybookArtifactLoader:
    """
    Loads AI proposals/detections produced by automation_playbooks.

    The artifact layout mirrors ExperimentConfig.build_artifact_dir():
        {root}/{timestamp}/{project_id}/{stage}/
            metadata.json
            proposals.json (CreateEntity payloads)
            detections.json (raw detections for visual services)
    """

    artifacts_root: str
    proposals_filename: str = "proposals.json"
    detections_filename: str = "detections.json"
    metadata_filename: str = "metadata.json"
    root: Path = field(init=False)
    _create_entity_adapter: TypeAdapter = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.root = Path(self.artifacts_root).expanduser().resolve()
        self._create_entity_adapter = TypeAdapter(CreateEntityUnion)

    def _iter_stage_dirs(
        self, project_id: str, stage: str
    ) -> Iterable[Tuple[Path, Dict[str, Any]]]:
        """Yield stage directories sorted by timestamp (newest first)."""
        if not self.root.exists():
            LOGGER.debug("Artifacts root %s does not exist", self.root)
            return

        timestamp_dirs = [
            path for path in self.root.iterdir() if path.is_dir()
        ]
        timestamp_dirs.sort(key=_parse_timestamp, reverse=True)

        for ts_dir in timestamp_dirs:
            stage_dir = ts_dir / project_id / stage
            if not stage_dir.exists():
                continue
            metadata_path = stage_dir / self.metadata_filename
            if not metadata_path.exists():
                LOGGER.debug("Missing metadata.json in %s", stage_dir)
                continue
            try:
                metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:  # pragma: no cover
                LOGGER.warning("Failed to parse %s: %s", metadata_path, exc)
                continue
            yield stage_dir, metadata

    def _select_stage_dir(
        self, project_id: str, stage: str, sheet_number: int
    ) -> Tuple[Path, Dict[str, Any]]:
        for stage_dir, metadata in self._iter_stage_dirs(project_id, stage):
            if int(metadata.get("sheet_number", 0)) != int(sheet_number):
                continue
            return stage_dir, metadata
        raise FileNotFoundError(
            f"No automation artifact found for project={project_id} "
            f"stage={stage} sheet={sheet_number}"
        )

    def _read_json(self, path: Path) -> List[Dict[str, Any]]:
        if not path.exists():
            raise FileNotFoundError(f"Expected artifact file missing: {path}")
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in artifact {path}") from exc
        if not isinstance(payload, list):
            raise ValueError(f"Artifact {path} must contain a JSON list")
        return payload

    def load_create_payloads(
        self, *, project_id: str, stage: str, sheet_number: int
    ) -> List[CreateEntityUnion]:
        stage_dir, _ = self._select_stage_dir(project_id, stage, sheet_number)
        records = self._read_json(stage_dir / self.proposals_filename)
        return [
            self._create_entity_adapter.validate_python(record) for record in records
        ]

    def load_detection_records(
        self, *, project_id: str, stage: str, sheet_number: int
    ) -> List[Dict[str, Any]]:
        stage_dir, _ = self._select_stage_dir(project_id, stage, sheet_number)
        return self._read_json(stage_dir / self.detections_filename)


__all__ = ["PlaybookArtifactLoader"]


