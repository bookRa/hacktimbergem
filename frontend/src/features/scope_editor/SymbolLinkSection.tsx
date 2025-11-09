import React from 'react';
import { useProjectStore } from '../../state/store';
import { SymbolInstancePicker } from './SymbolInstancePicker';

interface SymbolLinkSectionProps {
  scope: any;
  linkedSymbol: any | null;
}

export const SymbolLinkSection: React.FC<SymbolLinkSectionProps> = ({ scope, linkedSymbol }) => {
  const [showPicker, setShowPicker] = React.useState(false);
  
  const { 
    unlinkSymbolFromScope, 
    entities,
    setCurrentPageIndex,
    selectEntity,
    projectId
  } = useProjectStore((s: any) => ({
    unlinkSymbolFromScope: s.unlinkSymbolFromScope,
    entities: s.entities,
    setCurrentPageIndex: s.setCurrentPageIndex,
    selectEntity: s.selectEntity,
    projectId: s.projectId,
  }));

  const handleUnlink = async () => {
    if (!linkedSymbol) return;
    
    const confirmUnlink = window.confirm(
      'Unlink this symbol instance from the scope? Related entities will no longer be shown.'
    );
    
    if (confirmUnlink) {
      await unlinkSymbolFromScope(scope.id, linkedSymbol.id);
    }
  };

  const handleJumpToSymbol = () => {
    if (linkedSymbol?.source_sheet_number) {
      setCurrentPageIndex(linkedSymbol.source_sheet_number - 1);
      selectEntity(linkedSymbol.id);
      // Navigate back to project view
      window.location.hash = `#p=${projectId}`;
    }
  };

  // Get symbol definition
  const symbolDefinition = linkedSymbol 
    ? entities.find((e: any) => e.id === linkedSymbol.symbol_definition_id && e.entity_type === 'symbol_definition')
    : null;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Primary Symbol Instance (1:1)
      </h3>

      {linkedSymbol ? (
        <div style={styles.linkedSymbol}>
          <div style={styles.symbolInfo}>
            <div style={styles.symbolHeader}>
              <span style={styles.symbolIcon}>🔷</span>
              <div style={styles.symbolDetails}>
                <div style={styles.symbolName}>
                  {symbolDefinition?.name || 'Symbol Instance'}
                </div>
                {linkedSymbol.recognized_text && (
                  <div style={styles.symbolText}>
                    Text: "{linkedSymbol.recognized_text}"
                  </div>
                )}
                <div style={styles.symbolLocation}>
                  Sheet {linkedSymbol.source_sheet_number}
                </div>
              </div>
            </div>
          </div>
          
          <div style={styles.actions}>
            <button onClick={handleJumpToSymbol} style={styles.button}>
              Jump to Symbol
            </button>
            <button onClick={handleUnlink} style={{...styles.button, ...styles.unlinkButton}}>
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            No symbol instance linked yet. Link a symbol to see related entities.
          </p>
          <button onClick={() => setShowPicker(true)} style={styles.linkButton}>
            + Link Symbol Instance
          </button>
        </div>
      )}

      {/* Symbol Instance Picker Modal */}
      {showPicker && (
        <SymbolInstancePicker
          scopeId={scope.id}
          onClose={() => setShowPicker(false)}
          currentLinkedSymbolId={linkedSymbol?.id}
        />
      )}

      {linkedSymbol && (
        <div style={styles.changeLinkContainer}>
          <button onClick={() => setShowPicker(true)} style={styles.changeLinkButton}>
            Change Linked Symbol
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
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
  },
  linkedSymbol: {
    padding: '16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    border: '2px solid #cbd5e1',
  },
  symbolInfo: {
    marginBottom: '12px',
  },
  symbolHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  symbolIcon: {
    fontSize: '24px',
  },
  symbolDetails: {
    flex: 1,
  },
  symbolName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  symbolText: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
    fontStyle: 'italic',
  },
  symbolLocation: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '13px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  unlinkButton: {
    color: '#dc2626',
    borderColor: '#fca5a5',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '2px dashed #cbd5e1',
  },
  emptyText: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#64748b',
  },
  linkButton: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
  changeLinkContainer: {
    marginTop: '12px',
    textAlign: 'center',
  },
  changeLinkButton: {
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};

