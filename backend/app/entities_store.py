"""File-based persistence for visual entities.

Stores JSON array under projects/{project_id}/entities.json
Each entity is stored as its dict representation (already validated by Pydantic).
"""

from __future__ import annotations

import os, json, uuid
from typing import List
from .ingest import project_dir
from .entities_models import (
    EntityUnion,
    CreateEntityUnion,
    BoundingBox,
    Drawing,
    Legend,
    Schedule,
    Note,
    SymbolDefinition,
    ComponentDefinition,
)

ENTITIES_FILENAME = "entities.json"


def entities_path(project_id: str) -> str:
    return os.path.join(project_dir(project_id), ENTITIES_FILENAME)


def load_entities(project_id: str) -> List[EntityUnion]:
    path = entities_path(project_id)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        raw = json.load(f)
    entities: List[EntityUnion] = []
    for item in raw:
        et = item.get("entity_type")
        cls = {
            "drawing": Drawing,
            "legend": Legend,
            "schedule": Schedule,
            "note": Note,
            "symbol_definition": SymbolDefinition,
            "component_definition": ComponentDefinition,
        }.get(et)
        if not cls:
            continue  # skip unknown types gracefully
        try:
            entities.append(cls(**item))
        except Exception:
            continue
    return entities


def _atomic_write(path: str, data):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def save_entities(project_id: str, entities: List[EntityUnion]):
    os.makedirs(project_dir(project_id), exist_ok=True)
    path = entities_path(project_id)
    serializable = [e.dict() for e in entities]
    _atomic_write(path, serializable)


def create_entity(project_id: str, payload: CreateEntityUnion) -> EntityUnion:
    """Validate and persist a new entity, returning the stored object."""
    entities = load_entities(project_id)
    new_id = uuid.uuid4().hex
    bbox_list = payload.bounding_box
    if len(bbox_list) != 4:
        raise ValueError("bounding_box must have 4 numbers")
    try:
        x1, y1, x2, y2 = [float(v) for v in bbox_list]
    except Exception:
        raise ValueError("bounding_box values must be numeric")
    if x2 <= x1 or y2 <= y1:
        raise ValueError("bounding_box must have x2>x1 and y2>y1")
    bbox = BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
    base_kwargs = {
        "id": new_id,
        "source_sheet_number": payload.source_sheet_number,
        "bounding_box": bbox,
    }
    if payload.entity_type == "drawing":
        ent = Drawing(**base_kwargs, title=getattr(payload, "title", None))
    elif payload.entity_type == "legend":
        ent = Legend(**base_kwargs, title=getattr(payload, "title", None))
    elif payload.entity_type == "schedule":
        ent = Schedule(**base_kwargs, title=getattr(payload, "title", None))
    elif payload.entity_type == "note":
        ent = Note(**base_kwargs, text=getattr(payload, "text", None))
    elif payload.entity_type == "symbol_definition":
        ent = SymbolDefinition(
            **base_kwargs,
            name=getattr(payload, "name"),
            description=getattr(payload, "description", None),
            visual_pattern_description=getattr(payload, "visual_pattern_description", None),
            scope=getattr(payload, "scope", "sheet"),
            defined_in_id=getattr(payload, "defined_in_id"),
        )
    elif payload.entity_type == "component_definition":
        ent = ComponentDefinition(
            **base_kwargs,
            name=getattr(payload, "name"),
            description=getattr(payload, "description", None),
            specifications=getattr(payload, "specifications", None),
            scope=getattr(payload, "scope", "sheet"),
            defined_in_id=getattr(payload, "defined_in_id"),
        )
    else:
        raise ValueError("Unsupported entity_type")
    entities.append(ent)
    save_entities(project_id, entities)
    return ent


def update_entity(
    project_id: str,
    entity_id: str,
    *,
    bounding_box: list[float] | None = None,
    title: str | None = None,
    text: str | None = None,
    name: str | None = None,
    description: str | None = None,
    visual_pattern_description: str | None = None,
    scope: str | None = None,
    defined_in_id: str | None = None,
    specifications: dict | None = None,
) -> EntityUnion:
    entities = load_entities(project_id)
    found = None
    for i, e in enumerate(entities):
        if getattr(e, "id", None) == entity_id:
            found = (i, e)
            break
    if not found:
        raise ValueError("Entity not found")
    idx, current = found
    data = current.dict()
    if bounding_box is not None:
        if len(bounding_box) != 4:
            raise ValueError("bounding_box must have 4 numbers")
        try:
            x1, y1, x2, y2 = [float(v) for v in bounding_box]
        except Exception:
            raise ValueError("bounding_box values must be numeric")
        if x2 <= x1 or y2 <= y1:
            raise ValueError("bounding_box must have x2>x1 and y2>y1")
        data["bounding_box"] = BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
    # Title for drawing/legend/schedule; text for note
    if title is not None and data["entity_type"] in {"drawing", "legend", "schedule"}:
        data["title"] = title
    if text is not None and data["entity_type"] == "note":
        data["text"] = text
    # Definitions metadata
    if data["entity_type"] in {"symbol_definition", "component_definition"}:
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        if visual_pattern_description is not None and data["entity_type"] == "symbol_definition":
            data["visual_pattern_description"] = visual_pattern_description
        if scope is not None:
            if scope not in {"project", "sheet"}:
                raise ValueError("scope must be 'project' or 'sheet'")
            data["scope"] = scope
        if defined_in_id is not None:
            data["defined_in_id"] = defined_in_id
        if specifications is not None and data["entity_type"] == "component_definition":
            if not isinstance(specifications, dict):
                raise ValueError("specifications must be an object")
            data["specifications"] = specifications
    # Reconstruct entity
    cls_map = {
        "drawing": Drawing,
        "legend": Legend,
        "schedule": Schedule,
        "note": Note,
        "symbol_definition": SymbolDefinition,
        "component_definition": ComponentDefinition,
    }
    cls = cls_map[data["entity_type"]]
    updated = cls(**data)
    entities[idx] = updated
    save_entities(project_id, entities)
    return updated


def delete_entity(project_id: str, entity_id: str) -> bool:
    entities = load_entities(project_id)
    new_entities = [e for e in entities if getattr(e, "id", None) != entity_id]
    if len(new_entities) == len(entities):
        return False
    save_entities(project_id, new_entities)
    return True


__all__ = [
    "load_entities",
    "save_entities",
    "create_entity",
    "update_entity",
    "delete_entity",
    "entities_path",
]
