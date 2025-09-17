"""File-based persistence for conceptual nodes (spaces, scopes).

Stores JSON array under projects/{project_id}/concepts.json
Each concept is stored as its dict representation (already validated by Pydantic).
"""

from __future__ import annotations

import os, json, uuid
from typing import List
from .ingest import project_dir
from .concepts_models import (
    ConceptUnion,
    CreateConceptUnion,
    Space,
    Scope,
)


CONCEPTS_FILENAME = "concepts.json"


def concepts_path(project_id: str) -> str:
    return os.path.join(project_dir(project_id), CONCEPTS_FILENAME)


def load_concepts(project_id: str) -> List[ConceptUnion]:
    path = concepts_path(project_id)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        raw = json.load(f)
    concepts: List[ConceptUnion] = []
    for item in raw:
        kind = item.get("kind")
        cls = {
            "space": Space,
            "scope": Scope,
        }.get(kind)
        if not cls:
            continue
        try:
            concepts.append(cls(**item))
        except Exception:
            continue
    return concepts


def _atomic_write(path: str, data):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def save_concepts(project_id: str, concepts: List[ConceptUnion]):
    os.makedirs(project_dir(project_id), exist_ok=True)
    path = concepts_path(project_id)
    serializable = [c.dict() for c in concepts]
    _atomic_write(path, serializable)


def create_concept(project_id: str, payload: CreateConceptUnion) -> ConceptUnion:
    concepts = load_concepts(project_id)
    new_id = uuid.uuid4().hex
    base_kwargs = {
        "id": new_id,
    }
    if payload.kind == "space":
        ent = Space(**base_kwargs, name=getattr(payload, "name"))
    elif payload.kind == "scope":
        ent = Scope(**base_kwargs, description=getattr(payload, "description"), category=getattr(payload, "category", None))
    else:
        raise ValueError("Unsupported concept kind")
    concepts.append(ent)
    save_concepts(project_id, concepts)
    return ent


def update_concept(
    project_id: str,
    concept_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    category: str | None = None,
) -> ConceptUnion:
    concepts = load_concepts(project_id)
    found = None
    for i, c in enumerate(concepts):
        if getattr(c, "id", None) == concept_id:
            found = (i, c)
            break
    if not found:
        raise ValueError("Concept not found")
    idx, current = found
    data = current.dict()
    if data["kind"] == "space":
        if name is not None:
            data["name"] = name
        cls = Space
    elif data["kind"] == "scope":
        if description is not None:
            data["description"] = description
        if category is not None:
            data["category"] = category
        cls = Scope
    else:
        raise ValueError("Unsupported concept kind")
    updated = cls(**data)
    concepts[idx] = updated
    save_concepts(project_id, concepts)
    return updated


def delete_concept(project_id: str, concept_id: str) -> bool:
    # Prevent deletion if any links reference this concept
    # Local import to avoid circular dependency
    from .links_store import load_links  # type: ignore

    links = load_links(project_id)
    for l in links:
        if getattr(l, "source_id", None) == concept_id or getattr(l, "target_id", None) == concept_id:
            raise ValueError("Cannot delete concept referenced by links")
    concepts = load_concepts(project_id)
    new_concepts = [c for c in concepts if getattr(c, "id", None) != concept_id]
    if len(new_concepts) == len(concepts):
        return False
    save_concepts(project_id, new_concepts)
    return True


__all__ = [
    "load_concepts",
    "save_concepts",
    "create_concept",
    "update_concept",
    "delete_concept",
    "concepts_path",
]


