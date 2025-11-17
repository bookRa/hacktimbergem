"""
Placeholder use case for bottom-up symbol detection.

Eventually this will:
1. Call IVisualDetectionService/IVisionModelClient to get pixel-space detections
2. Convert detections into CreateEntityUnion payloads (symbol definitions/instances)
3. Persist them via CreateEntityUseCase while tagging provenance for HITL review
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Protocol

from app.domain.models import CreateEntityUnion
from app.services.ai.visual_service import IVisualDetectionService
from app.use_cases.entities.create_entity import CreateEntityUseCase


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

    visual_service: IVisualDetectionService
    create_entity: CreateEntityUseCase
    post_processor: SymbolPostProcessor | None = None

    def execute(self, project_id: str, sheet_number: int) -> List[CreateEntityUnion]:
        """
        Placeholder execution method.

        Real implementation will call the visual service, convert detections,
        push them through CreateEntityUseCase, and return results.
        """
        raise NotImplementedError(
            "DetectSymbolsUseCase is a planning placeholder; "
            "supply a visual service + post processor before use."
        )


__all__ = ["DetectSymbolsUseCase", "SymbolPostProcessor"]

