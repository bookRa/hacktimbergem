"""File-based persistence for relationships (graph edges).

Stores JSON array under projects/{project_id}/links.json
Each link is stored as its dict representation (already validated by Pydantic).
"""

from __future__ import annotations

import os, json, uuid
from typing import List, Tuple, Set
from .ingest import project_dir
from .concepts_models import Relationship, CreateRelationship
from .entities_store import load_entities
from .concepts_store import load_concepts


LINKS_FILENAME = "links.json"


# Allowed relationship pairs per PRD (initial subset)
# Map: rel_type -> (allowed_source_kinds, allowed_target_kinds)
# Visual entities do not have a `kind`, they have `entity_type`. For validation
# we will treat their kind as that entity_type string.
ALLOWED: dict[str, Tuple[Set[str], Set[str]]] = {
    "JUSTIFIED_BY": (set(["scope"]), set(["note", "symbol_instance", "component_instance"])),
    "LOCATED_IN": (set(["symbol_instance", "component_instance"]), set(["space"])),
    "DEPICTS": (set(["drawing"]), set(["space"])),
}


def links_path(project_id: str) -> str:
    return os.path.join(project_dir(project_id), LINKS_FILENAME)


def load_links(project_id: str) -> List[Relationship]:
    path = links_path(project_id)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        raw = json.load(f)
    links: List[Relationship] = []
    for item in raw:
        try:
            links.append(Relationship(**item))
        except Exception:
            continue
    return links


def _atomic_write(path: str, data):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def save_links(project_id: str, links: List[Relationship]):
    os.makedirs(project_dir(project_id), exist_ok=True)
    path = links_path(project_id)
    serializable = [l.dict() for l in links]
    _atomic_write(path, serializable)


def _id_kind(project_id: str, obj_id: str) -> str | None:
    # Return an abstract kind string for validation, or None if id not found.
    ents = load_entities(project_id)
    for e in ents:
        if getattr(e, "id", None) == obj_id:
            return getattr(e, "entity_type", None)
    cons = load_concepts(project_id)
    for c in cons:
        if getattr(c, "id", None) == obj_id:
            return getattr(c, "kind", None)
    return None


def create_link(project_id: str, payload: CreateRelationship) -> Relationship:
    links = load_links(project_id)
    # Existence and kind validation
    sk = _id_kind(project_id, payload.source_id)
    tk = _id_kind(project_id, payload.target_id)
    if sk is None:
        raise ValueError("source_id not found")
    if tk is None:
        raise ValueError("target_id not found")
    allowed = ALLOWED.get(payload.rel_type)
    if not allowed:
        raise ValueError("Unsupported rel_type")
    allowed_sources, allowed_targets = allowed
    if sk not in allowed_sources:
        raise ValueError(f"Invalid source kind '{sk}' for {payload.rel_type}")
    if tk not in allowed_targets:
        raise ValueError(f"Invalid target kind '{tk}' for {payload.rel_type}")
    # Prevent duplicates
    for l in links:
        if l.rel_type == payload.rel_type and l.source_id == payload.source_id and l.target_id == payload.target_id:
            raise ValueError("Duplicate link")
    new = Relationship(id=uuid.uuid4().hex, rel_type=payload.rel_type, source_id=payload.source_id, target_id=payload.target_id)
    links.append(new)
    save_links(project_id, links)
    return new


def delete_link(project_id: str, link_id: str) -> bool:
    links = load_links(project_id)
    new_links = [l for l in links if getattr(l, "id", None) != link_id]
    if len(new_links) == len(links):
        return False
    save_links(project_id, new_links)
    return True


__all__ = [
    "load_links",
    "save_links",
    "create_link",
    "delete_link",
    "links_path",
    "ALLOWED",
]


