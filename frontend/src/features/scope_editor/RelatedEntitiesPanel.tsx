import React from 'react';
import { useProjectStore } from '../../state/store';

interface RelatedEntitiesPanelProps {
  linkedSymbol: any | null;
  scopeId: string;
}

export const RelatedEntitiesPanel: React.FC<RelatedEntitiesPanelProps> = ({ linkedSymbol, scopeId }) => {
  const { entities, copyScopeDescription, addToast } = useProjectStore((s: any) => ({
    entities: s.entities,
    copyScopeDescription: s.copyScopeDescription,
    addToast: s.addToast,
  }));

  if (!linkedSymbol) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Related Entities</h3>
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            Link a symbol instance to see related entities (Legend Items, Assemblies, Schedule Items).
          </p>
        </div>
      </div>
    );
  }

  // Get definition item linked to symbol
  const definitionItemId = linkedSymbol.definition_item_id;
  const definitionItemType = linkedSymbol.definition_item_type;

  if (!definitionItemId || !definitionItemType) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Related Entities</h3>
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            This symbol instance has no definition item linked.
          </p>
        </div>
      </div>
    );
  }

  // Find definition item
  const definitionItem = entities.find((e: any) => e.id === definitionItemId);

  if (!definitionItem) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Related Entities</h3>
        <div style={styles.empty}>
          <p style={styles.emptyText}>Definition item not found.</p>
        </div>
      </div>
    );
  }

  // Find parent container
  let parentContainer = null;
  let parentIdField = '';

  if (definitionItemType === 'legend_item') {
    parentIdField = 'legend_id';
  } else if (definitionItemType === 'schedule_item') {
    parentIdField = 'schedule_id';
  } else if (definitionItemType === 'assembly') {
    parentIdField = 'assembly_group_id';
  }

  if (parentIdField && definitionItem[parentIdField]) {
    parentContainer = entities.find((e: any) => e.id === definitionItem[parentIdField]);
  }

  // Format description based on entity type
  const formatDescription = (item: any, type: string): string => {
    if (type === 'legend_item') {
      const parts = [];
      if (item.symbol_text) parts.push(`Keynote ${item.symbol_text}`);
      if (item.description) parts.push(item.description);
      return parts.join(': ');
    } else if (type === 'assembly') {
      const parts = [];
      if (item.code) parts.push(item.code);
      if (item.name) parts.push(item.name);
      if (item.description) parts.push(item.description);
      return `Install ${parts.join(' - ')}`;
    } else if (type === 'schedule_item') {
      const parts = [];
      if (item.mark) parts.push(item.mark);
      if (item.description) parts.push(item.description);
      return `Install ${parts.join(' - ')}`;
    }
    return item.description || item.name || '';
  };

  const handleCopyDescription = async () => {
    const formatted = formatDescription(definitionItem, definitionItemType);
    if (formatted) {
      await copyScopeDescription(scopeId, formatted);
      addToast({ kind: 'success', message: 'Description copied to scope' });
    }
  };

  // Get display name for entity type
  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'legend_item': 'Legend Item',
      'assembly': 'Assembly',
      'schedule_item': 'Schedule Item',
      'legend': 'Legend',
      'schedule': 'Schedule',
      'assembly_group': 'Assembly Group',
    };
    return labels[type] || type;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Related Entities</h3>

      {/* Parent Container */}
      {parentContainer && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Parent Container</div>
          <div style={styles.entityCard}>
            <div style={styles.entityHeader}>
              <span style={styles.entityIcon}>📋</span>
              <div style={styles.entityDetails}>
                <div style={styles.entityType}>
                  {getEntityTypeLabel(parentContainer.entity_type)}
                </div>
                <div style={styles.entityName}>
                  {parentContainer.title || parentContainer.name || '(Unnamed)'}
                </div>
                {parentContainer.source_sheet_number && (
                  <div style={styles.entityLocation}>
                    Sheet {parentContainer.source_sheet_number}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Definition Item */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Definition Item</div>
        <div style={styles.entityCard}>
          <div style={styles.entityHeader}>
            <span style={styles.entityIcon}>
              {definitionItemType === 'legend_item' ? '📝' : 
               definitionItemType === 'assembly' ? '🔧' : '📊'}
            </span>
            <div style={styles.entityDetails}>
              <div style={styles.entityType}>
                {getEntityTypeLabel(definitionItemType)}
              </div>
              {definitionItemType === 'legend_item' && (
                <>
                  {definitionItem.symbol_text && (
                    <div style={styles.entityName}>
                      Symbol: {definitionItem.symbol_text}
                    </div>
                  )}
                  {definitionItem.description && (
                    <div style={styles.entityDescription}>
                      {definitionItem.description}
                    </div>
                  )}
                </>
              )}
              {definitionItemType === 'assembly' && (
                <>
                  {definitionItem.code && (
                    <div style={styles.entityName}>
                      {definitionItem.code}: {definitionItem.name || ''}
                    </div>
                  )}
                  {definitionItem.description && (
                    <div style={styles.entityDescription}>
                      {definitionItem.description}
                    </div>
                  )}
                </>
              )}
              {definitionItemType === 'schedule_item' && (
                <>
                  {definitionItem.mark && (
                    <div style={styles.entityName}>
                      Mark: {definitionItem.mark}
                    </div>
                  )}
                  {definitionItem.description && (
                    <div style={styles.entityDescription}>
                      {definitionItem.description}
                    </div>
                  )}
                </>
              )}
              {definitionItem.source_sheet_number && (
                <div style={styles.entityLocation}>
                  Sheet {definitionItem.source_sheet_number}
                </div>
              )}
            </div>
          </div>
          <div style={styles.entityActions}>
            <button onClick={handleCopyDescription} style={styles.copyButton}>
              📋 Copy Description
            </button>
          </div>
        </div>
      </div>
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
  title: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
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
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  entityCard: {
    padding: '14px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  entityHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  entityIcon: {
    fontSize: '20px',
  },
  entityDetails: {
    flex: 1,
  },
  entityType: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  entityName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  entityDescription: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
    lineHeight: 1.5,
  },
  entityLocation: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  entityActions: {
    display: 'flex',
    gap: '8px',
  },
  copyButton: {
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '13px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};

