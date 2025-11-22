"""Dependency injection container.

Provides factory functions for FastAPI dependency injection.
All use cases and services are instantiated here with their dependencies.
"""

from functools import lru_cache
from pathlib import Path
from app.config import Settings
from app.repositories.entity_repository import IEntityRepository
from app.repositories.concept_repository import IConceptRepository
from app.repositories.link_repository import ILinkRepository
from app.repositories.project_repository import IProjectRepository
from app.repositories.implementations.file_entity_repo import FileEntityRepository
from app.repositories.implementations.file_concept_repo import FileConceptRepository
from app.repositories.implementations.file_link_repo import FileLinkRepository
from app.repositories.implementations.file_project_repo import FileProjectRepository
from app.domain.services.entity_validator import EntityValidator
from app.domain.services.spatial_analyzer import SpatialAnalyzer
from app.domain.services.link_validator import LinkValidator
from app.telemetry import Telemetry
from app.services.ai.ocr_service import IOCRService
from app.services.ai.implementations.file_ocr_service import FileOCRService
from app.services.ai.playbook_artifacts import PlaybookArtifactLoader
from app.services.ai.strategies.playbook_scope import (
    PlaybookLegendParserStrategy,
    PlaybookScopeSuggestionStrategy,
)
from app.services.ai.implementations.playbook_visual_service import (
    PlaybookVisualDetectionService,
)
from app.use_cases.ai.detect_scopes import DetectScopesUseCase, ScopeSuggestionStrategy
from app.use_cases.ai.detect_symbols import DetectSymbolsUseCase, SymbolPostProcessor
from app.use_cases.ai.legend_parser import LegendParserUseCase, LegendParserStrategy
from app.use_cases.entities.create_entity import CreateEntityUseCase
from app.use_cases.entities.update_entity import UpdateEntityUseCase
from app.use_cases.entities.delete_entity import DeleteEntityUseCase
from app.use_cases.entities.list_entities import ListEntitiesUseCase
from app.use_cases.concepts.create_concept import CreateConceptUseCase
from app.use_cases.concepts.update_concept import UpdateConceptUseCase
from app.use_cases.concepts.delete_concept import DeleteConceptUseCase
from app.use_cases.links.create_link import CreateLinkUseCase
from app.use_cases.links.delete_link import DeleteLinkUseCase


# ===== Configuration =====

def get_settings() -> Settings:
    """Get application settings (cached singleton)."""
    return Settings()


@lru_cache()
def get_telemetry_client() -> Telemetry:
    """Get shared telemetry client."""
    settings = get_settings()
    return Telemetry(settings=settings)


@lru_cache()
def get_ocr_service() -> IOCRService:
    """Get file-backed OCR service."""
    settings = get_settings()
    return FileOCRService(base_dir=settings.projects_dir)


@lru_cache()
def get_playbook_loader() -> PlaybookArtifactLoader | None:
    """Return a loader if artifacts directory exists."""
    settings = get_settings()
    artifacts = Path(settings.automation_artifacts_dir)
    if not settings.ai_playbooks_enabled or not artifacts.exists():
        return None
    return PlaybookArtifactLoader(artifacts_root=str(artifacts))


def get_scope_suggestion_strategy() -> ScopeSuggestionStrategy | None:
    """Hook for plugging in automation playbook outputs."""
    loader = get_playbook_loader()
    if not loader:
        return None
    return PlaybookScopeSuggestionStrategy(loader=loader)


def get_symbol_post_processor() -> SymbolPostProcessor | None:
    """Optional post-processing hook for symbol detections."""
    return None


def get_legend_parser_strategy() -> LegendParserStrategy | None:
    """Hook for plugging in legend parsers."""
    loader = get_playbook_loader()
    if not loader:
        return None
    return PlaybookLegendParserStrategy(loader=loader)


def get_visual_detection_service() -> PlaybookVisualDetectionService | None:
    """Return a visual detection service backed by playbook artifacts."""
    loader = get_playbook_loader()
    if not loader:
        return None
    return PlaybookVisualDetectionService(loader=loader)

# ===== Domain Services (Stateless, can be shared) =====

@lru_cache()
def get_entity_validator() -> EntityValidator:
    """Get entity validator."""
    return EntityValidator()


@lru_cache()
def get_spatial_analyzer() -> SpatialAnalyzer:
    """Get spatial analyzer."""
    return SpatialAnalyzer()


@lru_cache()
def get_link_validator() -> LinkValidator:
    """Get link validator."""
    return LinkValidator()


# ===== Repositories =====

def get_entity_repository() -> IEntityRepository:
    """Get entity repository."""
    settings = get_settings()
    return FileEntityRepository(base_dir=settings.projects_dir)


def get_concept_repository() -> IConceptRepository:
    """Get concept repository."""
    settings = get_settings()
    return FileConceptRepository(base_dir=settings.projects_dir)


def get_link_repository() -> ILinkRepository:
    """Get link repository."""
    settings = get_settings()
    return FileLinkRepository(base_dir=settings.projects_dir)


def get_project_repository() -> IProjectRepository:
    """Get project repository."""
    settings = get_settings()
    return FileProjectRepository(base_dir=settings.projects_dir)


# ===== Entity Use Cases =====

def get_create_entity_use_case(
    entity_repo: IEntityRepository = None,
    validator: EntityValidator = None,
    spatial_analyzer: SpatialAnalyzer = None,
    telemetry: Telemetry = None,
) -> CreateEntityUseCase:
    """Get create entity use case with dependencies."""
    if entity_repo is None:
        entity_repo = get_entity_repository()
    if validator is None:
        validator = get_entity_validator()
    if spatial_analyzer is None:
        spatial_analyzer = get_spatial_analyzer()
    if telemetry is None:
        telemetry = get_telemetry_client()
    
    return CreateEntityUseCase(
        entity_repo=entity_repo,
        validator=validator,
        spatial_analyzer=spatial_analyzer,
        telemetry=telemetry,
    )


