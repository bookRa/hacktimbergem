import React from 'react';
import { useProjectStore } from '../../state/store';
import { createLink } from '../../api/links';

interface EvidencePickerProps {
  scopeId: string;
  onClose: () => void;
}

export const EvidencePicker: React.FC<EvidencePickerProps> = ({ scopeId, onClose }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [entityType, setEntityType] = React.useState<'note' | 'symbol_instance' | 'component_instance'>('note');

  const { entities, links, projectId, addToast, fetchLinks } = useProjectStore((s: any) => ({
    entities: s.entities,
    links: s.links,
    projectId: s.projectId,
    addToast: s.addToast,
    fetchLinks: s.fetchLinks,
  }));

  // Get entities of selected type that are NOT already linked as evidence
  const existingEvidenceIds = new Set(
    links
      .filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === scopeId)
      .map((l: any) => l.target_id)
  );

  const availableEntities = entities.filter((e: any) => {
    if (e.entity_type !== entityType) return false;
    if (existingEvidenceIds.has(e.id)) return false;
    
    if (!searchTerm) return true;
    
    const text = (e.text || e.recognized_text || e.name || e.description || '').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      // Create links for all selected entities
      for (const targetId of Array.from(selectedIds)) {
        await createLink(projectId, {
          rel_type: 'JUSTIFIED_BY',
          source_id: scopeId,
          target_id: targetId,
        });
      }
      
      await fetchLinks();
      addToast({ kind: 'success', message: `${selectedIds.size} evidence link(s) added` });
      onClose();
    } catch (e: any) {
      console.error('[EvidencePicker] Error adding evidence:', e);
      addToast({ kind: 'error', message: e?.message || 'Failed to add evidence' });
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add Evidence</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.controls}>
          <div style={styles.typeButtons}>
            <button
              onClick={() => setEntityType('note')}
              style={{
                ...styles.typeButton,
                ...(entityType === 'note' ? styles.typeButtonActive : {})
              }}
            >
              📝 Notes
            </button>
            <button
              onClick={() => setEntityType('symbol_instance')}
              style={{
                ...styles.typeButton,
                ...(entityType === 'symbol_instance' ? styles.typeButtonActive : {})
              }}
            >
              🔷 Symbols
            </button>
            <button
              onClick={() => setEntityType('component_instance')}
              style={{
                ...styles.typeButton,
                ...(entityType === 'component_instance' ? styles.typeButtonActive : {})
              }}
            >
              ⬡ Components
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.list}>
          {availableEntities.length === 0 ? (
            <div style={styles.empty}>
              No {entityType === 'note' ? 'notes' : entityType === 'symbol_instance' ? 'symbols' : 'components'} available
            </div>
          ) : (
            availableEntities.map((entity: any) => {
              const isSelected = selectedIds.has(entity.id);
              const displayText = entity.text || entity.recognized_text || entity.name || entity.id.slice(0, 8);
              
              return (
                <div
                  key={entity.id}
                  onClick={() => toggleSelection(entity.id)}
                  style={{
                    ...styles.item,
                    ...(isSelected ? styles.itemSelected : {})
                  }}
                >
                  <div style={styles.itemIcon}>
                    {entityType === 'note' ? '📝' : entityType === 'symbol_instance' ? '🔷' : '⬡'}
                  </div>
                  <div style={styles.itemDetails}>
                    <div style={styles.itemText}>{displayText}</div>
                    {entity.source_sheet_number && (
                      <div style={styles.itemLocation}>Sheet {entity.source_sheet_number}</div>
                    )}
                  </div>
                  {isSelected && <div style={styles.checkmark}>✓</div>}
                </div>
              );
            })
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.selectedCount}>
            {selectedIds.size} selected
          </div>
          <div style={styles.footerButtons}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              style={{
                ...styles.addButton,
                ...(selectedIds.size === 0 ? styles.addButtonDisabled : {})
              }}
            >
              Add Evidence
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
    maxWidth: '600px',
    maxHeight: '80vh',
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
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  itemIcon: {
    fontSize: '20px',
  },
  itemDetails: {
    flex: 1,
  },
  itemText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '2px',
  },
  itemLocation: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  checkmark: {
    fontSize: '18px',
    color: '#3b82f6',
    fontWeight: 700,
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
  addButton: {
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
  addButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
};

