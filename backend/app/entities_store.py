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
    SymbolInstance,
    ComponentInstance,
    ValidationInfo,
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
            "symbol_instance": SymbolInstance,
            "component_instance": ComponentInstance,
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
    validation = getattr(payload, "validation", None)
    if validation is not None and not isinstance(validation, ValidationInfo):
        try:
            validation = ValidationInfo.parse_obj(validation)
        except Exception:
            raise ValueError("Invalid validation payload")

    base_kwargs = {
        "id": new_id,
        "source_sheet_number": payload.source_sheet_number,
        "bounding_box": bbox,
        "status": getattr(payload, "status", None),
        "validation": validation,
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
            defined_in_id=getattr(payload, "defined_in_id", None),
        )
    elif payload.entity_type == "component_definition":
        ent = ComponentDefinition(
            **base_kwargs,
            name=getattr(payload, "name"),
            description=getattr(payload, "description", None),
            specifications=getattr(payload, "specifications", None),
            scope=getattr(payload, "scope", "sheet"),
            defined_in_id=getattr(payload, "defined_in_id", None),
        )
    elif payload.entity_type == "symbol_instance":
        # Validate referenced symbol definition exists and scope allows placement
        sym_def = _get_entity_by_id(entities, getattr(payload, "symbol_definition_id", ""))
        if not sym_def or getattr(sym_def, "entity_type", None) != "symbol_definition":
            raise ValueError("symbol_definition_id not found")
        # Scope check
        if getattr(sym_def, "scope", "sheet") == "sheet" and getattr(sym_def, "source_sheet_number", None) != payload.source_sheet_number:
            raise ValueError("SymbolDefinition scope is 'sheet' and must be used on the same sheet")
        ent = SymbolInstance(
            **base_kwargs,
            symbol_definition_id=getattr(payload, "symbol_definition_id"),
            recognized_text=getattr(payload, "recognized_text", None),
            instantiated_in_id=None,
        )
    elif payload.entity_type == "component_instance":
        comp_def = _get_entity_by_id(entities, getattr(payload, "component_definition_id", ""))
        if not comp_def or getattr(comp_def, "entity_type", None) != "component_definition":
            raise ValueError("component_definition_id not found")
        if getattr(comp_def, "scope", "sheet") == "sheet" and getattr(comp_def, "source_sheet_number", None) != payload.source_sheet_number:
            raise ValueError("ComponentDefinition scope is 'sheet' and must be used on the same sheet")
        ent = ComponentInstance(
            **base_kwargs,
            component_definition_id=getattr(payload, "component_definition_id"),
            instantiated_in_id=None,
        )
    else:
        raise ValueError("Unsupported entity_type")
    entities.append(ent)
    # Auto-link: if definition has no defined_in_id, and intersects a legend/schedule on same sheet, set defined_in_id
    if getattr(ent, "entity_type") == "symbol_definition" and not getattr(ent, "defined_in_id", None):
        parent = _find_intersecting_parent(entities, ent, parent_type="legend")
        if parent:
            ent.defined_in_id = parent.id  # type: ignore
    if getattr(ent, "entity_type") == "component_definition" and not getattr(ent, "defined_in_id", None):
        parent = _find_intersecting_parent(entities, ent, parent_type="schedule")
        if parent:
            ent.defined_in_id = parent.id  # type: ignore
    # For instances, auto-set instantiated_in_id by locating containing drawing
    if getattr(ent, "entity_type", None) in {"symbol_instance", "component_instance"}:  # type: ignore
        drawing = _find_containing_drawing(entities, ent)
        if not drawing:
            raise ValueError("Instance must be placed within a drawing on the same sheet")
        data = ent.dict()
        data["instantiated_in_id"] = drawing.id  # type: ignore
        ent_cls = SymbolInstance if ent.entity_type == "symbol_instance" else ComponentInstance  # type: ignore
        ent = ent_cls(**data)
        entities[-1] = ent

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
    symbol_definition_id: str | None = None,
    component_definition_id: str | None = None,
    recognized_text: str | None = None,
    status: str | None = None,
    validation: dict | ValidationInfo | None = None,
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
    if status is not None:
        if status not in {"incomplete", "complete"}:
            raise ValueError("status must be 'incomplete' or 'complete'")
        data["status"] = status
    if validation is not None:
        if isinstance(validation, ValidationInfo):
            data["validation"] = validation
        else:
            try:
                data["validation"] = ValidationInfo.parse_obj(validation)
            except Exception:
                raise ValueError("Invalid validation payload")
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
        "symbol_instance": SymbolInstance,
        "component_instance": ComponentInstance,
    }
    cls = cls_map[data["entity_type"]]
    updated = cls(**data)
    entities[idx] = updated
    # Instances: allow meta updates and ensure they remain inside a drawing
    if data["entity_type"] in {"symbol_instance", "component_instance"}:
        # Update linked fields if provided
        if data["entity_type"] == "symbol_instance":
            if symbol_definition_id is not None:
                sym_def = _get_entity_by_id(entities, symbol_definition_id)
                if not sym_def or getattr(sym_def, "entity_type", None) != "symbol_definition":
                    raise ValueError("symbol_definition_id not found")
                if getattr(sym_def, "scope", "sheet") == "sheet" and getattr(sym_def, "source_sheet_number", None) != data["source_sheet_number"]:
                    raise ValueError("SymbolDefinition scope is 'sheet' and must be used on the same sheet")
                data["symbol_definition_id"] = symbol_definition_id
            if recognized_text is not None:
                data["recognized_text"] = recognized_text
        if data["entity_type"] == "component_instance":
            if component_definition_id is not None:
                comp_def = _get_entity_by_id(entities, component_definition_id)
                if not comp_def or getattr(comp_def, "entity_type", None) != "component_definition":
                    raise ValueError("component_definition_id not found")
                    
                if getattr(comp_def, "scope", "sheet") == "sheet" and getattr(comp_def, "source_sheet_number", None) != data["source_sheet_number"]:
                    raise ValueError("ComponentDefinition scope is 'sheet' and must be used on the same sheet")
                data["component_definition_id"] = component_definition_id
        # Recompute instantiated_in_id from (possibly new) bbox
        temp_cls = cls_map[data["entity_type"]]
        temp_ent = temp_cls(**data)
        drawing = _find_containing_drawing(entities, temp_ent)
        if not drawing:
            raise ValueError("Instance must be placed within a drawing on the same sheet")
        data["instantiated_in_id"] = drawing.id
        # Rebuild updated entity and persist
        updated = cls_map[data["entity_type"]](**data)
        entities[idx] = updated

    # Auto-link or unlink on move/resize or meta update for definitions
    if updated.entity_type in {"symbol_definition", "component_definition"}:  # type: ignore
        parent_type = "legend" if updated.entity_type == "symbol_definition" else "schedule"  # type: ignore
        parent = _find_intersecting_parent(entities, updated, parent_type=parent_type)
        if parent:
            # If intersects, set defined_in_id if not set or differs
            if getattr(updated, "defined_in_id", None) != parent.id:  # type: ignore
                data2 = updated.dict()
                data2["defined_in_id"] = parent.id
                updated = cls_map[updated.entity_type](**data2)
                entities[idx] = updated
        else:
            # No intersecting parent: keep user-set defined_in_id as-is; do not forcibly clear
            pass
    save_entities(project_id, entities)
    return updated


