"""
Placeholder use case for top-down scope extraction.

The concrete implementation will orchestrate:
1. Loading OCR/layout data for a sheet via IOCRService
2. Passing that data to a ScopeSuggestionStrategy (LLM, LayoutLM, heuristics)
3. Writing accepted suggestions through CreateEntityUseCase so manual + AI paths match
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Protocol

from app.domain.models import CreateEntityUnion
from app.services.ai.ocr_service import IOCRService, OCRData
from app.use_cases.entities.create_entity import CreateEntityUseCase


class ScopeSuggestionStrategy(Protocol):
    """Strategy interface for proposing scope/notes/assembly entities."""

    def propose(
        self,
        *,
        project_id: str,
        sheet_number: int,
        ocr: OCRData,
    ) -> List[CreateEntityUnion]:
        ...


@dataclass(slots=True)
class DetectScopesUseCase:
    """
    Future orchestration entrypoint for Workstream #1 (top-down scopes).

    Args:
        ocr_service: Provides OCR/layout data from ingestion outputs
        create_entity: Existing use case that performs validation/persistence
        strategy: Optional suggestion backend (LLM, heuristics, hybrid)
    """

    ocr_service: IOCRService
    create_entity: CreateEntityUseCase
    strategy: ScopeSuggestionStrategy | None = None

    def execute(self, project_id: str, sheet_number: int) -> List[CreateEntityUnion]:
        """
        Placeholder execution method.

        Real implementation will fetch OCR data, run the strategy,
        persist accepted entities, and return the created entities.
        """
        raise NotImplementedError(
            "DetectScopesUseCase is a planning placeholder; "
            "wire it to a ScopeSuggestionStrategy before use."
        )


__all__ = ["DetectScopesUseCase", "ScopeSuggestionStrategy"]

