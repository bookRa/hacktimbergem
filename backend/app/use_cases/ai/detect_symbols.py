"""
Placeholder use case for bottom-up symbol detection.

Eventually this will:
1. Call IVisualDetectionService/IVisionModelClient to get pixel-space detections
2. Convert detections into CreateEntityUnion payloads (symbol definitions/instances)
3. Persist them via CreateEntityUseCase while tagging provenance for HITL review
"""

from __future__ import annotations

from contextlib import nullcontext
from dataclasses import dataclass
from typing import List, Protocol, Sequence, Any

from pydantic import BaseModel, TypeAdapter

from app.domain.models import CreateEntityUnion, EntityUnion
from app.telemetry import Telemetry
from app.services.ai.visual_service import IVisualDetectionService
from app.use_cases.entities.create_entity import CreateEntityUseCase
from app.use_cases.ai.types import AIUseCaseResult


class SymbolPostProcessor(Protocol):
    """Optional hook to clean detections before persistence."""

    def refine(
        self,
        *,
        project_id: str,
        sheet_number: int,
        detections: List[CreateEntityUnion],
    ) -> List[CreateEntityUnion]:
        ...


@dataclass(slots=True)
class DetectSymbolsUseCase:
    """
    Future orchestration entrypoint for Workstream #2 (bottom-up symbols).

    Args:
        visual_service: Provides raw detections in project space
        create_entity: Unified entity creation path
        post_processor: Optional hook (CLIP clustering, heuristics, dedupe)
    """

    create_entity: CreateEntityUseCase
    visual_service: IVisualDetectionService | None = None
    post_processor: SymbolPostProcessor | None = None
    telemetry: Telemetry | None = None

    _adapter = TypeAdapter(CreateEntityUnion)

    def execute(
        self,
        project_id: str,
        sheet_number: int,
        *,
        dry_run: bool = True,
        drawing_id: str | None = None,
        confidence_threshold: float | None = None,
    ) -> AIUseCaseResult:
        """Run the configured visual detector."""
        if not self.visual_service:
            raise RuntimeError("Visual detection service is not configured")

        span_attributes = {
            "project_id": project_id,
            "sheet_number": sheet_number,
            "dry_run": dry_run,
            "stage": "symbols",
        }
        telemetry_ctx = (
            self.telemetry.span("DetectSymbolsUseCase.execute", span_attributes)
            if self.telemetry
            else nullcontext()
        )

        with telemetry_ctx as span:
            detections = self.visual_service.detect_symbols(
                project_id=project_id,
                sheet_number=sheet_number,
                drawing_id=drawing_id,
                confidence_threshold=confidence_threshold or 0.7,
            )
            payloads = self._normalize_detections(
                project_id=project_id, sheet_number=sheet_number, detections=detections
            )

            if self.post_processor:
                payloads = self.post_processor.refine(
                    project_id=project_id,
                    sheet_number=sheet_number,
                    detections=payloads,
                )

            trace_id = (
                self.telemetry.current_trace_id() if self.telemetry else None
            )
            result = AIUseCaseResult(
                project_id=project_id,
                sheet_number=sheet_number,
                dry_run=dry_run,
                proposed=payloads,
                trace_id=trace_id,
            )
            if span:
                span.set_attribute("timbergem.ai.proposed_count", len(payloads))

            if not dry_run:
                created: List[EntityUnion] = []
                for payload in payloads:
                    created.append(self.create_entity.execute(project_id, payload))
                result.created = created
                if span:
                    span.set_attribute("timbergem.ai.created_count", len(created))

            return result

    def _normalize_detections(
        self,
        *,
        project_id: str,
        sheet_number: int,
        detections: Sequence[CreateEntityUnion | BaseModel | dict[str, Any]],
    ) -> List[CreateEntityUnion]:
        """Ensure detections are Pydantic models compatible with CreateEntityUseCase."""
        normalized: List[CreateEntityUnion] = []
        for detection in detections:
            if isinstance(detection, BaseModel):
                normalized.append(detection)  # type: ignore[arg-type]
            elif isinstance(detection, dict):
                normalized.append(self._adapter.validate_python(detection))
            else:
                normalized.append(detection)
        return normalized


__all__ = ["DetectSymbolsUseCase", "SymbolPostProcessor"]

