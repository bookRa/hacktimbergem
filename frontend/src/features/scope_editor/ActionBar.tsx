import React from 'react';
import { useProjectStore } from '../../state/store';
import { navigateToProject } from '../../utils/router';

interface ActionBarProps {
  scope: any;
}

export const ActionBar: React.FC<ActionBarProps> = ({ scope }) => {
  const { deleteEntity, projectId, addToast } = useProjectStore((s: any) => ({
    deleteEntity: s.deleteEntity,
    projectId: s.projectId,
    addToast: s.addToast,
  }));

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Delete scope "${scope.name || scope.description || 'this scope'}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      await deleteEntity(scope.id);
      addToast({ kind: 'success', message: 'Scope deleted' });
      navigateToProject(projectId);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <button onClick={handleDelete} style={styles.deleteButton}>
          🗑️ Delete Scope
        </button>
      </div>
      <div style={styles.right}>
        <div style={styles.helpText}>
          Changes are saved automatically
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -1px 3px rgba(0,0,0,0.05)',
  },
  left: {
    display: 'flex',
    gap: '12px',
  },
  right: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  deleteButton: {
    padding: '8px 16px',
    border: '1px solid #fca5a5',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  helpText: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
};

