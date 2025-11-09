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
  mode?: 'full' | 'compact' | 'list';
  isExpanded?: boolean;
  onToggleExpand?: (entityId: string) => void;
  pageTitles?: Record<number, { text: string }>;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  showThumbnail = true,
  showRelationships = true,
  onSelect,
  isSelected = false,
  compact = false,
  mode = 'full',
  isExpanded = false,
  onToggleExpand,
  pageTitles = {},
}) => {
  const [descExpanded, setDescExpanded] = React.useState<Record<number, boolean>>({});
  
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

  // Get related entities with descriptions
  const getRelatedEntities = () => {
    if (!showRelationships) return [];
    
    const related: Array<{ type: string; entity: any; relationship: string; description?: string }> = [];

    // For symbol instances, get definition and definition item
    if (entity.entity_type === 'symbol_instance') {
      if (entity.symbol_definition_id) {
        const def = entities.find((e: any) => e.id === entity.symbol_definition_id);
        if (def) {
          const defDesc = def.name || def.description;
          related.push({ type: 'definition', entity: def, relationship: 'defined by', description: defDesc });
        }
      }
      if (entity.definition_item_id) {
        const defItem = entities.find((e: any) => e.id === entity.definition_item_id);
        if (defItem) {
          let desc = '';
          if (defItem.entity_type === 'legend_item') {
            desc = [defItem.symbol_text, defItem.description].filter(Boolean).join(': ');
          } else if (defItem.entity_type === 'assembly') {
            desc = [defItem.code, defItem.name, defItem.description].filter(Boolean).join(' - ');
          } else if (defItem.entity_type === 'schedule_item') {
            desc = [defItem.mark, defItem.description].filter(Boolean).join(': ');
          }
          related.push({ type: 'definition_item', entity: defItem, relationship: 'represents', description: desc });
        }
      }
    }

    // For definition items, get parent container
    if (['legend_item', 'assembly', 'schedule_item'].includes(entity.entity_type)) {
      const parentIdField = entity.entity_type === 'legend_item' ? 'legend_id' :
                           entity.entity_type === 'assembly' ? 'assembly_group_id' : 'schedule_id';
      if (entity[parentIdField]) {
        const parent = entities.find((e: any) => e.id === entity[parentIdField]);
        if (parent) {
          const parentDesc = parent.title || parent.name;
          related.push({ type: 'parent', entity: parent, relationship: 'in', description: parentDesc });
        }
      }
    }

    // Get linked entities via relationships
    const outgoingLinks = links.filter((l: any) => l.source_id === entity.id);
    
    outgoingLinks.slice(0, 2).forEach((link: any) => {
      const target = entities.find((e: any) => e.id === link.target_id);
      if (target) {
        const linkDesc = target.name || target.title || target.description || target.text;
        related.push({ type: 'linked', entity: target, relationship: link.rel_type.toLowerCase(), description: linkDesc });
      }
    });

    return related.slice(0, 3); // Limit to 3 for compact view
  };

  const displayText = getDisplayText();
  const relatedEntities = getRelatedEntities();
  const hasBbox = entity.bounding_box && entity.source_sheet_number;

  const handleClick = () => {
    if (onSelect) onSelect(entity.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) onToggleExpand(entity.id);
  };

  const toggleDescExpanded = (idx: number) => {
    setDescExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const truncateDescription = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const getSheetLabel = () => {
    if (!entity.source_sheet_number) return '';
    const sheetNum = entity.source_sheet_number;
    const title = pageTitles[sheetNum - 1]?.text; // pageTitles uses 0-based index
    return title ? `Sheet ${sheetNum}: ${title}` : `Sheet ${sheetNum}`;
  };

  if (mode === 'list') {
    return (
      <div
        style={{
          ...styles.listContainer,
          ...(isSelected ? styles.listSelected : {}),
        }}
      >
        {/* Collapsed row */}
        <div
          onClick={handleClick}
          style={{
            ...styles.listRow,
            ...(onSelect ? styles.clickableCard : {}),
          }}
        >
          <div style={styles.listIcon}>{typeInfo.icon}</div>
          <div style={styles.listContent}>
            <div style={styles.listText}>{displayText}</div>
            {relatedEntities.length > 0 && (
              <div style={styles.listMeta}>
                {relatedEntities[0].relationship}: {relatedEntities[0].description ? truncateDescription(relatedEntities[0].description, 40) : relatedEntities[0].entity.entity_type}
              </div>
            )}
          </div>
          {entity.source_sheet_number && (
            <div style={styles.listSheetBadge}>{getSheetLabel()}</div>
          )}
          {isSelected && <div style={styles.listCheckmark}>✓</div>}
          {onToggleExpand && (
            <button
              onClick={handleToggleExpand}
              style={styles.listExpandButton}
              title={isExpanded ? 'Collapse' : 'Expand details'}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div style={styles.listExpanded}>
            <div style={styles.expandedContent}>
              {/* Thumbnail */}
              {showThumbnail && hasBbox && (
                <div style={styles.expandedThumbnail}>
                  <EntityThumbnail entity={entity} />
                </div>
              )}

              {/* Relationships */}
              <div style={styles.expandedRelationships}>
                {relatedEntities.map((rel, idx) => (
                  <div key={idx} style={styles.expandedRelItem}>
                    <span style={styles.expandedRelLabel}>{rel.relationship}:</span>
                    <span style={styles.expandedRelEntity}>
                      {getEntityTypeInfo(rel.entity.entity_type).icon} {rel.entity.name || rel.entity.title || rel.entity.entity_type}
                    </span>
                    {rel.description && (
                      <div style={styles.expandedRelDesc}>
                        {descExpanded[idx] ? rel.description : truncateDescription(rel.description)}
                        {rel.description.length > 60 && (
                          <button
                            onClick={() => toggleDescExpanded(idx)}
                            style={styles.expandTextButton}
                          >
                            {descExpanded[idx] ? ' (collapse)' : ' (expand)'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (compact || mode === 'compact') {
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
            <div style={styles.compactMeta}>{getSheetLabel()}</div>
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
          <div style={styles.sheetBadge}>{getSheetLabel()}</div>
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
                  <span style={styles.relationshipLabel}>{rel.relationship}:</span>
                  <span style={styles.relationshipEntity}>
                    {getEntityTypeInfo(rel.entity.entity_type).icon} {rel.entity.name || rel.entity.title || rel.entity.entity_type}
                  </span>
                  {rel.description && (
                    <div style={styles.relationshipDesc}>
                      {descExpanded[idx] ? rel.description : truncateDescription(rel.description)}
                      {rel.description.length > 60 && (
                        <button
                          onClick={() => toggleDescExpanded(idx)}
                          style={styles.expandTextButton}
                        >
                          {descExpanded[idx] ? ' ↩' : ' →'}
                        </button>
                      )}
                    </div>
                  )}
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
  relationshipDesc: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    marginLeft: '16px',
    fontStyle: 'italic',
  },
  expandTextButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '0 2px',
    fontWeight: 600,
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
  // List mode styles
  listContainer: {
    backgroundColor: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    transition: 'all 0.2s',
  },
  listSelected: {
    borderLeftWidth: '4px',
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    transition: 'background-color 0.1s',
  },
  listIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  listContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  listText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listMeta: {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listSheetBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  listCheckmark: {
    fontSize: '16px',
    color: '#3b82f6',
    fontWeight: 700,
    flexShrink: 0,
  },
  listExpandButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '4px 8px',
    flexShrink: 0,
    transition: 'color 0.2s',
  },
  listExpanded: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '12px',
  },
  expandedContent: {
    display: 'flex',
    gap: '12px',
  },
  expandedThumbnail: {
    width: '120px',
    flexShrink: 0,
  },
  expandedRelationships: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  expandedRelItem: {
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  expandedRelLabel: {
    fontStyle: 'italic',
    color: '#64748b',
    fontSize: '11px',
  },
  expandedRelEntity: {
    fontWeight: 500,
    color: '#475569',
    fontSize: '12px',
  },
  expandedRelDesc: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
};



