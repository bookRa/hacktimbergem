import json
from pathlib import Path

from app.services.ai.ocr_service import OCRData
from app.services.ai.playbook_artifacts import PlaybookArtifactLoader
from app.services.ai.strategies.playbook_scope import (
    PlaybookLegendParserStrategy,
    PlaybookScopeSuggestionStrategy,
)
from app.services.ai.implementations.playbook_visual_service import (
    PlaybookVisualDetectionService,
)


def _write_artifact(
    root: Path,
    ts: str,
    project_id: str,
    stage: str,
    *,
    sheet_number: int,
    proposals: list | None = None,
    detections: list | None = None,
) -> Path:
    stage_dir = root / ts / project_id / stage
    stage_dir.mkdir(parents=True, exist_ok=True)
    (stage_dir / "metadata.json").write_text(
        json.dumps(
            {
                "sheet_number": sheet_number,
                "project_id": project_id,
                "stage": stage,
            }
        ),
        encoding="utf-8",
    )
    if proposals is not None:
        (stage_dir / "proposals.json").write_text(
            json.dumps(proposals), encoding="utf-8"
        )
    if detections is not None:
        (stage_dir / "detections.json").write_text(
            json.dumps(detections), encoding="utf-8"
        )
    return stage_dir


def test_playbook_scope_strategy_prefers_newest_run(tmp_path):
    older = "20240101T000000Z"
    newer = "20240202T000000Z"
    project_id = "demo"

    _write_artifact(
        tmp_path,
        older,
        project_id,
        "scopes",
        sheet_number=1,
        proposals=[
            {
                "entity_type": "legend",
                "source_sheet_number": 1,
                "title": "Old Legend",
            }
        ],
    )
    _write_artifact(
        tmp_path,
        newer,
        project_id,
        "scopes",
        sheet_number=1,
        proposals=[
            {
                "entity_type": "legend",
                "source_sheet_number": 1,
                "title": "New Legend",
            }
        ],
    )

    loader = PlaybookArtifactLoader(tmp_path)
    strategy = PlaybookScopeSuggestionStrategy(loader=loader)
    dummy_ocr = OCRData(page_number=1, width_pts=1000, height_pts=1000, blocks=[])
    proposals = strategy.propose(
        project_id=project_id, sheet_number=1, ocr=dummy_ocr, regions=None
    )

    assert len(proposals) == 1
    assert getattr(proposals[0], "title") == "New Legend"


def test_playbook_visual_service_returns_detections(tmp_path):
    ts = "20240303T101010Z"
    project_id = "demo"
    detections = [
        {
            "entity_type": "symbol_instance",
            "source_sheet_number": 1,
            "bounding_box": [10, 10, 40, 40],
            "symbol_definition_id": "sym-1",
        }
    ]
    _write_artifact(
        tmp_path,
        ts,
        project_id,
        "symbols",
        sheet_number=1,
        detections=detections,
    )

    loader = PlaybookArtifactLoader(tmp_path)
    service = PlaybookVisualDetectionService(loader=loader)
    result = service.detect_symbols(project_id=project_id, sheet_number=1)
    assert result == detections


def test_playbook_legend_strategy_reads_payloads(tmp_path):
    ts = "20240404T090909Z"
    project_id = "demo"
    proposals = [
        {
            "entity_type": "legend",
            "source_sheet_number": 2,
            "title": "Legend A",
        },
        {
            "entity_type": "schedule",
            "source_sheet_number": 2,
            "title": "Door Schedule",
        },
    ]
    _write_artifact(
        tmp_path,
        ts,
        project_id,
        "legends",
        sheet_number=2,
        proposals=proposals,
    )

    loader = PlaybookArtifactLoader(tmp_path)
    strategy = PlaybookLegendParserStrategy(loader=loader)
    dummy_ocr = OCRData(page_number=2, width_pts=800, height_pts=600, blocks=[])
    parsed = strategy.parse(
        project_id=project_id, sheet_number=2, ocr=dummy_ocr, regions=None
    )

    assert len(parsed) == 2
    titles = {getattr(item, "title", None) for item in parsed}
    assert titles == {"Legend A", "Door Schedule"}



