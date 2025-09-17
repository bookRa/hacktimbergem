// API client for visual entities
// Keeps type alignment with backend entities_models.py

export type EntityType = 'drawing' | 'legend' | 'schedule' | 'note' | 'symbol_definition' | 'component_definition' | 'symbol_instance' | 'component_instance';

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

export interface SymbolDefinitionEntity extends BaseEntity { entity_type: 'symbol_definition'; name: string; description?: string | null; visual_pattern_description?: string | null; scope: 'project' | 'sheet'; defined_in_id?: string | null }
export interface ComponentDefinitionEntity extends BaseEntity { entity_type: 'component_definition'; name: string; description?: string | null; specifications?: Record<string, any> | null; scope: 'project' | 'sheet'; defined_in_id?: string | null }
export interface SymbolInstanceEntity extends BaseEntity { entity_type: 'symbol_instance'; symbol_definition_id: string; recognized_text?: string | null; instantiated_in_id?: string | null }
export interface ComponentInstanceEntity extends BaseEntity { entity_type: 'component_instance'; component_definition_id: string; instantiated_in_id?: string | null }

export type Entity =
    | DrawingEntity
    | LegendEntity
    | ScheduleEntity
    | NoteEntity
    | SymbolDefinitionEntity
    | ComponentDefinitionEntity
    | SymbolInstanceEntity
    | ComponentInstanceEntity;

export type CreateEntityInput =
    | { entity_type: 'drawing'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
    | { entity_type: 'legend'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
    | { entity_type: 'schedule'; source_sheet_number: number; bounding_box: number[]; title?: string | null }
    | { entity_type: 'note'; source_sheet_number: number; bounding_box: number[]; text?: string | null }
    | { entity_type: 'symbol_definition'; source_sheet_number: number; bounding_box: number[]; name: string; description?: string | null; visual_pattern_description?: string | null; scope?: 'project' | 'sheet'; defined_in_id?: string | null }
    | { entity_type: 'component_definition'; source_sheet_number: number; bounding_box: number[]; name: string; description?: string | null; specifications?: Record<string, any> | null; scope?: 'project' | 'sheet'; defined_in_id?: string | null }
    | { entity_type: 'symbol_instance'; source_sheet_number: number; bounding_box: number[]; symbol_definition_id: string; recognized_text?: string | null }
    | { entity_type: 'component_instance'; source_sheet_number: number; bounding_box: number[]; component_definition_id: string };

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
        try { const j = await r.json(); msg = j.detail || msg; } catch { }
        throw new Error(msg);
    }
    return r.json();
}

export async function patchEntity(projectId: string, id: string, data: Partial<{ bounding_box: number[]; title: string | null; text: string | null; recognized_text?: string | null; symbol_definition_id?: string; component_definition_id?: string; specifications?: Record<string, any> }>): Promise<Entity> {
    const r = await fetch(`/api/projects/${projectId}/entities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        let msg = 'Failed to update entity';
        try { const j = await r.json(); msg = j.detail || msg; } catch { }
        throw new Error(msg);
    }
    return r.json();
}

export async function deleteEntity(projectId: string, id: string): Promise<void> {
    const r = await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'DELETE' });
    if (!r.ok) {
        let msg = 'Failed to delete entity';
        try { const j = await r.json(); msg = j.detail || msg; } catch { }
        throw new Error(msg);
    }
}
