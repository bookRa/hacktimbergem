import React from 'react';
import { useProjectStore } from '../../state/store';
import { EntityThumbnail } from './EntityThumbnail';

interface EntityCardProps {
  entity: any;
  showThumbnail?: boolean;
  showRelationships?: boolean;
  onSelect?: (entityId: string) => void;
  isSelected?: boolean;
  compact?: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  showThumbnail = true,
  showRelationships = true,
  onSelect,
  isSelected = false,
  compact = false,
}) => {
  const { entities, links } = useProjectStore((s: any) => ({
    entities: s.entities,
    links: s.links,
  }));

  // Get entity type display info
  const getEntityTypeInfo = (type: string) => {
    const info: Record<string, { icon: string; label: string; color: string }> = {
      'symbol_instance': { icon: '🔷', label: 'Symbol', color: '#3b82f6' },
      'symbol_definition': { icon: '🔷', label: 'Symbol Definition', color: '#2563eb' },
      'note': { icon: '📝', label: 'Note', color: '#10b981' },
      'drawing': { icon: '📐', label: 'Drawing', color: '#8b5cf6' },
      'legend_item': { icon: '📝', label: 'Legend Item', color: '#f59e0b' },
      'legend': { icon: '📋', label: 'Legend', color: '#f59e0b' },
      'assembly': { icon: '🔧', label: 'Assembly', color: '#ef4444' },
      'assembly_group': { icon: '🔧', label: 'Assembly Group', color: '#dc2626' },
      'schedule_item': { icon: '📊', label: 'Schedule Item', color: '#06b6d4' },
      'schedule': { icon: '📊', label: 'Schedule', color: '#0891b2' },
      'component_instance': { icon: '⬡', label: 'Component', color: '#ec4899' },
      'component_definition': { icon: '⬡', label: 'Component Definition', color: '#db2777' },
    };
    return info[type] || { icon: '📦', label: type, color: '#64748b' };
  };

  const typeInfo = getEntityTypeInfo(entity.entity_type);

  // Get display text
  const getDisplayText = () => {
    if (entity.entity_type === 'note') return entity.text;
    if (entity.entity_type === 'symbol_instance') return entity.recognized_text;
    if (entity.entity_type === 'legend_item') {
      return entity.symbol_text ? `${entity.symbol_text}: ${entity.description || ''}` : entity.description;
    }
    if (entity.entity_type === 'assembly') {
      return entity.code ? `${entity.code} - ${entity.name || ''}` : entity.name;
    }
    if (entity.entity_type === 'schedule_item') {
      return entity.mark ? `${entity.mark}: ${entity.description || ''}` : entity.description;
    }
    return entity.name || entity.title || entity.description || entity.id.slice(0, 8);
  };

  // Get related entities
  const getRelatedEntities = () => {
    if (!showRelationships) return [];
    
    const related: Array<{ type: string; entity: any; relationship: string }> = [];

    // For symbol instances, get definition and definition item
    if (entity.entity_type === 'symbol_instance') {
      if (entity.symbol_definition_id) {
        const def = entities.find((e: any) => e.id === entity.symbol_definition_id);
        if (def) related.push({ type: 'definition', entity: def, relationship: 'defined by' });
      }
      if (entity.definition_item_id) {
        const defItem = entities.find((e: any) => e.id === entity.definition_item_id);
        if (defItem) related.push({ type: 'definition_item', entity: defItem, relationship: 'represents' });
      }
    }

    // For definition items, get parent container
    if (['legend_item', 'assembly', 'schedule_item'].includes(entity.entity_type)) {
      const parentIdField = entity.entity_type === 'legend_item' ? 'legend_id' :
                           entity.entity_type === 'assembly' ? 'assembly_group_id' : 'schedule_id';
      if (entity[parentIdField]) {
        const parent = entities.find((e: any) => e.id === entity[parentIdField]);
        if (parent) related.push({ type: 'parent', entity: parent, relationship: 'in' });
      }
    }

    // Get linked entities via relationships
    const outgoingLinks = links.filter((l: any) => l.source_id === entity.id);
    const incomingLinks = links.filter((l: any) => l.target_id === entity.id);
    
    outgoingLinks.slice(0, 2).forEach((link: any) => {
      const target = entities.find((e: any) => e.id === link.target_id);
      if (target) related.push({ type: 'linked', entity: target, relationship: link.rel_type.toLowerCase() });
    });

    return related.slice(0, 3); // Limit to 3 for compact view
  };

  const displayText = getDisplayText();
  const relatedEntities = getRelatedEntities();
  const hasBbox = entity.bounding_box && entity.source_sheet_number;

  const handleClick = () => {
    if (onSelect) onSelect(entity.id);
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        style={{
          ...styles.compactCard,
          ...(isSelected ? styles.selectedCard : {}),
          ...(onSelect ? styles.clickableCard : {}),
        }}
      >
        <div style={styles.compactIcon}>{typeInfo.icon}</div>
        <div style={styles.compactContent}>
          <div style={styles.compactText}>{displayText}</div>
          {entity.source_sheet_number && (
            <div style={styles.compactMeta}>Sheet {entity.source_sheet_number}</div>
          )}
        </div>
        {isSelected && <div style={styles.checkmark}>✓</div>}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      style={{
        ...styles.card,
        ...(isSelected ? styles.selectedCard : {}),
        ...(onSelect ? styles.clickableCard : {}),
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.typeLabel}>
          <span style={styles.typeIcon}>{typeInfo.icon}</span>
          <span style={{ ...styles.typeText, color: typeInfo.color }}>{typeInfo.label}</span>
        </div>
        {entity.source_sheet_number && (
          <div style={styles.sheetBadge}>Sheet {entity.source_sheet_number}</div>
        )}
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Thumbnail */}
        {showThumbnail && hasBbox && (
          <div style={styles.thumbnailWrapper}>
            <EntityThumbnail entity={entity} />
          </div>
        )}

        {/* Text Content */}
        <div style={styles.textContent}>
          <div style={styles.displayText}>
            {displayText || '(No description)'}
          </div>

          {/* Related Entities */}
          {showRelationships && relatedEntities.length > 0 && (
            <div style={styles.relationships}>
              {relatedEntities.map((rel, idx) => (
                <div key={idx} style={styles.relationshipItem}>
                  <span style={styles.relationshipLabel}>{rel.relationship}</span>
                  <span style={styles.relationshipEntity}>
                    {getEntityTypeInfo(rel.entity.entity_type).icon} {rel.entity.name || rel.entity.title || rel.entity.entity_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isSelected && <div style={styles.selectedIndicator}>✓ Selected</div>}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    transition: 'all 0.2s',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  clickableCard: {
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  typeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  typeIcon: {
    fontSize: '14px',
  },
  typeText: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sheetBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  content: {
    display: 'flex',
    gap: '12px',
  },
  thumbnailWrapper: {
    width: '120px',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    minWidth: 0,
  },
  displayText: {
    fontSize: '13px',
    color: '#0f172a',
    lineHeight: 1.5,
    marginBottom: '8px',
    wordBreak: 'break-word',
  },
  relationships: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  relationshipItem: {
    fontSize: '11px',
    color: '#64748b',
    display: 'flex',
    gap: '4px',
  },
  relationshipLabel: {
    fontStyle: 'italic',
  },
  relationshipEntity: {
    fontWeight: 500,
    color: '#475569',
  },
  selectedIndicator: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  checkmark: {
    fontSize: '18px',
    color: '#3b82f6',
    fontWeight: 700,
  },
  // Compact styles
  compactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  compactIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  compactContent: {
    flex: 1,
    minWidth: 0,
  },
  compactText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#0f172a',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  compactMeta: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500,
  },
};



