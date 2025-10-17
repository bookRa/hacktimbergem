import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../state/store';
import type { Entity } from '../api/entities';
import { componentStyles, colors, typography, spacing, borderRadius } from '../styles/designSystem';

interface EntitySelectorProps {
  /** Filter to specific entity types */
  filterTypes?: string[];
  /** Title for the selector */
  title?: string;
  /** Callback when entity is selected */
  onSelect: (entity: Entity) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Show sheet preview thumbnails */
  showSheetInfo?: boolean;
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  filterTypes,
  title = 'Select Entity',
  onSelect,
  onCancel,
  showSheetInfo = true,
}) => {
  const { entities, currentPageIndex, setCurrentPageIndex } = useProjectStore((state: any) => ({
    entities: state.entities,
    currentPageIndex: state.currentPageIndex,
    setCurrentPageIndex: state.setCurrentPageIndex,
  }));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSheet, setSelectedSheet] = useState<number | 'all'>('all');

  // Filter and search entities
  const filteredEntities = useMemo(() => {
    let result = entities;

    // Apply type filter
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((e: Entity) => filterTypes.includes(e.entity_type));
    } else if (selectedType !== 'all') {
      result = result.filter((e: Entity) => e.entity_type === selectedType);
    }

    // Apply sheet filter
    if (selectedSheet !== 'all') {
      result = result.filter((e: Entity) => e.source_sheet_number === selectedSheet);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e: Entity) => {
        const name = (e as any).name?.toLowerCase() || '';
        const title = (e as any).title?.toLowerCase() || '';
        const text = (e as any).text?.toLowerCase() || '';
        const id = e.id.toLowerCase();
        return name.includes(query) || title.includes(query) || text.includes(query) || id.includes(query);
      });
    }

    return result;
  }, [entities, filterTypes, selectedType, selectedSheet, searchQuery]);

  // Get unique entity types
  const availableTypes = useMemo(() => {
    const types: Set<string> = new Set(entities.map((e: Entity) => e.entity_type));
    return Array.from(types).sort();
  }, [entities]);

  // Get unique sheet numbers (filter out null for conceptual entities)
  const availableSheets = useMemo(() => {
    const sheets: Set<number> = new Set(
      entities
        .map((e: Entity) => e.source_sheet_number)
        .filter((s: number | null | undefined): s is number => s !== null && s !== undefined)
    );
    return Array.from(sheets).sort((a, b) => a - b);
  }, [entities]);

  const handleJumpToSheet = (entity: Entity) => {
    if (entity.source_sheet_number !== null && entity.source_sheet_number !== undefined) {
      setCurrentPageIndex(entity.source_sheet_number - 1);
    }
  };

  const getEntityLabel = (entity: Entity): string => {
    const name = (entity as any).name;
    const title = (entity as any).title;
    const text = (entity as any).text;
    
    if (name) return name;
    if (title) return title;
    if (text) return text.slice(0, 50) + (text.length > 50 ? '...' : '');
    return `#${entity.id.slice(0, 6)}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: spacing.xl
    }}>
      <div style={{
        background: colors.white,
        borderRadius: borderRadius.lg,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 600,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: spacing.xxl,
          borderBottom: `2px solid ${colors.borderLight}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: colors.bgSecondary
        }}>
          <h3 style={{
            margin: 0,
            fontSize: typography.lg,
            fontWeight: typography.semibold,
            color: colors.textPrimary
          }}>
            {title}
          </h3>
          <button
            onClick={onCancel}
            style={{
              ...componentStyles.buttonSecondary,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              fontSize: typography.md
            }}
          >
            ✕
          </button>
        </div>

        {/* Filters and Search */}
        <div style={{
          padding: spacing.xxl,
          borderBottom: `1px solid ${colors.borderLight}`,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, title, text, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              ...componentStyles.input,
              fontSize: typography.md
            }}
          />

          {/* Filters */}
          <div style={{ display: 'flex', gap: spacing.md }}>
            {!filterTypes && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  ...componentStyles.input,
                  flex: 1,
                  fontSize: typography.sm
                }}
              >
                <option value="all">All Types</option>
                {availableTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            )}
            
            <select
              value={selectedSheet === 'all' ? 'all' : selectedSheet.toString()}
              onChange={(e) => setSelectedSheet(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              style={{
                ...componentStyles.input,
                flex: 1,
                fontSize: typography.sm
              }}
            >
              <option value="all">All Sheets</option>
              {availableSheets.map((sheet: number) => (
                <option key={sheet} value={sheet.toString()}>
                  Sheet {sheet}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            fontSize: typography.sm,
            color: colors.textTertiary,
            fontWeight: typography.medium
          }}>
            {filteredEntities.length} result{filteredEntities.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Results List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: spacing.xxl
        }}>
          {filteredEntities.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: spacing.xxxl,
              color: colors.textMuted,
              fontSize: typography.md
            }}>
              No entities found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {filteredEntities.map((entity: Entity) => {
                const isCurrentSheet = entity.source_sheet_number === currentPageIndex + 1;
                
                return (
                  <div
                    key={entity.id}
                    style={{
                      ...componentStyles.card,
                      padding: spacing.xl,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: `2px solid ${colors.borderLight}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.borderLight;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: spacing.md
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                          marginBottom: spacing.sm
                        }}>
                          <span style={{
                            ...componentStyles.badge,
                            fontSize: typography.xs,
                          }}>
                            {entity.entity_type.replace('_', ' ')}
                          </span>
                          <span style={{
                            fontSize: typography.xs,
                            color: colors.textTertiary,
                            fontWeight: typography.medium
                          }}>
                            #{entity.id.slice(0, 6)}
                          </span>
                          {showSheetInfo && entity.source_sheet_number !== null && entity.source_sheet_number !== undefined && (
                            <span style={{
                              fontSize: typography.xs,
                              color: isCurrentSheet ? colors.success : colors.textTertiary,
                              fontWeight: typography.medium,
                              background: isCurrentSheet ? colors.successLight : colors.bgTertiary,
                              padding: `2px ${spacing.sm}px`,
                              borderRadius: borderRadius.sm
                            }}>
                              Sheet {entity.source_sheet_number}
                            </span>
                          )}
                          {showSheetInfo && (entity.source_sheet_number === null || entity.source_sheet_number === undefined) && (
                            <span style={{
                              fontSize: typography.xs,
                              color: colors.textTertiary,
                              fontWeight: typography.medium,
                              background: colors.bgTertiary,
                              padding: `2px ${spacing.sm}px`,
                              borderRadius: borderRadius.sm
                            }}>
                              💭 Conceptual
                            </span>
                          )}
                        </div>
                        
                        <div style={{
                          fontSize: typography.md,
                          color: colors.textPrimary,
                          fontWeight: typography.medium,
                          marginBottom: spacing.xs,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {getEntityLabel(entity)}
                        </div>
                        
                        {entity.bounding_box && (
                          <div style={{
                            fontSize: typography.sm,
                            color: colors.textTertiary
                          }}>
                            {entity.bounding_box.x1.toFixed(0)}, {entity.bounding_box.y1.toFixed(0)} → {entity.bounding_box.x2.toFixed(0)}, {entity.bounding_box.y2.toFixed(0)}
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.sm
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(entity);
                          }}
                          style={{
                            ...componentStyles.button(false),
                            fontSize: typography.sm,
                            padding: `${spacing.sm}px ${spacing.md}px`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Select
                        </button>
                        {!isCurrentSheet && entity.source_sheet_number !== null && entity.source_sheet_number !== undefined && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpToSheet(entity);
                            }}
                            style={{
                              ...componentStyles.buttonSecondary,
                              fontSize: typography.sm,
                              padding: `${spacing.sm}px ${spacing.md}px`,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Jump to Sheet
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: spacing.xxl,
          borderTop: `2px solid ${colors.borderLight}`,
          background: colors.bgSecondary,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={componentStyles.buttonSecondary}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

