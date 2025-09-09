// API client for visual entities
// Keeps type alignment with backend entities_models.py

export type EntityType = 'drawing' | 'legend' | 'schedule' | 'note';

export interface BoundingBox { x1: number; y1: number; x2: number; y2: number; }

export interface BaseEntity {
  id: string;
  entity_type: EntityType;
  source_sheet_number: number; // 1-based sheet number
  bounding_box: BoundingBox;
  created_at: number;
}

export interface DrawingEntity extends BaseEntity { entity_type: 'drawing'; title?: string | null; }
export interface LegendEntity extends BaseEntity { entity_type: 'legend'; title?: string | null; }
export interface ScheduleEntity extends BaseEntity { entity_type: 'schedule'; title?: string | null; }
export interface NoteEntity extends BaseEntity { entity_type: 'note'; text?: string | null; }

export type Entity = DrawingEntity | LegendEntity | ScheduleEntity | NoteEntity;

export type CreateEntityInput =
  | { entity_type: 'drawing'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
  | { entity_type: 'legend'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
  | { entity_type: 'schedule'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
  | { entity_type: 'note'; source_sheet_number: number; bounding_box: number[]; text?: string | null };

export async function fetchEntities(projectId: string): Promise<Entity[]> {
  const r = await fetch(`/api/projects/${projectId}/entities`);
  if (!r.ok) throw new Error('Failed to fetch entities');
  return r.json();
}

export async function createEntity(projectId: string, payload: CreateEntityInput): Promise<Entity> {
  const r = await fetch(`/api/projects/${projectId}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    let msg = 'Failed to create entity';
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}
