// API client for visual entities
// Keeps type alignment with backend entities_models.py

export type EntityType =
    | 'drawing'
    | 'legend'
    | 'legend_item'
    | 'schedule'
    | 'schedule_item'
    | 'assembly_group'
    | 'assembly'
    | 'note'
    | 'scope'
    | 'symbol_definition'
    | 'component_definition'
    | 'symbol_instance'
    | 'component_instance';

export type EntityStatus = 'incomplete' | 'complete';
export type EntityValidation = {
    missing?: {
        drawing?: boolean;
        definition?: boolean;
        scope?: boolean;
    };
} | null;

export type EntityFlags = {
    status?: EntityStatus;
    validation?: EntityValidation;
};

export interface BoundingBox { x1: number; y1: number; x2: number; y2: number; }

export interface BaseEntity extends EntityFlags {
    id: string;
    entity_type: EntityType;
    source_sheet_number: number; // 1-based sheet number
    bounding_box: BoundingBox;
    created_at: number;
}

export interface DrawingEntity extends BaseEntity { entity_type: 'drawing'; title?: string | null; description?: string | null; }
export interface LegendEntity extends BaseEntity { entity_type: 'legend'; title?: string | null; notes?: string | null; }
export interface LegendItemEntity extends Omit<BaseEntity, 'source_sheet_number' | 'bounding_box'> { 
    entity_type: 'legend_item'; 
    legend_id: string;
    symbol_text?: string | null; 
    description?: string | null;
    notes?: string | null;
    source_sheet_number?: number | null;
    bounding_box?: BoundingBox | null;
}
export interface ScheduleEntity extends BaseEntity { entity_type: 'schedule'; title?: string | null; schedule_type?: string | null; notes?: string | null; }
export interface ScheduleItemEntity extends Omit<BaseEntity, 'source_sheet_number' | 'bounding_box'> { 
    entity_type: 'schedule_item'; 
    schedule_id: string;
    mark?: string | null; 
    description?: string | null;
    notes?: string | null;
    specifications?: Record<string, any> | null;
    drawing_id?: string | null;
    source_sheet_number?: number | null;
    bounding_box?: BoundingBox | null;
}
export interface AssemblyGroupEntity extends BaseEntity { entity_type: 'assembly_group'; title?: string | null; notes?: string | null; }
export interface AssemblyEntity extends Omit<BaseEntity, 'source_sheet_number' | 'bounding_box'> { 
    entity_type: 'assembly'; 
    assembly_group_id: string;
    code?: string | null;
    name?: string | null; 
    description?: string | null;
    notes?: string | null;
    specifications?: Record<string, any> | null;
    drawing_id?: string | null;
    source_sheet_number?: number | null;
    bounding_box?: BoundingBox | null;
}
export interface NoteEntity extends BaseEntity { entity_type: 'note'; text?: string | null; }
// Scope can be conceptual (no bbox) or canvas-based (with bbox)
export interface ScopeEntity extends Omit<BaseEntity, 'source_sheet_number' | 'bounding_box'> { 
    entity_type: 'scope'; 
    name?: string | null; 
    description?: string | null;
    source_sheet_number?: number | null;
    bounding_box?: BoundingBox | null;
}

export interface SymbolDefinitionEntity extends BaseEntity { entity_type: 'symbol_definition'; name: string; description?: string | null; visual_pattern_description?: string | null; scope: 'project' | 'sheet'; defined_in_id?: string | null }
export interface ComponentDefinitionEntity extends BaseEntity { entity_type: 'component_definition'; name: string; description?: string | null; specifications?: Record<string, any> | null; scope: 'project' | 'sheet'; defined_in_id?: string | null }
export interface SymbolInstanceEntity extends BaseEntity { 
    entity_type: 'symbol_instance'; 
    symbol_definition_id: string; 
    recognized_text?: string | null; 
    instantiated_in_id?: string | null;
    definition_item_id?: string | null;
    definition_item_type?: 'assembly' | 'schedule_item' | 'legend_item' | null;
}
export interface ComponentInstanceEntity extends BaseEntity { entity_type: 'component_instance'; component_definition_id: string; instantiated_in_id?: string | null }

