"""
AI-focused use case stubs.

These placeholders document upcoming orchestration entrypoints for:
- Top-down scope/note extraction from OCR text
- Bottom-up symbol detection from raster crops
- Cross-modal linking and discrepancy analysis

Each module will eventually coordinate concrete AI services and call the
existing entity/link use cases so that manual and automated flows stay unified.
"""

from .detect_scopes import DetectScopesUseCase
from .detect_symbols import DetectSymbolsUseCase
from .link_contexts import LinkContextsUseCase

__all__ = [
    "DetectScopesUseCase",
    "DetectSymbolsUseCase",
    "LinkContextsUseCase",
]

