// API client for conceptual nodes (spaces, scopes)

export type ConceptKind = 'space' | 'scope';

export interface BaseConcept { id: string; kind: ConceptKind; created_at: number; }
export interface SpaceConcept extends BaseConcept { kind: 'space'; name: string; }
export interface ScopeConcept extends BaseConcept { kind: 'scope'; description: string; category?: string | null }

export type Concept = SpaceConcept | ScopeConcept;

export type CreateConceptInput =
  | { kind: 'space'; name: string }
  | { kind: 'scope'; description: string; category?: string | null };

export async function fetchConcepts(projectId: string): Promise<Concept[]> {
  const r = await fetch(`/api/projects/${projectId}/concepts`);
  if (!r.ok) throw new Error('Failed to fetch concepts');
  return r.json();
}

export async function createConcept(projectId: string, payload: CreateConceptInput): Promise<Concept> {
  const r = await fetch(`/api/projects/${projectId}/concepts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!r.ok) {
    let msg = 'Failed to create concept';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function patchConcept(projectId: string, id: string, data: Partial<{ name: string; description: string; category?: string | null }>): Promise<Concept> {
  const r = await fetch(`/api/projects/${projectId}/concepts/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  if (!r.ok) {
    let msg = 'Failed to update concept';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function deleteConcept(projectId: string, id: string): Promise<void> {
  const r = await fetch(`/api/projects/${projectId}/concepts/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    let msg = 'Failed to delete concept';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
}


