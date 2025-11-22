"""AI experimentation endpoints (dry-run only)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.dependencies import (
    get_detect_scopes_use_case,
    get_detect_symbols_use_case,
    get_legend_parser_use_case,
    get_project_repository,
    get_settings,
)

router = APIRouter(prefix="/api/projects", tags=["ai"])


class SheetRequest(BaseModel):
    sheet_number: int
    dry_run: bool = True
    limit: int | None = None


class SymbolRequest(SheetRequest):
    drawing_id: str | None = None
    confidence_threshold: float | None = None


def _require_ai_endpoints_enabled() -> None:
    settings = get_settings()
    if not settings.ai_playbooks_enabled:
        raise HTTPException(status_code=404, detail="AI endpoints are disabled")


def _ensure_project_exists(project_id: str) -> None:
    project_repo = get_project_repository()
    if not project_repo.exists(project_id):
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("/{project_id}/ai/scopes:detect")
async def detect_scopes(project_id: str, payload: SheetRequest):
    """Run (or simulate) scope detection via OCR-driven strategies."""
    _require_ai_endpoints_enabled()
    _ensure_project_exists(project_id)

    use_case = get_detect_scopes_use_case()
    try:
        result = use_case.execute(
            project_id,
            payload.sheet_number,
            dry_run=payload.dry_run,
            limit=payload.limit,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="OCR data not found")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result.serialize()


@router.post("/{project_id}/ai/legends:parse")
async def parse_legends(project_id: str, payload: SheetRequest):
    """Run the legend parser strategy for a sheet."""
    _require_ai_endpoints_enabled()
    _ensure_project_exists(project_id)

    use_case = get_legend_parser_use_case()
    try:
        result = use_case.execute(
            project_id,
            payload.sheet_number,
            dry_run=payload.dry_run,
            limit=payload.limit,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="OCR data not found")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result.serialize()


@router.post("/{project_id}/ai/symbols:detect")
async def detect_symbols(project_id: str, payload: SymbolRequest):
    """Run (or simulate) symbol detection from raster data."""
    _require_ai_endpoints_enabled()
    _ensure_project_exists(project_id)

    use_case = get_detect_symbols_use_case()
    try:
        result = use_case.execute(
            project_id,
            payload.sheet_number,
            dry_run=payload.dry_run,
            drawing_id=payload.drawing_id,
            confidence_threshold=payload.confidence_threshold,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result.serialize()


__all__ = ["router"]

