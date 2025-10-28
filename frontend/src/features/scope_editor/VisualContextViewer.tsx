import React from 'react';
import { EntityThumbnail } from './EntityThumbnail';
import { useProjectStore } from '../../state/store';

interface VisualContextViewerProps {
  scope: any;
  linkedSymbol: any | null;
  evidenceLinks: any[];
}

export const VisualContextViewer: React.FC<VisualContextViewerProps> = ({
  scope,
  linkedSymbol,
  evidenceLinks,
}) => {
  const { entities } = useProjectStore((s: any) => ({
    entities: s.entities,
  }));

  // Collect all visual entities to show
  const visualEntities: any[] = [];

  // Add scope itself if it has canvas location
  if (scope.bounding_box && scope.source_sheet_number) {
    visualEntities.push({
      entity: scope,
      label: 'Scope Location',
      type: 'scope',
    });
  }

  // Add linked symbol
  if (linkedSymbol && linkedSymbol.bounding_box) {
    visualEntities.push({
      entity: linkedSymbol,
      label: 'Primary Symbol',
      type: 'symbol_instance',
    });
  }

  // Add definition item if it has bbox
  if (linkedSymbol?.definition_item_id) {
    const defItem = entities.find((e: any) => e.id === linkedSymbol.definition_item_id);
    if (defItem && defItem.bounding_box) {
      visualEntities.push({
        entity: defItem,
        label: `Definition Item (${defItem.entity_type})`,
        type: defItem.entity_type,
      });
    }
  }

  // Add evidence entities with bboxes
  evidenceLinks.forEach((link: any) => {
    const entity = entities.find((e: any) => e.id === link.target_id);
    if (entity && entity.bounding_box) {
      visualEntities.push({
        entity,
        label: `Evidence (${entity.entity_type})`,
        type: entity.entity_type,
      });
    }
  });

  if (visualEntities.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Visual Context</h3>
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            No visual entities to display. Link a symbol with canvas location or add canvas-based evidence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Visual Context ({visualEntities.length})
      </h3>
      <div style={styles.helpText}>
        Visual snapshots of all related entities on the drawings.
      </div>
      <div style={styles.grid}>
        {visualEntities.map((item, index) => (
          <div key={`${item.entity.id}-${index}`} style={styles.thumbnailContainer}>
            <div style={styles.thumbnailLabel}>{item.label}</div>
            <EntityThumbnail entity={item.entity} />
            <div style={styles.thumbnailFooter}>
              Sheet {item.entity.source_sheet_number}
            </div>
          </div>
        ))}
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
    height: '100%',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
  },
  helpText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '2px dashed #cbd5e1',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  thumbnailContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  thumbnailLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '6px',
  },
  thumbnailFooter: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '6px',
    textAlign: 'center',
  },
};

