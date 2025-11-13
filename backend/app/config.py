"""Application configuration.

Settings can be configured via environment variables prefixed with TIMBERGEM_
Example: TIMBERGEM_PROJECTS_DIR=/path/to/projects
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    """Application settings loaded from environment."""
    
    # Storage
    projects_dir: str = os.getenv("TIMBERGEM_PROJECTS_DIR", "projects")
    
    # Rendering
    render_dpi: int = int(os.getenv("TIMBERGEM_RENDER_DPI", "300"))
    
    # OCR
    ocr_engine: str = os.getenv("TIMBERGEM_OCR_ENGINE", "pymupdf")
    
    # AI Detection
    ai_detection_enabled: bool = os.getenv("TIMBERGEM_AI_DETECTION_ENABLED", "true").lower() == "true"
    vision_model_endpoint: str = os.getenv("TIMBERGEM_VISION_MODEL_ENDPOINT", "")
    vision_model_confidence_threshold: float = float(os.getenv("TIMBERGEM_VISION_MODEL_CONFIDENCE_THRESHOLD", "0.7"))
    
    # API
    api_title: str = "Timbergem Backend"
    api_version: str = "0.2.0"  # Bumped for Clean Architecture


__all__ = ["Settings"]
