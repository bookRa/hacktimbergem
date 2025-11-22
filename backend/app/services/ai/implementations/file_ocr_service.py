"""Filesystem-backed OCR service."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from app.services.ai.ocr_service import IOCRService, OCRBlock, OCRData


class FileOCRService(IOCRService):
    """Reads OCR artifacts produced during ingestion."""

    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)

    def get_ocr(self, project_id: str, sheet_number: int) -> OCRData:
        path = (
            self.base_dir / project_id / "ocr" / f"page_{sheet_number}.json"
        )
        if not path.exists():
            raise FileNotFoundError(
                f"OCR not found for project={project_id} sheet={sheet_number}"
            )

        payload = json.loads(path.read_text(encoding="utf-8"))
        blocks = _parse_blocks(payload.get("blocks", []))
        return OCRData(
            page_number=payload.get("page_number", sheet_number),
            width_pts=payload.get("width_pts", 0.0),
            height_pts=payload.get("height_pts", 0.0),
            blocks=blocks,
        )


def _parse_blocks(raw_blocks: List[dict]) -> List[OCRBlock]:
    blocks: List[OCRBlock] = []
    for block in raw_blocks:
        bbox = block.get("bbox") or block.get("bounding_box") or []
        text = block.get("text", "")
        lines = block.get("lines", [])
        if isinstance(lines, dict):
            lines = [lines]
        blocks.append(OCRBlock(bbox=bbox, text=text, lines=lines))
    return blocks


__all__ = ["FileOCRService"]

