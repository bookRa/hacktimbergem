"""Layout segmentation service interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List


@dataclass
class LayoutRegion:
    """Region detected on a sheet (legend, schedule, drawing, etc.)."""

    region_type: str
    bbox: List[float]
    confidence: float | None = None


class LayoutSegmentationService(ABC):
    """Abstract interface for retrieving layout regions."""

    @abstractmethod
    def get_regions(self, project_id: str, sheet_number: int) -> List[LayoutRegion]:
        """Return layout regions for a sheet."""
        raise NotImplementedError


__all__ = ["LayoutSegmentationService", "LayoutRegion"]

