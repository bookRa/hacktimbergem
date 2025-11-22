"""Application configuration.

Settings can be configured via environment variables prefixed with TIMBERGEM_
Example: TIMBERGEM_PROJECTS_DIR=/path/to/projects
"""

import os
from dataclasses import dataclass, field


def _bool_env(key: str, default: str = "false") -> bool:
    return os.getenv(key, default).lower() == "true"


def _int_env(key: str, default: str) -> int:
    return int(os.getenv(key, default))


def _float_env(key: str, default: str) -> float:
    return float(os.getenv(key, default))


@dataclass
class Settings:
    """Application settings loaded from environment."""
    
    # Storage
    projects_dir: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_PROJECTS_DIR", "projects")
    )
    
    # Rendering
    render_dpi: int = field(
        default_factory=lambda: _int_env("TIMBERGEM_RENDER_DPI", "300")
    )
    
    # OCR
    ocr_engine: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_OCR_ENGINE", "pymupdf")
    )
    
    # AI Detection
    ai_detection_enabled: bool = field(
        default_factory=lambda: _bool_env("TIMBERGEM_AI_DETECTION_ENABLED", "true")
    )
    vision_model_endpoint: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_VISION_MODEL_ENDPOINT", "")
    )
    vision_model_confidence_threshold: float = field(
        default_factory=lambda: _float_env(
            "TIMBERGEM_VISION_MODEL_CONFIDENCE_THRESHOLD", "0.7"
        )
    )
    
    # API
    api_title: str = "Timbergem Backend"
    api_version: str = "0.2.0"  # Bumped for Clean Architecture

    # Environment & telemetry
    environment: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_ENVIRONMENT", "local")
    )
    tracing_enabled: bool = field(
        default_factory=lambda: _bool_env("TIMBERGEM_TRACING_ENABLED", "false")
    )
    otlp_endpoint: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_OTLP_ENDPOINT", "")
    )
    otlp_headers: str = field(
        default_factory=lambda: os.getenv("TIMBERGEM_OTLP_HEADERS", "")
    )
    langsmith_api_key: str = field(
        default_factory=lambda: os.getenv("LANGSMITH_API_KEY", "")
    )
    langsmith_project: str = field(
        default_factory=lambda: os.getenv("LANGSMITH_PROJECT", "TimberGem")
    )
    ai_playbooks_enabled: bool = field(
        default_factory=lambda: _bool_env("TIMBERGEM_AI_PLAYBOOKS_ENABLED", "false")
    )
    automation_artifacts_dir: str = field(
        default_factory=lambda: os.getenv(
            "TIMBERGEM_AUTOMATION_ARTIFACTS_DIR", "automation_playbooks/artifacts"
        )
    )


__all__ = ["Settings"]
