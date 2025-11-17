"""
Placeholder use case for automated visual/text linking.

This module will ultimately:
- Query existing entities/links for a sheet
- Score candidate relationships using spatial + embedding signals
- Create link suggestions that still run through CreateLinkUseCase after review
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol

from app.domain.models import EntityUnion
from app.use_cases.links.create_link import CreateLinkUseCase
from app.repositories.entity_repository import IEntityRepository


class LinkSuggestionStrategy(Protocol):
    """Produces candidate relationships for review."""

    def suggest(
        self,
        *,
        project_id: str,
        entities: Iterable[EntityUnion],
    ) -> Iterable[dict]:
        ...


@dataclass(slots=True)
class LinkContextsUseCase:
    """
    Future orchestration entrypoint for Workstream #4 (visual↔text linking).

    Args:
        entity_repo: Provides entities for candidate generation
        create_link: Existing use case for persistence
        strategy: Embedding/LLM-driven suggestion engine
    """

    entity_repo: IEntityRepository
    create_link: CreateLinkUseCase
    strategy: LinkSuggestionStrategy | None = None

    def execute(self, project_id: str, sheet_number: int | None = None) -> int:
        """
        Placeholder execution method.

        Should return the number of proposed or created links once implemented.
        """
        raise NotImplementedError(
            "LinkContextsUseCase is a planning placeholder; "
            "inject a LinkSuggestionStrategy before use."
        )


__all__ = ["LinkContextsUseCase", "LinkSuggestionStrategy"]

