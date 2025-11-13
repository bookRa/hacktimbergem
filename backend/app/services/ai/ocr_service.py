"""OCR service interface and implementation.

Provides access to OCR data generated during ingestion.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class OCRBlock:
    """OCR text block with bounding box in PDF point space."""
    bbox: List[float]  # [x1, y1, x2, y2]
    text: str
    lines: List[Dict[str, Any]]  # Line-level OCR data


@dataclass
class OCRData:
    """Complete OCR data for a page."""
    page_number: int
    width_pts: float
    height_pts: float
    blocks: List[OCRBlock]


class IOCRService(ABC):
    """
    Abstract interface for OCR services.
    
    Provides access to text and layout information extracted from PDF pages.
    """
    
    @abstractmethod
    def get_ocr(self, project_id: str, sheet_number: int) -> OCRData:
        """
        Get OCR data for a specific sheet.
        
        Args:
            project_id: Project identifier
            sheet_number: Sheet number (1-based)
            
        Returns:
            OCR data with text blocks and bounding boxes
            
        Raises:
            FileNotFoundError: If OCR data not available
        """
        pass


__all__ = [
    "IOCRService",
    "OCRData",
    "OCRBlock",
]



