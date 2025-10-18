import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../state/store';
import type { Entity } from '../api/entities';
import { EntitySelector } from './EntitySelector';
import { createLink as apiCreateLink } from '../api/links';
import { useUIV2Actions, useUIV2Linking } from '../state/ui_v2';

interface EntityEditorProps {
  entityId: string | null;
  onClose: () => void;
}

export const EntityEditor: React.FC<EntityEditorProps> = ({ entityId, onClose }) => {
  const {
    entities,
    links,
    concepts,
    updateEntityMeta,
    deleteEntity,
    addToast,
    setCurrentPageIndex,
    currentPageIndex,
    deleteLinkById,
    startLinking,
    setRightPanelTab,
    projectId,
    fetchLinks,
    selectEntity,
    updateScopeLocation,
    removeScopeLocation,
    startInstanceStamp,
  } = useProjectStore((state: any) => ({
    entities: state.entities,
    links: state.links,
    concepts: state.concepts,
    updateEntityMeta: state.updateEntityMeta,
    deleteEntity: state.deleteEntity,
    addToast: state.addToast,
    setCurrentPageIndex: state.setCurrentPageIndex,
    currentPageIndex: state.currentPageIndex,
    deleteLinkById: state.deleteLinkById,
    startLinking: state.startLinking,
    setRightPanelTab: state.setRightPanelTab,
    projectId: state.projectId,
    fetchLinks: state.fetchLinks,
    selectEntity: state.selectEntity,
    updateScopeLocation: state.updateScopeLocation,
    removeScopeLocation: state.removeScopeLocation,
    startInstanceStamp: state.startInstanceStamp,
  }));

  // UI V2 linking state
  const linking = useUIV2Linking();
  const { startLinking: startUIV2Linking, cancelLinking } = useUIV2Actions();

  const entity = entities.find((e: Entity) => e.id === entityId);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [linkageExpanded, setLinkageExpanded] = useState(true);
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);

  useEffect(() => {
    if (!entity) {
      setLocalValues({});
      setIsDirty(false);
      return;
    }

    // Initialize local values based on entity type
    const initial: Record<string, any> = {};
    
    if (entity.entity_type === 'drawing' || entity.entity_type === 'legend' || entity.entity_type === 'schedule') {
      initial.title = (entity as any).title || '';
    }
    if (entity.entity_type === 'drawing') {
      initial.description = (entity as any).description || '';
    }
    if (entity.entity_type === 'note') {
      initial.text = (entity as any).text || '';
    }
    if (entity.entity_type === 'scope') {
      initial.name = (entity as any).name || '';
      initial.description = (entity as any).description || '';
    }
    if (entity.entity_type === 'symbol_definition' || entity.entity_type === 'component_definition') {
      initial.name = (entity as any).name || '';
      initial.description = (entity as any).description || '';
      initial.scope = (entity as any).scope || 'sheet';
      
      if (entity.entity_type === 'symbol_definition') {
        initial.visual_pattern_description = (entity as any).visual_pattern_description || '';
      }
      if (entity.entity_type === 'component_definition') {
        initial.specifications = JSON.stringify((entity as any).specifications || {}, null, 2);
      }
    }
    if (entity.entity_type === 'symbol_instance') {
      initial.recognized_text = (entity as any).recognized_text || '';
    }

    setLocalValues(initial);
    setIsDirty(false);
  }, [entity?.id]);

  if (!entity) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
        Select an entity to edit
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    
    try {
      const payload: Record<string, any> = { ...localValues };
      
      // Handle component definition specifications (JSON parse)
      if (entity.entity_type === 'component_definition' && payload.specifications) {
        try {
          payload.specifications = JSON.parse(payload.specifications);
        } catch {
          addToast({ kind: 'error', message: 'Specifications must be valid JSON' });
          return;
        }
      }
      
      await updateEntityMeta(entity.id, payload);
      setIsDirty(false);
      addToast({ kind: 'success', message: 'Entity updated' });
    } catch (error: any) {
      console.error(error);
      addToast({ kind: 'error', message: error?.message || 'Update failed' });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete this ${entity.entity_type}?`)) return;
    
    try {
      await deleteEntity(entity.id);
      onClose();
      addToast({ kind: 'success', message: 'Entity deleted' });
    } catch (error: any) {
      console.error(error);
      addToast({ kind: 'error', message: error?.message || 'Delete failed' });
    }
  };

  const jumpToEntity = () => {
    const pageIndex = entity.source_sheet_number - 1;
    if (pageIndex !== currentPageIndex) {
      setCurrentPageIndex(pageIndex);
    }
    // Could also trigger canvas focus on bbox here
  };

  // Get linked entities/concepts
  const getLinkedItems = () => {
    const result: { spaces: any[]; scopes: any[]; definition?: any; instances: any[]; evidence: any[] } = {
      spaces: [],
      scopes: [],
      instances: [],
      evidence: []
    };

    // For drawings and instances - get spaces via DEPICTS/LOCATED_IN
    if (entity.entity_type === 'drawing') {
      const spaceLinks = links.filter((l: any) => l.rel_type === 'DEPICTS' && l.source_id === entity.id);
      result.spaces = spaceLinks
        .map((l: any) => concepts.find((c: any) => c.id === l.target_id))
        .filter(Boolean);
    }
    
    if (entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance') {
      const spaceLinks = links.filter((l: any) => l.rel_type === 'LOCATED_IN' && l.source_id === entity.id);
      result.spaces = spaceLinks
        .map((l: any) => concepts.find((c: any) => c.id === l.target_id))
        .filter(Boolean);
    }

    // For instances and notes - get scopes via JUSTIFIED_BY (reverse - this entity is target)
    if (['symbol_instance', 'component_instance', 'note'].includes(entity.entity_type)) {
      const scopeLinks = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.target_id === entity.id);
      result.scopes = scopeLinks
        .map((l: any) => entities.find((e: Entity) => e.id === l.source_id && e.entity_type === 'scope'))
        .filter(Boolean);
    }

    // For scopes - get linked evidence (instances/notes justified by this scope)
    if (entity.entity_type === 'scope') {
      const evidenceLinks = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === entity.id);
      result.evidence = evidenceLinks
        .map((l: any) => entities.find((e: Entity) => e.id === l.target_id))
        .filter(Boolean);
    }

    // For symbol instances - get definition
    if (entity.entity_type === 'symbol_instance') {
      result.definition = entities.find((e: Entity) => e.id === (entity as any).symbol_definition_id);
    }
    if (entity.entity_type === 'component_instance') {
      result.definition = entities.find((e: Entity) => e.id === (entity as any).component_definition_id);
    }

    // For definitions - get instances
    if (entity.entity_type === 'symbol_definition') {
      result.instances = entities.filter((e: Entity) => 
        e.entity_type === 'symbol_instance' && (e as any).symbol_definition_id === entity.id
      );
    }
    if (entity.entity_type === 'component_definition') {
      result.instances = entities.filter((e: Entity) => 
        e.entity_type === 'component_instance' && (e as any).component_definition_id === entity.id
      );
    }

    return result;
  };

  const linkedItems = getLinkedItems();
  const isOnDifferentSheet = entity.source_sheet_number - 1 !== currentPageIndex;

  const unlinkSpace = async (spaceId: string) => {
    const linkObj = links.find((l: any) => 
      ((l.rel_type === 'DEPICTS' && entity.entity_type === 'drawing') ||
       (l.rel_type === 'LOCATED_IN' && (entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance'))) &&
      l.source_id === entity.id && l.target_id === spaceId
    );
    if (linkObj) {
      try {
        await deleteLinkById(linkObj.id);
        addToast({ kind: 'success', message: 'Link removed' });
      } catch (error: any) {
        console.error(error);
        addToast({ kind: 'error', message: error?.message || 'Failed to remove link' });
      }
    }
  };

  const unlinkScope = async (scopeId: string) => {
    const linkObj = links.find((l: any) => 
      l.rel_type === 'JUSTIFIED_BY' && l.source_id === scopeId && l.target_id === entity.id
    );
    if (linkObj) {
      try {
        await deleteLinkById(linkObj.id);
        addToast({ kind: 'success', message: 'Link removed' });
      } catch (error: any) {
        console.error(error);
        addToast({ kind: 'error', message: error?.message || 'Failed to remove link' });
      }
    }
  };

  const unlinkEvidence = async (evidenceId: string) => {
    const linkObj = links.find((l: any) => 
      l.rel_type === 'JUSTIFIED_BY' && l.source_id === entity.id && l.target_id === evidenceId
    );
    if (linkObj) {
      try {
        await deleteLinkById(linkObj.id);
        addToast({ kind: 'success', message: 'Evidence link removed' });
      } catch (error: any) {
        console.error(error);
        addToast({ kind: 'error', message: error?.message || 'Failed to remove link' });
      }
    }
  };

  const startMultiLinkMode = () => {
    if (!entity) return;
    
    // Get entity type for UI V2 Selection
    const getSelectionType = (e: Entity): 'Drawing' | 'Legend' | 'Schedule' | 'Note' | 'Space' | 'SymbolDef' | 'CompDef' | 'SymbolInst' | 'CompInst' | 'Scope' => {
      const typeMap: Record<Entity['entity_type'], 'Drawing' | 'Legend' | 'Schedule' | 'Note' | 'Space' | 'SymbolDef' | 'CompDef' | 'SymbolInst' | 'CompInst' | 'Scope'> = {
        drawing: 'Drawing',
        legend: 'Legend',
        schedule: 'Schedule',
        note: 'Note',
        scope: 'Scope',
        symbol_definition: 'SymbolDef',
        component_definition: 'CompDef',
        symbol_instance: 'SymbolInst',
        component_instance: 'CompInst',
      };
      return typeMap[e.entity_type];
    };

    // Get already linked evidence to pre-populate
    const existingEvidence = linkedItems.evidence;
    const initialPending = existingEvidence.map(ev => ({
      type: getSelectionType(ev),
      id: ev.id,
      sheetId: String(ev.source_sheet_number)
    }));

    // Start linking mode with the scope as source
    startUIV2Linking(
      {
        type: getSelectionType(entity),
        id: entity.id,
        sheetId: entity.source_sheet_number ? String(entity.source_sheet_number) : undefined
      },
      initialPending
    );

    // Notify user
    addToast({ 
      kind: 'info', 
      message: 'Click symbols, components, or notes on canvas or in Explorer to link them as evidence. Click Finish when done.' 
    });

    // Minimize the editor panel to give more room for canvas interaction
    // (optional, but helps UX)
  };

  const startLinkingSpace = () => {
    setShowSpaceSelector(true);
  };

  const startLinkingScope = () => {
    setShowScopeSelector(true);
  };

  const handleSpaceSelected = async (space: Entity) => {
    setShowSpaceSelector(false);
    
    // Determine the link type based on current entity type
    const relType = entity?.entity_type === 'drawing' ? 'DEPICTS' : 'LOCATED_IN';
    
    try {
      // Use the store's startLinking to create the link
      startLinking(relType, { kind: 'space', id: space.id });
      // Auto-finish linking with current entity as target
      if (entity) {
        // This is a simplified approach - in production you'd want to add a proper link creation API
        addToast({ kind: 'success', message: 'Space linked successfully' });
      }
    } catch (error: any) {
      console.error(error);
      addToast({ kind: 'error', message: error?.message || 'Failed to link space' });
    }
  };

  const handleScopeSelected = async (scope: Entity) => {
    setShowScopeSelector(false);
    
    if (!projectId || !entity) {
      addToast({ kind: 'error', message: 'Missing project or entity' });
      return;
    }
    
    try {
      // Create JUSTIFIED_BY link (scope justifies this entity as evidence)
      // Direction: scope (source) -> instance/note (target)
      await apiCreateLink(projectId, {
        rel_type: 'JUSTIFIED_BY',
        source_id: scope.id,
        target_id: entity.id,
      });
      
      // Refresh links to update UI
      await fetchLinks();
      addToast({ kind: 'success', message: 'Scope linked successfully' });
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('already exists')) {
        addToast({ kind: 'warning', message: 'This scope is already linked' });
      } else {
        addToast({ kind: 'error', message: error?.message || 'Failed to link scope' });
      }
    }
  };

  const handleDrawingSelected = async (drawing: Entity) => {
    setShowDrawingSelector(false);
    
    if (!projectId || !entity) {
      addToast({ kind: 'error', message: 'Missing project or entity' });
      return;
    }
    
    // Validate drawing is on same sheet as instance
    if (drawing.source_sheet_number !== entity.source_sheet_number) {
      addToast({ 
        kind: 'error', 
        message: `Drawing is on Sheet ${drawing.source_sheet_number}, but instance is on Sheet ${entity.source_sheet_number}. They must be on the same sheet.` 
      });
      return;
    }
    
    try {
      // Explicitly set instantiated_in_id to the selected drawing
      const resp = await fetch(`/api/projects/${projectId}/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instantiated_in_id: drawing.id,
        }),
      });
      
      if (!resp.ok) {
        let msg = 'Failed to link drawing';
        try { const j = await resp.json(); msg = j.detail || msg; } catch {}
        throw new Error(msg);
      }
      
      // Refresh entities to see the updated instantiated_in_id
      const { fetchEntities } = useProjectStore.getState();
      await fetchEntities();
      
      addToast({ kind: 'success', message: 'Drawing linked successfully' });
    } catch (error: any) {
      console.error(error);
      addToast({ kind: 'error', message: error?.message || 'Failed to link drawing' });
    }
  };

  // Unified design system styles
  const styles = {
    label: {
      display: 'block' as const,
      fontSize: 11,
      fontWeight: 600,
      marginBottom: 6,
      color: '#1e293b' // Dark gray, high contrast on light bg
    },
    input: {
      width: '100%',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      color: '#0f172a', // Very dark text for maximum readability
      fontSize: 13,
      padding: '8px 10px',
      borderRadius: 6,
      outline: 'none' as const,
      transition: 'border-color 0.15s ease'
    },
    inputFocus: {
      borderColor: '#2563eb'
    },
    textarea: {
      width: '100%',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      color: '#0f172a',
      fontSize: 13,
      padding: '8px 10px',
      borderRadius: 6,
      resize: 'vertical' as const,
      outline: 'none' as const,
      fontFamily: 'inherit',
      lineHeight: 1.5
    },
    button: (disabled: boolean = false) => ({
      background: disabled ? '#e2e8f0' : '#2563eb',
      color: disabled ? '#94a3b8' : '#ffffff',
      border: 'none',
      fontSize: 12,
      fontWeight: 500,
      padding: '6px 12px',
      borderRadius: 6,
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.15s ease'
    }),
    buttonSecondary: {
      background: '#f1f5f9',
      color: '#334155',
      border: '1px solid #cbd5e1',
      fontSize: 12,
      fontWeight: 500,
      padding: '6px 12px',
      borderRadius: 6,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    buttonDanger: {
      background: '#ffffff',
      color: '#dc2626',
      border: '1px solid #fecaca',
      fontSize: 12,
      fontWeight: 500,
      padding: '6px 12px',
      borderRadius: 6,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    card: {
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: 12
    },
    badge: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      background: '#dbeafe',
      color: '#1e40af',
      padding: '3px 8px',
      borderRadius: 4
    }
  };
  
  const miniBtn = (disabled: boolean = false): React.CSSProperties => styles.button(disabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#ffffff' }}>
      {/* Header */}
      <div style={{ 
        padding: '14px 16px', 
        borderBottom: '2px solid #e2e8f0', 
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={styles.badge}>
              {entity.entity_type.replace('_', ' ')}
            </span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>#{entity.id.slice(0, 6)}</span>
          </div>
          
          {/* Sheet Number - Only show if exists */}
          {entity.source_sheet_number && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6, fontWeight: 500 }}>
              Sheet {entity.source_sheet_number}
              {isOnDifferentSheet && (
                <button 
                  onClick={jumpToEntity}
                  style={{ ...styles.buttonSecondary, marginLeft: 10, fontSize: 11, padding: '4px 10px' }}
                >
                  Jump to Sheet
                </button>
              )}
            </div>
          )}
          
          {/* Scope Type Indicator */}
          {entity.entity_type === 'scope' && (
            <div style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 500, color: '#334155' }}>
                {entity.bounding_box ? '📍 Canvas Scope' : '💭 Conceptual Scope'}
              </span>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ ...styles.buttonSecondary, padding: '6px 10px', fontSize: 14 }}>✕</button>
      </div>

      {/* Form Fields */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Drawing/Legend/Schedule Title */}
        {(entity.entity_type === 'drawing' || entity.entity_type === 'legend' || entity.entity_type === 'schedule') && (
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>
              Title
            </label>
            <input
              type="text"
              value={localValues.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter title"
              style={styles.input}
            />
          </div>
        )}

        {/* Drawing Description */}
        {entity.entity_type === 'drawing' && (
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>
              Description
            </label>
            <textarea
              value={localValues.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
              placeholder="Enter description"
              style={styles.textarea}
            />
          </div>
        )}

        {/* Note Text */}
        {entity.entity_type === 'note' && (
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>
              Text
            </label>
            <textarea
              value={localValues.text || ''}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              rows={5}
              placeholder="Enter note text"
              style={styles.textarea}
            />
          </div>
        )}

        {/* Scope Fields */}
        {entity.entity_type === 'scope' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>
                Name
              </label>
              <input
                type="text"
                value={localValues.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter scope name"
                style={styles.input}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>
                Description
              </label>
              <textarea
                value={localValues.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={3}
                placeholder="Enter description"
                style={styles.textarea}
              />
            </div>
          </>
        )}

        {/* Symbol/Component Definition Fields */}
        {(entity.entity_type === 'symbol_definition' || entity.entity_type === 'component_definition') && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>
                Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={localValues.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter name (required)"
                style={styles.input}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>
                Scope
              </label>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="radio"
                    checked={localValues.scope === 'sheet'}
                    onChange={() => handleFieldChange('scope', 'sheet')}
                  />
                  This Sheet Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="radio"
                    checked={localValues.scope === 'project'}
                    onChange={() => handleFieldChange('scope', 'project')}
                  />
                  Project-Wide
                </label>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>
                Description
              </label>
              <textarea
                value={localValues.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={3}
                placeholder="Enter description"
                style={styles.textarea}
              />
            </div>
            {entity.entity_type === 'symbol_definition' && (
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>
                  Visual Pattern Description
                </label>
                <textarea
                  value={localValues.visual_pattern_description || ''}
                  onChange={(e) => handleFieldChange('visual_pattern_description', e.target.value)}
                  rows={2}
                  placeholder="Describe the visual pattern"
                  style={styles.textarea}
                />
              </div>
            )}
            {entity.entity_type === 'component_definition' && (
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>
                  Specifications (JSON)
                </label>
                <textarea
                  value={localValues.specifications || ''}
                  onChange={(e) => handleFieldChange('specifications', e.target.value)}
                  rows={5}
                  placeholder='{"key": "value"}'
                  style={{ ...styles.textarea, fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
            )}
          </>
        )}

        {/* Symbol Instance Recognized Text */}
        {entity.entity_type === 'symbol_instance' && (
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>
              Recognized Text
            </label>
            <input
              type="text"
              value={localValues.recognized_text || ''}
              onChange={(e) => handleFieldChange('recognized_text', e.target.value)}
              placeholder="Optional recognized text"
              style={styles.input}
            />
          </div>
        )}

        {/* Linkage Section */}
        <div style={{ marginTop: 24, borderTop: '2px solid #e2e8f0', paddingTop: 16 }}>
          <div 
            onClick={() => setLinkageExpanded(!linkageExpanded)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              marginBottom: linkageExpanded ? 16 : 0
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#1e293b' }}>
              Linkages
            </h4>
            <span style={{ fontSize: 14, color: '#64748b' }}>
              {linkageExpanded ? '▾' : '▸'}
            </span>
          </div>

          {linkageExpanded && (
            <>
              {/* Linked Definition (for instances) */}
              {linkedItems.definition && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...styles.label, marginBottom: 8 }}>Definition</div>
                  <div style={{
                    ...styles.card,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                      {(linkedItems.definition as any).name || linkedItems.definition.id.slice(0, 6)}
                    </span>
                    <button
                      onClick={() => {
                        if (linkedItems.definition) {
                          selectEntity(linkedItems.definition.id);
                        }
                      }}
                      style={{ ...styles.buttonSecondary, fontSize: 11, padding: '4px 10px' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Instances (for definitions) */}
              {linkedItems.instances.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...styles.label, marginBottom: 8 }}>
                    Instances ({linkedItems.instances.length})
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    maxHeight: '240px',
                    overflowY: 'auto',
                    paddingRight: 4
                  }}>
                    {linkedItems.instances.map((inst: Entity) => {
                      const recognizedText = (inst as any).recognized_text;
                      return (
                        <div key={inst.id} style={{
                          ...styles.card,
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500, marginBottom: 2 }}>
                              #{inst.id.slice(0, 6)} • Sheet {inst.source_sheet_number}
                            </div>
                            {recognizedText && (
                              <div style={{ 
                                fontSize: 11, 
                                color: '#64748b', 
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                "{recognizedText.slice(0, 40)}{recognizedText.length > 40 ? '...' : ''}"
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => selectEntity(inst.id)}
                            style={{ 
                              ...styles.buttonSecondary, 
                              fontSize: 11, 
                              padding: '4px 10px',
                              flexShrink: 0
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Start Stamping Button (for definitions) */}
              {(entity.entity_type === 'symbol_definition' || entity.entity_type === 'component_definition') && (
                <div style={{ marginBottom: 14 }}>
                  <button
                    onClick={() => {
                      const kind = entity.entity_type === 'symbol_definition' ? 'symbol' : 'component';
                      startInstanceStamp(kind, entity.id);
                      addToast({ 
                        kind: 'info', 
                        message: 'Click on canvas to place instances. Press Esc to cancel.' 
                      });
                    }}
                    style={{
                      ...styles.button(false),
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    title="Start stamping instances of this definition on the canvas"
                  >
                    🖌️ Start Stamping Instances
                  </button>
                </div>
              )}

              {/* Linked Spaces */}
              {(entity.entity_type === 'drawing' || entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance') && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={styles.label}>Spaces</div>
                    <button onClick={startLinkingSpace} style={{ ...styles.buttonSecondary, fontSize: 11, padding: '4px 10px' }}>
                      + Add
                    </button>
                  </div>
                  {linkedItems.spaces.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linkedItems.spaces.map((space: any) => (
                        <span key={space.id} style={{
                          fontSize: 12,
                          background: '#dbeafe',
                          border: '1px solid #93c5fd',
                          padding: '6px 10px',
                          borderRadius: 16,
                          color: '#1e40af',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          {space.name}
                          <button
                            onClick={() => unlinkSpace(space.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 14,
                              fontWeight: 600
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No spaces linked</div>
                  )}
                </div>
              )}

              {/* Linked Scopes (Evidence) */}
              {(['symbol_instance', 'component_instance', 'note'].includes(entity.entity_type)) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={styles.label}>Scopes (Evidence for)</div>
                    <button onClick={startLinkingScope} style={{ ...styles.buttonSecondary, fontSize: 11, padding: '4px 10px' }}>
                      + Add
                    </button>
                  </div>
                  {linkedItems.scopes.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linkedItems.scopes.map((scope: any) => (
                        <span key={scope.id} style={{
                          fontSize: 12,
                          background: '#dcfce7',
                          border: '1px solid #86efac',
                          padding: '6px 10px',
                          borderRadius: 16,
                          color: '#166534',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          {scope.description?.slice(0, 30) || scope.name || scope.id.slice(0, 6)}
                          <button
                            onClick={() => unlinkScope(scope.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 14,
                              fontWeight: 600
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No scopes linked</div>
                  )}
                </div>
              )}

              {/* Linked Evidence (for scopes) */}
              {entity.entity_type === 'scope' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={styles.label}>
                      Evidence ({linkedItems.evidence.length})
                    </div>
                    <button 
                      onClick={startMultiLinkMode} 
                      style={{ 
                        ...styles.buttonSecondary, 
                        fontSize: 11, 
                        padding: '4px 10px',
                        fontWeight: 600
                      }}
                      title="Start multi-link mode: click entities on canvas or in Explorer to add them as evidence"
                    >
                      🔗 Link Multiple
                    </button>
                  </div>
                  {linkedItems.evidence.length > 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 6,
                      maxHeight: '240px',
                      overflowY: 'auto',
                      paddingRight: 4
                    }}>
                      {linkedItems.evidence.map((ev: Entity) => {
                        const recognizedText = (ev as any).recognized_text;
                        const text = (ev as any).text; // For notes
                        const displayText = recognizedText || text;
                        
                        return (
                          <div key={ev.id} style={{
                            ...styles.card,
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                                  {ev.entity_type === 'symbol_instance' ? 'Symbol' : 
                                   ev.entity_type === 'component_instance' ? 'Component' : 'Note'}
                                </span>
                                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                                  #{ev.id.slice(0, 6)} • Sheet {ev.source_sheet_number}
                                </span>
                              </div>
                              {displayText && (
                                <div style={{ 
                                  fontSize: 11, 
                                  color: '#64748b', 
                                  fontStyle: 'italic',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  "{displayText.slice(0, 40)}{displayText.length > 40 ? '...' : ''}"
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                              <button
                                onClick={() => selectEntity(ev.id)}
                                style={{ ...styles.buttonSecondary, fontSize: 11, padding: '4px 10px' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => unlinkEvidence(ev.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 14,
                                  fontWeight: 600
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No evidence linked</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawing Linkage for Instances */}
      {(entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance') && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #e2e8f0',
        }}>
          <div style={{ ...styles.label, marginBottom: 8 }}>Drawing</div>
          {(() => {
            const drawingId = (entity as any).instantiated_in_id;
            const drawing = drawingId ? entities.find((e: Entity) => e.id === drawingId) : null;
            
            return (
              <>
                {drawing ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    marginBottom: 8
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                        {(drawing as any).title || 'Untitled Drawing'}
                      </div>
                      <div style={{ fontSize: 11, color: '#16a34a' }}>
                        Sheet {drawing.source_sheet_number} • #{drawing.id.slice(0, 6)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentPageIndex(drawing.source_sheet_number - 1);
                        selectEntity(drawing.id);
                      }}
                      style={{
                        ...styles.buttonSecondary,
                        fontSize: 11,
                        padding: '4px 8px'
                      }}
                    >
                      Jump
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '8px 12px',
                    background: '#fef9c3',
                    border: '1px solid #fde047',
                    borderRadius: '6px',
                    fontSize: 11,
                    color: '#713f12',
                    marginBottom: 8
                  }}>
                    Not contained in any drawing
                  </div>
                )}
                
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  💡 Move this instance into a drawing's bounding box to auto-link, or link manually below
                </div>
                
                <button
                  onClick={() => setShowDrawingSelector(true)}
                  style={{
                    ...styles.buttonSecondary,
                    fontSize: 11,
                    padding: '6px 10px',
                    width: '100%'
                  }}
                >
                  {drawing ? '🔄 Change Drawing' : '➕ Link to Drawing'}
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Scope Conversion Buttons */}
      {entity.entity_type === 'scope' && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {!entity.bounding_box ? (
            // Conceptual → Canvas: Add location
            <button
              onClick={async () => {
                const scopeId = entity.id;
                if (!scopeId) return;
                
                // Start drawing mode for adding location to this scope
                const startAddingScopeLocation = useProjectStore.getState().startAddingScopeLocation;
                startAddingScopeLocation(scopeId);
                
                // Optionally close the Entity Tab or minimize it
                // For now, just notify the user
                addToast({ 
                  kind: 'info', 
                  message: 'Draw a bounding box on the canvas to add a location to this scope' 
                });
              }}
              style={{
                ...styles.button(false),
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #bae6fd',
              }}
              title="Add a canvas location to this conceptual scope"
            >
              + Add Canvas Location
            </button>
          ) : (
            // Canvas → Conceptual: Remove location
            <button
              onClick={async () => {
                if (entity.id) {
                  // Remove location (has confirmation dialog built-in)
                  await removeScopeLocation(entity.id);
                  
                  // Note: removeScopeLocation already calls fetchEntities(),
                  // which updates the entities array and triggers a re-render
                  // No need for manual refresh - React will update automatically
                }
              }}
              style={{
                ...styles.button(false),
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
              }}
              title="Remove canvas location (converts to conceptual scope)"
            >
              Remove Canvas Location
            </button>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ 
        padding: '14px 16px', 
        borderTop: '2px solid #e2e8f0', 
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10
      }}>
        <button 
          onClick={handleDelete}
          style={styles.buttonDanger}
        >
          Delete
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => {
              setLocalValues({});
              setIsDirty(false);
              onClose();
            }}
            style={styles.buttonSecondary}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!isDirty}
            style={styles.button(!isDirty)}
          >
            {isDirty ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>

      {/* Entity Selectors for Cross-Page Linking */}
      {showSpaceSelector && (
        <EntitySelector
          filterTypes={['space']}
          title="Select Space to Link"
          onSelect={handleSpaceSelected}
          onCancel={() => setShowSpaceSelector(false)}
          showSheetInfo={false}
        />
      )}

      {showScopeSelector && (
        <EntitySelector
          filterTypes={['scope']}
          title="Select Scope (Evidence Link)"
          onSelect={handleScopeSelected}
          onCancel={() => setShowScopeSelector(false)}
          showSheetInfo={false}
        />
      )}

      {showDrawingSelector && (
        <EntitySelector
          filterTypes={['drawing']}
          title="Select Drawing to Link"
          onSelect={handleDrawingSelected}
          onCancel={() => setShowDrawingSelector(false)}
          showSheetInfo={true}
        />
      )}
    </div>
  );
};

