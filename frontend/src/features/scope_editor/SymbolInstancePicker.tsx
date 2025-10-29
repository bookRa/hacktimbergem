import React from 'react';
import { useProjectStore } from '../../state/store';

interface SymbolInstancePickerProps {
  scopeId: string;
  onClose: () => void;
  currentLinkedSymbolId?: string;
}

export const SymbolInstancePicker: React.FC<SymbolInstancePickerProps> = ({ 
  scopeId, 
  onClose,
  currentLinkedSymbolId 
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSymbolId, setSelectedSymbolId] = React.useState<string | null>(null);
  const [groupBy, setGroupBy] = React.useState<'sheet' | 'definition'>('sheet');

  const { entities, linkSymbolToScope } = useProjectStore((s: any) => ({
    entities: s.entities,
    linkSymbolToScope: s.linkSymbolToScope,
  }));

  // Get all symbol instances
  const symbolInstances = entities.filter((e: any) => e.entity_type === 'symbol_instance');

  // Filter by search term
  const filteredSymbols = symbolInstances.filter((symbol: any) => {
    if (!searchTerm) return true;
    
    const symbolDef = entities.find((e: any) => e.id === symbol.symbol_definition_id);
    const defName = symbolDef?.name?.toLowerCase() || '';
    const recognizedText = symbol.recognized_text?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    return defName.includes(searchLower) || recognizedText.includes(searchLower);
  });

  // Group symbols
  const grouped: Record<string, any[]> = {};
  filteredSymbols.forEach((symbol: any) => {
    const key = groupBy === 'sheet' 
      ? `Sheet ${symbol.source_sheet_number || '?'}`
      : entities.find((e: any) => e.id === symbol.symbol_definition_id)?.name || 'Unknown';
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(symbol);
  });

  const handleSelect = async () => {
    if (!selectedSymbolId) return;
    
    await linkSymbolToScope(scopeId, selectedSymbolId);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Select Symbol Instance</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.controls}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by symbol name or text..."
            style={styles.searchInput}
          />
          <div style={styles.groupByButtons}>
            <button
              onClick={() => setGroupBy('sheet')}
              style={{
                ...styles.groupButton,
                ...(groupBy === 'sheet' ? styles.groupButtonActive : {})
              }}
            >
              Group by Sheet
            </button>
            <button
              onClick={() => setGroupBy('definition')}
              style={{
                ...styles.groupButton,
                ...(groupBy === 'definition' ? styles.groupButtonActive : {})
              }}
            >
              Group by Definition
            </button>
          </div>
        </div>

        <div style={styles.list}>
          {Object.keys(grouped).length === 0 ? (
            <div style={styles.empty}>No symbol instances found</div>
          ) : (
            Object.keys(grouped).sort().map((groupKey) => (
              <div key={groupKey} style={styles.group}>
                <div style={styles.groupTitle}>{groupKey}</div>
                {grouped[groupKey].map((symbol: any) => {
                  const symbolDef = entities.find((e: any) => e.id === symbol.symbol_definition_id);
                  const isSelected = selectedSymbolId === symbol.id;
                  const isCurrent = currentLinkedSymbolId === symbol.id;
                  
                  return (
                    <div
                      key={symbol.id}
                      onClick={() => setSelectedSymbolId(symbol.id)}
                      style={{
                        ...styles.symbolItem,
                        ...(isSelected ? styles.symbolItemSelected : {}),
                        ...(isCurrent ? styles.symbolItemCurrent : {})
                      }}
                    >
                      <div style={styles.symbolItemIcon}>🔷</div>
                      <div style={styles.symbolItemDetails}>
                        <div style={styles.symbolItemName}>
                          {symbolDef?.name || 'Symbol Instance'}
                          {isCurrent && <span style={styles.currentBadge}>(Current)</span>}
                        </div>
                        {symbol.recognized_text && (
                          <div style={styles.symbolItemText}>
                            "{symbol.recognized_text}"
                          </div>
                        )}
                        <div style={styles.symbolItemLocation}>
                          Sheet {symbol.source_sheet_number}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedSymbolId}
            style={{
              ...styles.selectButton,
              ...(selectedSymbolId ? {} : styles.selectButtonDisabled)
            }}
          >
            Link Selected Symbol
          </button>
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
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
    marginBottom: '12px',
  },
  groupByButtons: {
    display: 'flex',
    gap: '8px',
  },
  groupButton: {
    flex: 1,
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  groupButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
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
  group: {
    marginBottom: '16px',
  },
  groupTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  symbolItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff',
  },
  symbolItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  symbolItemCurrent: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  symbolItemIcon: {
    fontSize: '20px',
  },
  symbolItemDetails: {
    flex: 1,
  },
  symbolItemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '2px',
  },
  symbolItemText: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: '2px',
  },
  symbolItemLocation: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  currentBadge: {
    marginLeft: '8px',
    fontSize: '11px',
    color: '#059669',
    fontWeight: 600,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
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
  selectButton: {
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
  selectButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed',
  },
};

