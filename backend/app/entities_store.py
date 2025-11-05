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
    LegendItem,
    Schedule,
    ScheduleItem,
    AssemblyGroup,
    Assembly,
    Note,
    Scope,
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
            "legend_item": LegendItem,
            "schedule": Schedule,
            "schedule_item": ScheduleItem,
            "assembly_group": AssemblyGroup,
            "assembly": Assembly,
            "note": Note,
            "scope": Scope,
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
    
    # Validate and process bounding_box if present (conceptual scopes may not have bbox)
    bbox = None
    if hasattr(payload, 'bounding_box') and payload.bounding_box is not None:
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
        ent = Drawing(
            **base_kwargs,
            title=getattr(payload, "title", None),
            description=getattr(payload, "description", None),
        )
    elif payload.entity_type == "legend":
        ent = Legend(
            **base_kwargs,
            title=getattr(payload, "title", None),
            notes=getattr(payload, "notes", None),
        )
    elif payload.entity_type == "legend_item":
        # Validate parent legend exists
        parent = _get_entity_by_id(entities, getattr(payload, "legend_id", ""))
        if not parent or getattr(parent, "entity_type", None) != "legend":
            raise ValueError("legend_id not found or invalid")
        ent = LegendItem(
            **base_kwargs,
            legend_id=getattr(payload, "legend_id"),
            symbol_text=getattr(payload, "symbol_text", None),
            description=getattr(payload, "description", None),
            notes=getattr(payload, "notes", None),
        )
    elif payload.entity_type == "schedule":
        ent = Schedule(
            **base_kwargs,
            title=getattr(payload, "title", None),
            schedule_type=getattr(payload, "schedule_type", None),
            notes=getattr(payload, "notes", None),
        )
    elif payload.entity_type == "schedule_item":
        # Validate parent schedule exists
        parent = _get_entity_by_id(entities, getattr(payload, "schedule_id", ""))
        if not parent or getattr(parent, "entity_type", None) != "schedule":
            raise ValueError("schedule_id not found or invalid")
        # Validate drawing_id if provided
        drawing_id = getattr(payload, "drawing_id", None)
        if drawing_id:
            drawing = _get_entity_by_id(entities, drawing_id)
            if not drawing or getattr(drawing, "entity_type", None) != "drawing":
                raise ValueError("drawing_id not found or invalid")
        ent = ScheduleItem(
            **base_kwargs,
            schedule_id=getattr(payload, "schedule_id"),
            mark=getattr(payload, "mark", None),
            description=getattr(payload, "description", None),
            notes=getattr(payload, "notes", None),
            specifications=getattr(payload, "specifications", None),
            drawing_id=drawing_id,
        )
    elif payload.entity_type == "assembly_group":
        ent = AssemblyGroup(
            **base_kwargs,
            title=getattr(payload, "title", None),
            notes=getattr(payload, "notes", None),
        )
    elif payload.entity_type == "assembly":
        # Validate parent assembly_group exists
        parent = _get_entity_by_id(entities, getattr(payload, "assembly_group_id", ""))
        if not parent or getattr(parent, "entity_type", None) != "assembly_group":
            raise ValueError("assembly_group_id not found or invalid")
        # Validate drawing_id if provided
        drawing_id = getattr(payload, "drawing_id", None)
        if drawing_id:
            drawing = _get_entity_by_id(entities, drawing_id)
            if not drawing or getattr(drawing, "entity_type", None) != "drawing":
                raise ValueError("drawing_id not found or invalid")
        ent = Assembly(
            **base_kwargs,
            assembly_group_id=getattr(payload, "assembly_group_id"),
            code=getattr(payload, "code", None),
            name=getattr(payload, "name", None),
            description=getattr(payload, "description", None),
            notes=getattr(payload, "notes", None),
            specifications=getattr(payload, "specifications", None),
            drawing_id=drawing_id,
        )
    elif payload.entity_type == "note":
        ent = Note(**base_kwargs, text=getattr(payload, "text", None))
    elif payload.entity_type == "scope":
        ent = Scope(
            **base_kwargs,
            name=getattr(payload, "name", None),
            description=getattr(payload, "description", None),
        )
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
        
        # Validate definition_item if provided
        definition_item_id = getattr(payload, "definition_item_id", None)
        definition_item_type = getattr(payload, "definition_item_type", None)
        if definition_item_id and definition_item_type:
            def_item = _get_entity_by_id(entities, definition_item_id)
            if not def_item:
                raise ValueError("definition_item_id not found")
            expected_type = definition_item_type
            actual_type = getattr(def_item, "entity_type", None)
            if actual_type != expected_type:
                raise ValueError(f"definition_item_type mismatch: expected {expected_type}, got {actual_type}")
        
        ent = SymbolInstance(
            **base_kwargs,
            symbol_definition_id=getattr(payload, "symbol_definition_id"),
            recognized_text=getattr(payload, "recognized_text", None),
            definition_item_id=definition_item_id,
            definition_item_type=definition_item_type,
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
    # For instances, auto-set instantiated_in_id by locating containing drawing (if bbox exists and drawing found)
    if getattr(ent, "entity_type", None) in {"symbol_instance", "component_instance"}:  # type: ignore
        bbox = getattr(ent, "bounding_box", None)
        if bbox is not None:
            # Canvas-based instance: try to find containing drawing
            drawing = _find_containing_drawing(entities, ent)
            if drawing:
                # Found a containing drawing - set the reference
                data = ent.dict()
                data["instantiated_in_id"] = drawing.id  # type: ignore
                ent_cls = SymbolInstance if ent.entity_type == "symbol_instance" else ComponentInstance  # type: ignore
                ent = ent_cls(**data)
                entities[-1] = ent
            # If no drawing found, instantiated_in_id remains None (instance is on canvas but not in a drawing)
        # Conceptual instance (no bbox): instantiated_in_id remains None

    save_entities(project_id, entities)
    return ent


# Sentinel to distinguish "not provided" from "explicitly None"
_NOT_PROVIDED = object()

def update_entity(
    project_id: str,
    entity_id: str,
    *,
    bounding_box: list[float] | None = _NOT_PROVIDED,  # type: ignore
    source_sheet_number: int | None = _NOT_PROVIDED,  # type: ignore
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
    instantiated_in_id: str | None = _NOT_PROVIDED,  # type: ignore  # Manual drawing link for instances
    # New fields for container/item types
    notes: str | None = None,
    schedule_type: str | None = None,
    legend_id: str | None = None,
    schedule_id: str | None = None,
    assembly_group_id: str | None = None,
    symbol_text: str | None = None,
    mark: str | None = None,
    code: str | None = None,
    drawing_id: str | None = None,
    definition_item_id: str | None = None,
    definition_item_type: str | None = None,
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
    # Handle bounding_box - can be explicit None to remove location
    if bounding_box is not _NOT_PROVIDED:
        if bounding_box is None:
            # Explicitly set to None to remove location
            data["bounding_box"] = None
        else:
            if len(bounding_box) != 4:
                raise ValueError("bounding_box must have 4 numbers")
            try:
                x1, y1, x2, y2 = [float(v) for v in bounding_box]
            except Exception:
                raise ValueError("bounding_box values must be numeric")
            if x2 <= x1 or y2 <= y1:
                raise ValueError("bounding_box must have x2>x1 and y2>y1")
            data["bounding_box"] = BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
    
    # Handle source_sheet_number - can be explicit None to remove location
    if source_sheet_number is not _NOT_PROVIDED:
        data["source_sheet_number"] = source_sheet_number
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
    # Title for drawing/legend/schedule/assembly_group; text for note
    if title is not None and data["entity_type"] in {"drawing", "legend", "schedule", "assembly_group"}:
        data["title"] = title
    if text is not None and data["entity_type"] == "note":
        data["text"] = text
    if description is not None and data["entity_type"] in {"drawing", "scope", "symbol_definition", "component_definition", "legend_item", "schedule_item", "assembly"}:
        data["description"] = description
    
    # Notes field for containers and items
    if notes is not None and data["entity_type"] in {"legend", "schedule", "assembly_group", "legend_item", "schedule_item", "assembly"}:
        data["notes"] = notes
    
    # Schedule type
    if schedule_type is not None and data["entity_type"] == "schedule":
        data["schedule_type"] = schedule_type
    
    # Item-specific fields
    if data["entity_type"] == "legend_item":
        if legend_id is not None:
            # Validate parent exists
            parent = _get_entity_by_id(entities, legend_id)
            if not parent or getattr(parent, "entity_type", None) != "legend":
                raise ValueError("legend_id not found or invalid")
            data["legend_id"] = legend_id
        if symbol_text is not None:
            data["symbol_text"] = symbol_text
    
    if data["entity_type"] == "schedule_item":
        if schedule_id is not None:
            # Validate parent exists
            parent = _get_entity_by_id(entities, schedule_id)
            if not parent or getattr(parent, "entity_type", None) != "schedule":
                raise ValueError("schedule_id not found or invalid")
            data["schedule_id"] = schedule_id
        if mark is not None:
            data["mark"] = mark
        if specifications is not None:
            if not isinstance(specifications, dict):
                raise ValueError("specifications must be an object")
            data["specifications"] = specifications
        if drawing_id is not None:
            # Validate drawing exists
            drawing = _get_entity_by_id(entities, drawing_id)
            if not drawing or getattr(drawing, "entity_type", None) != "drawing":
                raise ValueError("drawing_id not found or invalid")
            data["drawing_id"] = drawing_id
    
    if data["entity_type"] == "assembly":
        if assembly_group_id is not None:
            # Validate parent exists
            parent = _get_entity_by_id(entities, assembly_group_id)
            if not parent or getattr(parent, "entity_type", None) != "assembly_group":
                raise ValueError("assembly_group_id not found or invalid")
            data["assembly_group_id"] = assembly_group_id
        if code is not None:
            data["code"] = code
        if name is not None:
            data["name"] = name
        if specifications is not None:
            if not isinstance(specifications, dict):
                raise ValueError("specifications must be an object")
            data["specifications"] = specifications
        if drawing_id is not None:
            # Validate drawing exists
            drawing = _get_entity_by_id(entities, drawing_id)
            if not drawing or getattr(drawing, "entity_type", None) != "drawing":
                raise ValueError("drawing_id not found or invalid")
            data["drawing_id"] = drawing_id
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
        "legend_item": LegendItem,
        "schedule": Schedule,
        "schedule_item": ScheduleItem,
        "assembly_group": AssemblyGroup,
        "assembly": Assembly,
        "note": Note,
        "scope": Scope,
        "symbol_definition": SymbolDefinition,
        "component_definition": ComponentDefinition,
        "symbol_instance": SymbolInstance,
        "component_instance": ComponentInstance,
    }
    if data["entity_type"] == "scope":
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
    cls = cls_map[data["entity_type"]]
    updated = cls(**data)
    entities[idx] = updated
    # Instances: allow meta updates and optionally recompute drawing containment
    if data["entity_type"] in {"symbol_instance", "component_instance"}:
        # Update linked fields if provided
        if data["entity_type"] == "symbol_instance":
            if symbol_definition_id is not None:
                sym_def = _get_entity_by_id(entities, symbol_definition_id)
                if not sym_def or getattr(sym_def, "entity_type", None) != "symbol_definition":
                    raise ValueError("symbol_definition_id not found")
                # Only validate sheet match if instance has a sheet
                if data.get("source_sheet_number") is not None:
                    if getattr(sym_def, "scope", "sheet") == "sheet" and getattr(sym_def, "source_sheet_number", None) != data["source_sheet_number"]:
                        raise ValueError("SymbolDefinition scope is 'sheet' and must be used on the same sheet")
                data["symbol_definition_id"] = symbol_definition_id
            if recognized_text is not None:
                data["recognized_text"] = recognized_text
            # Handle definition_item linking
            if definition_item_id is not None or definition_item_type is not None:
                if definition_item_id and definition_item_type:
                    # Validate definition item exists and matches type
                    def_item = _get_entity_by_id(entities, definition_item_id)
                    if not def_item:
                        raise ValueError("definition_item_id not found")
                    expected_type = definition_item_type
                    actual_type = getattr(def_item, "entity_type", None)
                    if actual_type != expected_type:
                        raise ValueError(f"definition_item_type mismatch: expected {expected_type}, got {actual_type}")
                    data["definition_item_id"] = definition_item_id
                    data["definition_item_type"] = definition_item_type
                elif definition_item_id is None and definition_item_type is None:
                    # Clear both (allow unsetting)
                    data["definition_item_id"] = None
                    data["definition_item_type"] = None
                else:
                    # One provided without the other
                    raise ValueError("Both definition_item_id and definition_item_type must be provided together or both set to None")
        if data["entity_type"] == "component_instance":
            if component_definition_id is not None:
                comp_def = _get_entity_by_id(entities, component_definition_id)
                if not comp_def or getattr(comp_def, "entity_type", None) != "component_definition":
                    raise ValueError("component_definition_id not found")
                # Only validate sheet match if instance has a sheet
                if data.get("source_sheet_number") is not None:
                    if getattr(comp_def, "scope", "sheet") == "sheet" and getattr(comp_def, "source_sheet_number", None) != data["source_sheet_number"]:
                        raise ValueError("ComponentDefinition scope is 'sheet' and must be used on the same sheet")
                data["component_definition_id"] = component_definition_id
        
        # Handle instantiated_in_id (drawing linkage)
        if instantiated_in_id is not _NOT_PROVIDED:
            # Manual drawing link provided - validate and use it
            if instantiated_in_id is not None:
                drawing = _get_entity_by_id(entities, instantiated_in_id)
                if not drawing or getattr(drawing, "entity_type", None) != "drawing":
                    raise ValueError("instantiated_in_id must reference a valid drawing")
                # Validate same sheet
                if getattr(drawing, "source_sheet_number", None) != data.get("source_sheet_number"):
                    raise ValueError("Instance and drawing must be on the same sheet")
            data["instantiated_in_id"] = instantiated_in_id
        else:
            # Auto-compute instantiated_in_id from bbox if not manually provided
            if data.get("bounding_box") is not None:
                # Canvas-based instance: try to find containing drawing
                temp_cls = cls_map[data["entity_type"]]
                temp_ent = temp_cls(**data)
                drawing = _find_containing_drawing(entities, temp_ent)
                if drawing:
                    # Found a containing drawing - set the reference
                    data["instantiated_in_id"] = drawing.id
                else:
                    # No drawing found - instance is on canvas but not in a drawing
                    data["instantiated_in_id"] = None
            else:
                # Conceptual instance: clear instantiated_in_id
                data["instantiated_in_id"] = None
        
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
    
    # Guard: prevent deleting containers if they have child items
    if target and getattr(target, "entity_type", None) == "legend":
        for e in entities:
            if getattr(e, "entity_type", None) == "legend_item" and getattr(e, "legend_id", None) == entity_id:
                raise ValueError("Cannot delete legend with existing legend items")
    if target and getattr(target, "entity_type", None) == "schedule":
        for e in entities:
            if getattr(e, "entity_type", None) == "schedule_item" and getattr(e, "schedule_id", None) == entity_id:
                raise ValueError("Cannot delete schedule with existing schedule items")
    if target and getattr(target, "entity_type", None) == "assembly_group":
        for e in entities:
            if getattr(e, "entity_type", None) == "assembly" and getattr(e, "assembly_group_id", None) == entity_id:
                raise ValueError("Cannot delete assembly group with existing assemblies")
    
    # Guard: prevent deleting items if symbol instances reference them
    if target and getattr(target, "entity_type", None) in {"legend_item", "schedule_item", "assembly"}:
        for e in entities:
            if getattr(e, "entity_type", None) == "symbol_instance" and getattr(e, "definition_item_id", None) == entity_id:
                raise ValueError("Cannot delete definition item with symbol instances referencing it")
    
    # CASCADE: Delete any links referencing this entity
    try:
        from .links_store import load_links, save_links  # type: ignore
        links = load_links(project_id)
        # Filter out links that reference the entity being deleted
        filtered_links = [
            l for l in links 
            if getattr(l, "source_id", None) != entity_id and getattr(l, "target_id", None) != entity_id
        ]
        if len(filtered_links) < len(links):
            # Some links were removed, save the updated list
            save_links(project_id, filtered_links)
    except Exception as e:
        # If links store fails, log but continue with entity deletion
        print(f"Warning: Failed to cascade delete links for entity {entity_id}: {e}")
    
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
