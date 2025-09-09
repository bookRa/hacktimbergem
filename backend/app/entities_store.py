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
    else:
        raise ValueError("Unsupported entity_type")
    entities.append(ent)
    save_entities(project_id, entities)
    return ent


__all__ = [
    "load_entities",
    "save_entities",
    "create_entity",
    "entities_path",
]
