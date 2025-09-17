// API client for relationships (graph edges)

export type RelationshipType = 'JUSTIFIED_BY' | 'LOCATED_IN' | 'DEPICTS';

export interface Relationship {
  id: string;
  rel_type: RelationshipType;
  source_id: string;
  target_id: string;
  created_at: number;
}

export interface CreateRelationshipInput { rel_type: RelationshipType; source_id: string; target_id: string; }

export async function fetchLinks(projectId: string, params?: { source_id?: string; target_id?: string; rel_type?: RelationshipType }): Promise<Relationship[]> {
  const q = new URLSearchParams();
  if (params?.source_id) q.set('source_id', params.source_id);
  if (params?.target_id) q.set('target_id', params.target_id);
  if (params?.rel_type) q.set('rel_type', params.rel_type);
  const qs = q.toString();
  const r = await fetch(`/api/projects/${projectId}/links${qs ? '?' + qs : ''}`);
  if (!r.ok) throw new Error('Failed to fetch links');
  return r.json();
}

export async function createLink(projectId: string, payload: CreateRelationshipInput): Promise<Relationship> {
  const r = await fetch(`/api/projects/${projectId}/links`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!r.ok) {
    let msg = 'Failed to create link';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function deleteLink(projectId: string, id: string): Promise<void> {
  const r = await fetch(`/api/projects/${projectId}/links/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    let msg = 'Failed to delete link';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
}


