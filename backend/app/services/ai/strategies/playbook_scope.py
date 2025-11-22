"""Strategies that replay automation_playbooks proposals."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from app.domain.models import CreateEntityUnion
from app.services.ai.layout_service import LayoutRegion
from app.services.ai.ocr_service import OCRData
from app.services.ai.playbook_artifacts import PlaybookArtifactLoader
from app.use_cases.ai.detect_scopes import ScopeSuggestionStrategy
from app.use_cases.ai.legend_parser import LegendParserStrategy


@dataclass(slots=True)
class PlaybookScopeSuggestionStrategy(ScopeSuggestionStrategy):
    """Loads scope/note proposals from automation_playbooks artifacts."""

    loader: PlaybookArtifactLoader
    stage_name: str = "scopes"

    def propose(
        self,
        *,
        project_id: str,
        sheet_number: int,
        ocr: OCRData,  # noqa: ARG002 - retained for interface compatibility
        regions: Sequence[LayoutRegion] | None = None,  # noqa: ARG002
    ) -> List[CreateEntityUnion]:
        return self.loader.load_create_payloads(
            project_id=project_id,
            stage=self.stage_name,
            sheet_number=sheet_number,
        )


@dataclass(slots=True)
class PlaybookLegendParserStrategy(LegendParserStrategy):
    """Loads legend/schedule proposals from automation_playbooks artifacts."""

    loader: PlaybookArtifactLoader
    stage_name: str = "legends"

    def parse(
        self,
        *,
        project_id: str,
        sheet_number: int,
        ocr: OCRData,  # noqa: ARG002
        regions: Sequence[LayoutRegion] | None = None,  # noqa: ARG002
    ) -> List[CreateEntityUnion]:
        return self.loader.load_create_payloads(
            project_id=project_id,
            stage=self.stage_name,
            sheet_number=sheet_number,
        )


__all__ = [
    "PlaybookScopeSuggestionStrategy",
    "PlaybookLegendParserStrategy",
]



