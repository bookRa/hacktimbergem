"""Visual detection service that replays automation_playbooks artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

from app.services.ai.playbook_artifacts import PlaybookArtifactLoader
from app.services.ai.visual_service import IVisualDetectionService


@dataclass(slots=True)
class PlaybookVisualDetectionService(IVisualDetectionService):
    """Feeds detect_symbols results from recorded artifact bundles."""

    loader: PlaybookArtifactLoader
    stage_name: str = "symbols"

    def detect_drawings(
        self,
        project_id: str,
        sheet_number: int,
        confidence_threshold: float = 0.7,  # noqa: ARG002
    ) -> List[Dict[str, Any]]:
        # Drawing detection is not yet supported via playbook artifacts.
        return []

    def detect_symbols(
        self,
        project_id: str,
        sheet_number: int,
        drawing_id: str | None = None,  # noqa: ARG002
        confidence_threshold: float = 0.7,  # noqa: ARG002
    ) -> List[Dict[str, Any]]:
        return self.loader.load_detection_records(
            project_id=project_id,
            stage=self.stage_name,
            sheet_number=sheet_number,
        )


__all__ = ["PlaybookVisualDetectionService"]



