"""Legend parsing orchestration use case."""

from __future__ import annotations

from contextlib import nullcontext
from dataclasses import dataclass
from typing import List, Protocol, Sequence

from app.domain.models import CreateEntityUnion
from app.services.ai.ocr_service import IOCRService, OCRData
from app.services.ai.layout_service import LayoutSegmentationService, LayoutRegion
from app.telemetry import Telemetry
from app.use_cases.entities.create_entity import CreateEntityUseCase
from app.use_cases.ai.types import AIUseCaseResult


class LegendParserStrategy(Protocol):
    """Strategy that converts OCR/layout blocks into legend entities."""

    def parse(
        self,
        *,
        project_id: str,
        sheet_number: int,
        ocr: OCRData,
        regions: Sequence[LayoutRegion] | None = None,
    ) -> List[CreateEntityUnion]:
        ...


@dataclass(slots=True)
class LegendParserUseCase:
    """Coordinates OCR retrieval and legend parsing strategies."""

    ocr_service: IOCRService
    create_entity: CreateEntityUseCase
    parser: LegendParserStrategy | None = None
    layout_service: LayoutSegmentationService | None = None
    telemetry: Telemetry | None = None

    def execute(
        self,
        project_id: str,
        sheet_number: int,
        *,
        dry_run: bool = True,
        limit: int | None = None,
    ) -> AIUseCaseResult:
        if not self.parser:
            raise RuntimeError("LegendParserStrategy is not configured")

        span_attributes = {
            "project_id": project_id,
            "sheet_number": sheet_number,
            "dry_run": dry_run,
            "stage": "legends",
        }
        telemetry_ctx = (
            self.telemetry.span("LegendParserUseCase.execute", span_attributes)
            if self.telemetry
            else nullcontext()
        )

        with telemetry_ctx as span:
            ocr = self.ocr_service.get_ocr(project_id, sheet_number)
            regions = (
                self.layout_service.get_regions(project_id, sheet_number)
                if self.layout_service
                else None
            )
            proposals = self.parser.parse(
                project_id=project_id,
                sheet_number=sheet_number,
                ocr=ocr,
                regions=regions,
            )

            if limit is not None:
                proposals = proposals[:limit]

            trace_id = (
                self.telemetry.current_trace_id() if self.telemetry else None
            )
            result = AIUseCaseResult(
                project_id=project_id,
                sheet_number=sheet_number,
                dry_run=dry_run,
                proposed=proposals,
                trace_id=trace_id,
            )
            if span:
                span.set_attribute("timbergem.ai.proposed_count", len(proposals))

            if not dry_run:
                created = []
                for payload in proposals:
                    created.append(self.create_entity.execute(project_id, payload))
                result.created = created
                if span:
                    span.set_attribute("timbergem.ai.created_count", len(created))

            return result


__all__ = ["LegendParserUseCase", "LegendParserStrategy"]

