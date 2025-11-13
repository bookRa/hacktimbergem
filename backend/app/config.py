"""Application configuration using Pydantic settings.

Environment variables prefixed with TIMBERGEM_ are automatically loaded.
Example: TIMBERGEM_PROJECTS_DIR=/path/to/projects
"""

from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # Storage
    projects_dir: str = "projects"
    
    # Rendering
    render_dpi: int = 300
    
    # OCR
    ocr_engine: str = "pymupdf"  # Future: "tesseract", "azure_cv", "google_vision"
    
    # AI Detection
    ai_detection_enabled: bool = True
    vision_model_endpoint: str = ""  # For future vision model services
    vision_model_confidence_threshold: float = 0.7
    
    # API
    api_title: str = "Timbergem Backend"
    api_version: str = "0.2.0"  # Bumped for Clean Architecture
    
    class Config:
        env_prefix = "TIMBERGEM_"
        env_file = ".env"
        env_file_encoding = "utf-8"


__all__ = ["Settings"]



