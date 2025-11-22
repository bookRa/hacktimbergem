from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Literal, Optional

import yaml

EnvironmentLiteral = Literal["local", "colab", "api"]


@dataclass(frozen=True)
class ExperimentConfig:
    """Shared metadata describing an automation experiment."""

    run_name: str
    project_id: str
    sheet_number: int
    stage: str
    provider: str
    model: str
    environment: EnvironmentLiteral
    context_pdf: Optional[str] = None
    artifact_bucket: str = "automation_playbooks/artifacts"
    config_path: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_file(cls, path: str | Path) -> "ExperimentConfig":
        source = Path(path)
        with source.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        data.setdefault("run_name", source.stem)
        data["config_path"] = str(source)
        return cls(**data)

    def build_artifact_dir(self, timestamp: Optional[datetime] = None) -> Path:
        ts = timestamp or datetime.now(tz=timezone.utc)
        bucket = Path(self.artifact_bucket).expanduser().resolve()
        return bucket / ts.strftime("%Y%m%dT%H%M%SZ") / self.project_id / self.stage

    def metadata(self) -> Dict[str, Any]:
        meta = asdict(self)
        meta["generated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return meta


def ensure_artifact_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

