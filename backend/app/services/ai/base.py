"""Base AI service interfaces.

Defines the contract that all AI detection services must implement.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.domain.models import CreateEntityUnion


class DetectionContext(Dict[str, Any]):
    """
    Context information for AI detection.
    
    Can include:
    - drawing_id: Limit detection to specific drawing
    - confidence_threshold: Minimum confidence for proposals
    - user_hints: User-provided guidance
    """
    pass


class IAIDetectionService(ABC):
    """
    Abstract interface for AI-based entity detection services.
    
    All detection services (OCR-based, visual model-based) implement this interface
    to provide a unified way to detect and propose entities.
    """
    
    @abstractmethod
    def detect(
        self,
        project_id: str,
        sheet_number: int,
        entity_type: str,
        context: DetectionContext
    ) -> List[CreateEntityUnion]:
        """
        Detect entities of a specific type on a sheet.
        
        Args:
            project_id: Project identifier
            sheet_number: Sheet number (1-based)
            entity_type: Entity type to detect (e.g., 'note', 'drawing')
            context: Additional context for detection
            
        Returns:
            List of CreateEntityUnion payloads ready to be passed to CreateEntityUseCase
        """
        pass
    
    @abstractmethod
    def supported_types(self) -> List[str]:
        """
        Return list of entity types this service can detect.
        
        Returns:
            List of entity_type strings (e.g., ['note', 'legend'])
        """
        pass


__all__ = [
    "IAIDetectionService",
    "DetectionContext",
]