def get_detect_scopes_use_case() -> DetectScopesUseCase:
    """Get AI scope detection use case."""
    return DetectScopesUseCase(
        ocr_service=get_ocr_service(),
        create_entity=get_create_entity_use_case(),
        strategy=get_scope_suggestion_strategy(),
        telemetry=get_telemetry_client(),
    )


def get_detect_symbols_use_case() -> DetectSymbolsUseCase:
    """Get AI symbol detection use case."""
    return DetectSymbolsUseCase(
        create_entity=get_create_entity_use_case(),
        visual_service=get_visual_detection_service(),
        post_processor=get_symbol_post_processor(),
        telemetry=get_telemetry_client(),
    )


def get_legend_parser_use_case() -> LegendParserUseCase:
    """Get AI legend parser use case."""
    return LegendParserUseCase(
        ocr_service=get_ocr_service(),
        create_entity=get_create_entity_use_case(),
        parser=get_legend_parser_strategy(),
        telemetry=get_telemetry_client(),
    )


def get_update_entity_use_case(
    entity_repo: IEntityRepository = None,
    validator: EntityValidator = None,
    spatial_analyzer: SpatialAnalyzer = None
) -> UpdateEntityUseCase:
    """Get update entity use case with dependencies."""
    if entity_repo is None:
        entity_repo = get_entity_repository()
    if validator is None:
        validator = get_entity_validator()
    if spatial_analyzer is None:
        spatial_analyzer = get_spatial_analyzer()
    
    return UpdateEntityUseCase(
        entity_repo=entity_repo,
        validator=validator,
        spatial_analyzer=spatial_analyzer
    )


def get_delete_entity_use_case(
    entity_repo: IEntityRepository = None,
    link_repo: ILinkRepository = None
) -> DeleteEntityUseCase:
    """Get delete entity use case with dependencies."""
    if entity_repo is None:
        entity_repo = get_entity_repository()
    if link_repo is None:
        link_repo = get_link_repository()
    
    return DeleteEntityUseCase(
        entity_repo=entity_repo,
        link_repo=link_repo
    )


def get_list_entities_use_case(
    entity_repo: IEntityRepository = None
) -> ListEntitiesUseCase:
    """Get list entities use case with dependencies."""
    if entity_repo is None:
        entity_repo = get_entity_repository()
    
    return ListEntitiesUseCase(entity_repo=entity_repo)


# ===== Concept Use Cases =====

def get_create_concept_use_case(
    concept_repo: IConceptRepository = None
) -> CreateConceptUseCase:
    """Get create concept use case with dependencies."""
    if concept_repo is None:
        concept_repo = get_concept_repository()
    
    return CreateConceptUseCase(concept_repo=concept_repo)


def get_update_concept_use_case(
    concept_repo: IConceptRepository = None
) -> UpdateConceptUseCase:
    """Get update concept use case with dependencies."""
    if concept_repo is None:
        concept_repo = get_concept_repository()
    
    return UpdateConceptUseCase(concept_repo=concept_repo)


def get_delete_concept_use_case(
    concept_repo: IConceptRepository = None,
    link_repo: ILinkRepository = None
) -> DeleteConceptUseCase:
    """Get delete concept use case with dependencies."""
    if concept_repo is None:
        concept_repo = get_concept_repository()
    if link_repo is None:
        link_repo = get_link_repository()
    
    return DeleteConceptUseCase(
        concept_repo=concept_repo,
        link_repo=link_repo
    )


# ===== Link Use Cases =====

def get_create_link_use_case(
    link_repo: ILinkRepository = None,
    entity_repo: IEntityRepository = None,
    concept_repo: IConceptRepository = None,
    link_validator: LinkValidator = None
) -> CreateLinkUseCase:
    """Get create link use case with dependencies."""
    if link_repo is None:
        link_repo = get_link_repository()
    if entity_repo is None:
        entity_repo = get_entity_repository()
    if concept_repo is None:
        concept_repo = get_concept_repository()
    if link_validator is None:
        link_validator = get_link_validator()
    
    return CreateLinkUseCase(
        link_repo=link_repo,
        entity_repo=entity_repo,
        concept_repo=concept_repo,
        link_validator=link_validator
    )


def get_delete_link_use_case(
    link_repo: ILinkRepository = None
) -> DeleteLinkUseCase:
    """Get delete link use case with dependencies."""
    if link_repo is None:
        link_repo = get_link_repository()
    
    return DeleteLinkUseCase(link_repo=link_repo)


__all__ = [
    "get_settings",
    "get_telemetry_client",
    "get_ocr_service",
    "get_scope_suggestion_strategy",
    "get_symbol_post_processor",
    "get_legend_parser_strategy",
    "get_entity_validator",
    "get_spatial_analyzer",
    "get_link_validator",
    "get_entity_repository",
    "get_concept_repository",
    "get_link_repository",
    "get_project_repository",
    "get_create_entity_use_case",
    "get_detect_scopes_use_case",
    "get_detect_symbols_use_case",
    "get_legend_parser_use_case",
    "get_update_entity_use_case",
    "get_delete_entity_use_case",
    "get_list_entities_use_case",
    "get_create_concept_use_case",
    "get_update_concept_use_case",
    "get_delete_concept_use_case",
    "get_create_link_use_case",
    "get_delete_link_use_case",
]

