import React from 'react';
import { useProjectStore } from '../../state/store';

interface ScopeHeaderProps {
  scope: any;
}

export const ScopeHeader: React.FC<ScopeHeaderProps> = ({ scope }) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [editedName, setEditedName] = React.useState(scope.name || '');
  const [editedDescription, setEditedDescription] = React.useState(scope.description || '');
  
  const { updateEntityMeta, links, setCurrentPageIndex, selectEntity, projectId } = useProjectStore((s: any) => ({
    updateEntityMeta: s.updateEntityMeta,
    links: s.links,
    setCurrentPageIndex: s.setCurrentPageIndex,
    selectEntity: s.selectEntity,
    projectId: s.projectId,
  }));

  const handleSaveName = async () => {
    if (editedName.trim() !== scope.name) {
      await updateEntityMeta(scope.id, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = async () => {
    if (editedDescription.trim() !== scope.description) {
      await updateEntityMeta(scope.id, { description: editedDescription.trim() });
    }
    setIsEditingDescription(false);
  };

  const handleJumpToCanvas = () => {
    if (scope.source_sheet_number) {
      setCurrentPageIndex(scope.source_sheet_number - 1);
      selectEntity(scope.id);
      // Navigate back to project view
      window.location.hash = `#p=${projectId}`;
    }
  };

  // Check if scope has evidence
  const hasEvidence = links.some((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === scope.id);
  const evidenceCount = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === scope.id).length;

  // Check if scope has symbol linked
  const hasSymbol = links.some((l: any) => 
    l.rel_type === 'JUSTIFIED_BY' && 
    l.source_id === scope.id
  );

  const isConceptual = !scope.bounding_box;

  return (
    <div style={styles.container}>
      {/* Scope Type Badge */}
      <div style={styles.badges}>
        <span style={{...styles.badge, ...(isConceptual ? styles.badgeConceptual : styles.badgeCanvas)}}>
          {isConceptual ? '💭 Conceptual' : '📍 Canvas'}
        </span>
        {!isConceptual && scope.source_sheet_number && (
          <span style={{...styles.badge, ...styles.badgeSheet}}>
            Sheet {scope.source_sheet_number}
          </span>
        )}
        <span style={{
          ...styles.badge,
          ...(hasEvidence ? styles.badgeSuccess : styles.badgeWarning)
        }}>
          {hasEvidence ? `✓ ${evidenceCount} evidence` : '⚠ No evidence'}
        </span>
        <span style={{
          ...styles.badge,
          ...(hasSymbol ? styles.badgeSuccess : styles.badgeInfo)
        }}>
          {hasSymbol ? '✓ Symbol linked' : 'No symbol'}
        </span>
      </div>

      {/* Scope Name */}
      <div style={styles.nameSection}>
        {isEditingName ? (
          <div style={styles.editContainer}>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') { setEditedName(scope.name || ''); setIsEditingName(false); }
              }}
              autoFocus
              style={styles.input}
              placeholder="Scope name..."
            />
          </div>
        ) : (
          <h1 
            style={styles.name}
            onClick={() => setIsEditingName(true)}
            title="Click to edit"
          >
            {scope.name || '(Unnamed scope)'}
          </h1>
        )}
      </div>

      {/* Scope Description */}
      <div style={styles.descriptionSection}>
        {isEditingDescription ? (
          <div style={styles.editContainer}>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditedDescription(scope.description || '');
                  setIsEditingDescription(false);
                }
              }}
              autoFocus
              style={styles.textarea}
              placeholder="Add description..."
              rows={3}
            />
          </div>
        ) : (
          <p 
            style={styles.description}
            onClick={() => setIsEditingDescription(true)}
            title="Click to edit"
          >
            {scope.description || '(No description)'}
          </p>
        )}
      </div>

      {/* Canvas Location Actions */}
      {!isConceptual && scope.source_sheet_number && (
        <div style={styles.actions}>
          <button onClick={handleJumpToCanvas} style={styles.jumpButton}>
            📍 Jump to Canvas
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  badges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  badgeConceptual: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeCanvas: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeSheet: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeInfo: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  nameSection: {
    marginBottom: '12px',
  },
  name: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  descriptionSection: {
    marginBottom: '16px',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  editContainer: {
    width: '100%',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '28px',
    fontWeight: 700,
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  jumpButton: {
    padding: '8px 16px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};