export type Entity =
    | DrawingEntity
    | LegendEntity
    | LegendItemEntity
    | ScheduleEntity
    | ScheduleItemEntity
    | AssemblyGroupEntity
    | AssemblyEntity
    | NoteEntity
    | ScopeEntity
    | SymbolDefinitionEntity
    | ComponentDefinitionEntity
    | SymbolInstanceEntity
    | ComponentInstanceEntity;

export type CreateEntityInput =
    | ({ entity_type: 'drawing'; source_sheet_number: number; bounding_box: number[]; title?: string | null; description?: string | null } & EntityFlags)
    | ({ entity_type: 'legend'; source_sheet_number: number; bounding_box: number[]; title?: string | null; notes?: string | null } & EntityFlags)
    | ({ entity_type: 'legend_item'; legend_id: string; symbol_text?: string | null; description?: string | null; notes?: string | null; source_sheet_number?: number | null; bounding_box?: number[] | null } & EntityFlags)
    | ({ entity_type: 'schedule'; source_sheet_number: number; bounding_box: number[]; title?: string | null; schedule_type?: string | null; notes?: string | null } & EntityFlags)
    | ({ entity_type: 'schedule_item'; schedule_id: string; mark?: string | null; description?: string | null; notes?: string | null; specifications?: Record<string, any> | null; drawing_id?: string | null; source_sheet_number?: number | null; bounding_box?: number[] | null } & EntityFlags)
    | ({ entity_type: 'assembly_group'; source_sheet_number: number; bounding_box: number[]; title?: string | null; notes?: string | null } & EntityFlags)
    | ({ entity_type: 'assembly'; assembly_group_id: string; code?: string | null; name?: string | null; description?: string | null; notes?: string | null; specifications?: Record<string, any> | null; drawing_id?: string | null; source_sheet_number?: number | null; bounding_box?: number[] | null } & EntityFlags)
    | ({ entity_type: 'note'; source_sheet_number: number; bounding_box: number[]; text?: string | null } & EntityFlags)
    | ({ entity_type: 'scope'; source_sheet_number?: number | null; bounding_box?: number[] | null; name?: string | null; description?: string | null } & EntityFlags)
    | ({ entity_type: 'symbol_definition'; source_sheet_number: number; bounding_box: number[]; name: string; description?: string | null; visual_pattern_description?: string | null; scope?: 'project' | 'sheet'; defined_in_id?: string | null } & EntityFlags)
    | ({ entity_type: 'component_definition'; source_sheet_number: number; bounding_box: number[]; name: string; description?: string | null; specifications?: Record<string, any> | null; scope?: 'project' | 'sheet'; defined_in_id?: string | null } & EntityFlags)
    | ({ entity_type: 'symbol_instance'; source_sheet_number: number; bounding_box: number[]; symbol_definition_id: string; recognized_text?: string | null; definition_item_id?: string | null; definition_item_type?: 'assembly' | 'schedule_item' | 'legend_item' | null } & EntityFlags)
    | ({ entity_type: 'component_instance'; source_sheet_number: number; bounding_box: number[]; component_definition_id: string } & EntityFlags);

type PatchPayload = Partial<{
    bounding_box: number[];
    source_sheet_number: number | null;
    title: string | null;
    text: string | null;
    recognized_text?: string | null;
    symbol_definition_id?: string;
    component_definition_id?: string;
    specifications?: Record<string, any>;
    name?: string | null;
    description?: string | null;
    visual_pattern_description?: string | null;
    scope?: 'project' | 'sheet';
    defined_in_id?: string | null;
    // New fields for container/item types
    notes?: string | null;
    schedule_type?: string | null;
    legend_id?: string;
    schedule_id?: string;
    assembly_group_id?: string;
    symbol_text?: string | null;
    mark?: string | null;
    code?: string | null;
    drawing_id?: string | null;
    definition_item_id?: string | null;
    definition_item_type?: 'assembly' | 'schedule_item' | 'legend_item' | null;
    status?: EntityStatus;
    validation?: EntityValidation;
}>;

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

export async function patchEntity(projectId: string, id: string, data: PatchPayload): Promise<Entity> {
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
