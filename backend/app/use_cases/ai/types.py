"""Shared result objects for AI use cases."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from app.domain.models import CreateEntityUnion, EntityUnion


@dataclass(slots=True)
class AIUseCaseResult:
    """Container describing what an AI use case proposed vs. persisted."""

    project_id: str
    sheet_number: int
    dry_run: bool
    proposed: List[CreateEntityUnion] = field(default_factory=list)
    created: List[EntityUnion] = field(default_factory=list)
    trace_id: str | None = None

    def serialize(self) -> dict:
        """Return a JSON-serializable payload for API responses."""
        return {
            "project_id": self.project_id,
            "sheet_number": self.sheet_number,
            "dry_run": self.dry_run,
            "proposed": [model.model_dump() for model in self.proposed],
            "created": [entity.model_dump() for entity in self.created],
            "created_ids": [getattr(entity, "id", None) for entity in self.created],
            "trace_id": self.trace_id,
        }

