import React from 'react';
import { useProjectStore } from '../../state/store';
import { EvidencePicker } from './EvidencePicker';
import { EntityCard } from './EntityCard';

interface EvidenceLinksSectionProps {
  scopeId: string;
  evidenceLinks: any[];
}

export const EvidenceLinksSection: React.FC<EvidenceLinksSectionProps> = ({ 
  scopeId, 
  evidenceLinks 
}) => {
  const [showPicker, setShowPicker] = React.useState(false);
  
  const { entities, deleteLinkById } = useProjectStore((s: any) => ({
    entities: s.entities,
    deleteLinkById: s.deleteLinkById,
  }));

  const handleRemove = async (linkId: string) => {
    const confirmRemove = window.confirm('Remove this evidence link?');
    if (confirmRemove) {
      await deleteLinkById(linkId);
    }
  };

  // Get evidence entities
  const evidenceEntities = evidenceLinks.map((link: any) => {
    const entity = entities.find((e: any) => e.id === link.target_id);
    return { link, entity };
  }).filter((item) => item.entity);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          Evidence Links ({evidenceEntities.length})
        </h3>
        <button onClick={() => setShowPicker(true)} style={styles.addButton}>
          + Add Evidence
        </button>
      </div>

      {evidenceEntities.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            No additional evidence linked yet. Click "Add Evidence" to link notes or symbol instances.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {evidenceEntities.map(({ link, entity }) => (
            <div key={link.id} style={styles.evidenceCardWrapper}>
              <EntityCard
                entity={entity}
                showThumbnail={true}
                showRelationships={true}
              />
              <button 
                onClick={() => handleRemove(link.id)} 
                style={styles.removeButton}
                title="Remove evidence"
              >
                × Remove
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Evidence Picker Modal */}
      {showPicker && (
        <EvidencePicker scopeId={scopeId} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
  },
  addButton: {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '2px dashed #cbd5e1',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  evidenceCardWrapper: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 10px',
    border: '1px solid #fca5a5',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
    zIndex: 10,
  },
};

