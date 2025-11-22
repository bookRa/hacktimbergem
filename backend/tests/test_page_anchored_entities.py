from app.domain.models import CreateLegend
from app.domain.services.entity_validator import EntityValidator
from app.domain.services.spatial_analyzer import SpatialAnalyzer
from app.repositories.implementations.file_entity_repo import FileEntityRepository
from app.use_cases.entities.create_entity import CreateEntityUseCase


def _make_use_case(tmp_path):
    repo = FileEntityRepository(base_dir=str(tmp_path))
    validator = EntityValidator()
    analyzer = SpatialAnalyzer()
    return CreateEntityUseCase(
        entity_repo=repo,
        validator=validator,
        spatial_analyzer=analyzer,
        telemetry=None,
    )


def test_page_anchored_entity_sets_missing_bbox_flag(tmp_path):
    use_case = _make_use_case(tmp_path)
    payload = CreateLegend(
        entity_type="legend",
        source_sheet_number=1,
        title="Sheet Legend",
    )

    entity = use_case.execute("proj", payload)

    assert entity.bounding_box is None
    assert entity.status == "incomplete"
    assert entity.validation is not None
    assert entity.validation.missing is not None
    assert entity.validation.missing.bounding_box is True


def test_page_anchored_entity_with_bbox_is_complete(tmp_path):
    use_case = _make_use_case(tmp_path)
    payload = CreateLegend(
        entity_type="legend",
        source_sheet_number=1,
        bounding_box=[0, 0, 10, 10],
        title="Grounded Legend",
    )

    entity = use_case.execute("proj", payload)

    assert entity.bounding_box is not None
    assert (entity.validation is None) or (
        not entity.validation.missing
        or not getattr(entity.validation.missing, "bounding_box", None)
    )