def delete_entity(project_id: str, entity_id: str) -> bool:
    entities = load_entities(project_id)
    # Guard: prevent deleting definitions if instances reference them
    target = _get_entity_by_id(entities, entity_id)
    if target and getattr(target, "entity_type", None) in {"symbol_definition", "component_definition"}:
        for e in entities:
            if getattr(e, "entity_type", None) == "symbol_instance" and getattr(e, "symbol_definition_id", None) == entity_id:
                raise ValueError("Cannot delete definition with existing instances")
            if getattr(e, "entity_type", None) == "component_instance" and getattr(e, "component_definition_id", None) == entity_id:
                raise ValueError("Cannot delete definition with existing instances")
    # Guard: prevent deleting any entity referenced by links (graph edges)
    try:
        from .links_store import load_links  # type: ignore
        links = load_links(project_id)
        for l in links:
            if getattr(l, "source_id", None) == entity_id or getattr(l, "target_id", None) == entity_id:
                raise ValueError("Cannot delete entity referenced by links")
    except Exception:
        # If links store fails to load, be conservative and allow deletion to avoid deadlocks.
        # Future: log this condition.
        pass
    new_entities = [e for e in entities if getattr(e, "id", None) != entity_id]
    if len(new_entities) == len(entities):
        return False
    save_entities(project_id, new_entities)
    return True
def _intersects(a: BoundingBox, b: BoundingBox) -> bool:
    return not (a.x2 <= b.x1 or a.x1 >= b.x2 or a.y2 <= b.y1 or a.y1 >= b.y2)


def _find_intersecting_parent(entities: list[EntityUnion], child: EntityUnion, *, parent_type: str) -> EntityUnion | None:
    for e in entities:
        if getattr(e, "entity_type", None) != parent_type:
            continue
        if getattr(e, "source_sheet_number", None) != getattr(child, "source_sheet_number", None):
            continue
        try:
            if _intersects(e.bounding_box, child.bounding_box):  # type: ignore
                return e
        except Exception:
            continue
    return None


def _get_entity_by_id(entities: list[EntityUnion], entity_id: str) -> EntityUnion | None:
    for e in entities:
        if getattr(e, "id", None) == entity_id:
            return e
    return None


def _contains(a: BoundingBox, b: BoundingBox) -> bool:
    return (a.x1 <= b.x1) and (a.y1 <= b.y1) and (a.x2 >= b.x2) and (a.y2 >= b.y2)


def _find_containing_drawing(entities: list[EntityUnion], inst: EntityUnion) -> Drawing | None:
    for e in entities:
        if getattr(e, "entity_type", None) != "drawing":
            continue
        if getattr(e, "source_sheet_number", None) != getattr(inst, "source_sheet_number", None):
            continue
        try:
            if _contains(e.bounding_box, getattr(inst, "bounding_box")):  # type: ignore
                return e  # type: ignore
        except Exception:
            continue
    return None


__all__ = [
    "load_entities",
    "save_entities",
    "create_entity",
    "update_entity",
    "delete_entity",
    "entities_path",
]
