"""Visual detection service interfaces.

Defines interfaces for visual model-based entity detection.
These are STUBS with comprehensive documentation for future implementation.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class DetectedObject:
    """Object detected by visual model."""
    bbox: List[float]  # [x1, y1, x2, y2] in pixels
    confidence: float
    class_name: str
    class_id: int


@dataclass
class ClassificationResult:
    """Result of image region classification."""
    class_name: str
    confidence: float
    class_probabilities: Dict[str, float]


class IVisionModelClient(ABC):
    """
    Abstract interface for vision model inference.
    
    This is a STUB interface for future implementation.
    Provides a unified interface for various vision models (YOLO, LayoutLM, ViT, etc.)
    
    Recommended implementations:
    - HuggingFaceVisionClient: For LayoutLM, LayoutLMv3, ViT models via Transformers
    - YOLOClient: For custom YOLO models (ultralytics, detectron2)
    - OpenAIVisionClient: For GPT-4V API
    - OpenCVClient: For classical computer vision approaches
    """
    
    @abstractmethod
    def detect_objects(
        self,
        image_path: str,
        model_name: str,
        confidence_threshold: float = 0.5
    ) -> List[DetectedObject]:
        """
        Run object detection on an image.
        
        Args:
            image_path: Path to image file (PNG from pages/)
            model_name: Model identifier (e.g., 'yolov8-custom', 'layoutlmv3-base')
            confidence_threshold: Minimum confidence for detections
            
        Returns:
            List of detected objects with bboxes in pixel coordinates
        
        Implementation notes:
        - Bbox coordinates are in pixel space relative to image
        - Caller must convert to PDF space using coords.canvas_to_pdf()
        - Handle model loading/caching appropriately
        - Consider batch processing for performance
        """
        pass
    
    @abstractmethod
    def classify_region(
        self,
        image_path: str,
        bbox: List[float],
        classes: List[str]
    ) -> ClassificationResult:
        """
        Classify a specific region within an image.
        
        Args:
            image_path: Path to image file
            bbox: Region to classify [x1, y1, x2, y2] in pixels
            classes: List of possible class names
            
        Returns:
            Classification result with confidence scores
        
        Implementation notes:
        - Crop image to bbox before inference for better accuracy
        - Normalize bbox to handle out-of-bounds gracefully
        - Return all class probabilities for transparency
        """
        pass


class IVisualDetectionService(ABC):
    """
    Abstract interface for visual model-based entity detection.
    
    This is a high-level interface that builds on IVisionModelClient to provide
    entity-specific detection logic.
    
    Implementations should:
    1. Use IVisionModelClient for model inference
    2. Convert pixel bboxes to PDF space
    3. Apply entity-specific post-processing
    4. Generate CreateEntityUnion payloads
    """
    
    @abstractmethod
    def detect_drawings(
        self,
        project_id: str,
        sheet_number: int,
        confidence_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Detect drawing boundaries on a sheet.
        
        STUB: Future implementation.
        
        Recommended approach:
        1. LayoutLM/LayoutLMv3 for document layout analysis
        2. YOLO-based custom model trained on construction drawings
        3. Segment Anything Model (SAM) with prompt engineering
        4. Custom CNN for viewport/drawing boundary classification
        
        Returns:
            List of CreateDrawing payloads
        """
        pass
    
    @abstractmethod
    def detect_symbols(
        self,
        project_id: str,
        sheet_number: int,
        drawing_id: str | None = None,
        confidence_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Detect symbol instances (callouts, markers) on a sheet.
        
        STUB: Future implementation.
        
        Recommended approach:
        1. Object detection (YOLO, Faster R-CNN) trained on architectural symbols
        2. Template matching with rotation/scale invariance (OpenCV)
        3. Vision Transformer (ViT) for symbol classification
        4. Keypoint detection + OCR for reading symbol text
        
        Workflow:
        1. Detect symbol shapes (geometric patterns)
        2. Extract bounding boxes (in pixels)
        3. Convert to PDF space using coords.canvas_to_pdf()
        4. Run OCR on each detected region for recognized_text
        5. Match to SymbolDefinitions using visual similarity
        6. Generate CreateSymbolInstance payloads
        
        Returns:
            List of CreateSymbolInstance payloads
        """
        pass


__all__ = [
    "IVisionModelClient",
    "IVisualDetectionService",
    "DetectedObject",
    "ClassificationResult",
]



