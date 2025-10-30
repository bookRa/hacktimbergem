import React from 'react';
import { useProjectStore } from '../../state/store';
import { EntityCard } from './EntityCard';

interface ScopeComposerProps {
  onClose: () => void;
}

export const ScopeComposer: React.FC<ScopeComposerProps> = ({ onClose }) => {
  const [step, setStep] = React.useState<'browse' | 'compose'>('browse');
  const [selectedEntities, setSelectedEntities] = React.useState<Set<string>>(new Set());
  const [entityType, setEntityType] = React.useState<'symbol_instance' | 'note'>('symbol_instance');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [scopeName, setScopeName] = React.useState('');
  const [scopeDescription, setScopeDescription] = React.useState('');

  const { entities, createScope, addToast } = useProjectStore((s: any) => ({
    entities: s.entities,
    createScope: s.createScope,
    addToast: s.addToast,
  }));

  // Filter entities
  const availableEntities = entities.filter((e: any) => {
    if (e.entity_type !== entityType) return false;
    
    if (!searchTerm) return true;
    
    const text = (e.text || e.recognized_text || e.name || e.description || '').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const toggleSelection = (entityId: string) => {
    const newSet = new Set(selectedEntities);
    if (newSet.has(entityId)) {
      newSet.delete(entityId);
    } else {
      newSet.add(entityId);
    }
    setSelectedEntities(newSet);
  };

  const handleNext = () => {
    if (selectedEntities.size === 0) {
      addToast({ kind: 'error', message: 'Please select at least one entity' });
      return;
    }
    
    // Auto-generate name and description from selected entities
    const selectedList = Array.from(selectedEntities).map(id => 
      entities.find((e: any) => e.id === id)
    ).filter(Boolean);
    
    if (selectedList.length > 0) {
      // Try to extract meaningful text from first entity
      const first = selectedList[0];
      if (first.entity_type === 'symbol_instance') {
        setScopeName(first.recognized_text || 'New Scope');
        // Try to get description from definition item
        if (first.definition_item_id) {
          const defItem = entities.find((e: any) => e.id === first.definition_item_id);
          if (defItem) {
            if (defItem.entity_type === 'legend_item') {
              setScopeDescription(`${defItem.symbol_text || ''}: ${defItem.description || ''}`.trim());
            } else if (defItem.entity_type === 'assembly') {
              setScopeDescription(`Install ${defItem.code || ''} - ${defItem.name || ''}`.trim());
            } else if (defItem.entity_type === 'schedule_item') {
              setScopeDescription(`Install ${defItem.mark || ''}: ${defItem.description || ''}`.trim());
            }
          }
        }
      } else if (first.entity_type === 'note') {
        const text = first.text || '';
        const lines = text.split('\n').filter((l: string) => l.trim());
        if (lines.length > 0) {
          setScopeName(lines[0].slice(0, 60));
          setScopeDescription(text);
        }
      }
    }
    
    setStep('compose');
  };

  const handleCreate = async () => {
    if (!scopeName.trim()) {
      addToast({ kind: 'error', message: 'Please enter a scope name' });
      return;
    }

    try {
      // Create the scope
      await createScope({
        name: scopeName.trim(),
        description: scopeDescription.trim() || undefined,
      });

      // TODO: After creation, link selected entities as evidence
      // This would require getting the created scope ID and creating links
      // For now, user can add evidence from the scope editor

      addToast({ kind: 'success', message: `Scope "${scopeName}" created. You can now link evidence from the scope editor.` });
      onClose();
    } catch (e: any) {
      console.error('[ScopeComposer] Error creating scope:', e);
      addToast({ kind: 'error', message: e?.message || 'Failed to create scope' });
    }
  };

  const selectedList = Array.from(selectedEntities).map(id => 
    entities.find((e: any) => e.id === id)
  ).filter(Boolean);

  if (step === 'compose') {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Compose Scope</h2>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>

          <div style={styles.composeContent}>
            {/* Selected Entities Preview */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Selected Entities ({selectedList.length})
              </div>
              <div style={styles.selectedGrid}>
                {selectedList.map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    showThumbnail={true}
                    showRelationships={false}
                    compact={true}
                  />
                ))}
              </div>
            </div>

            {/* Scope Details Form */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Scope Details</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={scopeName}
                  onChange={(e) => setScopeName(e.target.value)}
                  placeholder="e.g., Install mechanical ventilation"
                  style={styles.input}
                  autoFocus
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={scopeDescription}
                  onChange={(e) => setScopeDescription(e.target.value)}
                  placeholder="Additional details about this scope..."
                  style={styles.textarea}
                  rows={4}
                />
              </div>

              <div style={styles.hint}>
                💡 After creation, selected entities will be available to link as evidence from the scope editor.
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button onClick={() => setStep('browse')} style={styles.backButton}>
              ← Back
            </button>
            <button onClick={handleCreate} style={styles.createButton}>
              Create Scope
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Browse Knowledge Graph</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.subheader}>
          Select entities from the knowledge graph to compose into a scope
        </div>

        <div style={styles.controls}>
          <div style={styles.typeButtons}>
            <button
              onClick={() => setEntityType('symbol_instance')}
              style={{
                ...styles.typeButton,
                ...(entityType === 'symbol_instance' ? styles.typeButtonActive : {})
              }}
            >
              🔷 Symbol Instances
            </button>
            <button
              onClick={() => setEntityType('note')}
              style={{
                ...styles.typeButton,
                ...(entityType === 'note' ? styles.typeButtonActive : {})
              }}
            >
              📝 Notes
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entities..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.browseContent}>
          {availableEntities.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                {entityType === 'symbol_instance' ? '🔷' : '📝'}
              </div>
              <div style={styles.emptyText}>
                No {entityType === 'symbol_instance' ? 'symbol instances' : 'notes'} found
              </div>
            </div>
          ) : (
            <div style={styles.cardGrid}>
              {availableEntities.map((entity: any) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  showThumbnail={true}
                  showRelationships={true}
                  onSelect={toggleSelection}
                  isSelected={selectedEntities.has(entity.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.selectedCount}>
            {selectedEntities.size} selected
          </div>
          <div style={styles.footerButtons}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={selectedEntities.size === 0}
              style={{
                ...styles.nextButton,
                ...(selectedEntities.size === 0 ? styles.nextButtonDisabled : {})
              }}
            >
              Next: Compose →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#0f172a',
  },
  closeButton: {
    border: 'none',
    background: 'none',
    fontSize: '28px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subheader: {
    padding: '12px 24px',
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  controls: {
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  typeButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  typeButton: {
    flex: 1,
    padding: '8px 12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
  },
  browseContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  composeContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.3,
  },
  emptyText: {
    color: '#64748b',
    fontSize: '15px',
    fontWeight: 600,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
  },
  selectedGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '12px',
    color: '#64748b',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    fontStyle: 'italic',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 500,
  },
  footerButtons: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  nextButton: {
    padding: '8px 20px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
  nextButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
  backButton: {
    padding: '8px 16px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  createButton: {
    padding: '8px 20px',
    border: 'none',
    backgroundColor: '#10b981',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
};


