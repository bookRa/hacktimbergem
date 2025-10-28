import React from 'react';
import { useProjectStore } from '../state/store';
import { navigateToProject } from '../utils/router';
import { clearScreenshotCache } from '../utils/bboxScreenshot';
import { ScopeHeader } from '../features/scope_editor/ScopeHeader';
import { SymbolLinkSection } from '../features/scope_editor/SymbolLinkSection';
import { RelatedEntitiesPanel } from '../features/scope_editor/RelatedEntitiesPanel';
import { VisualContextViewer } from '../features/scope_editor/VisualContextViewer';
import { EvidenceLinksSection } from '../features/scope_editor/EvidenceLinksSection';
import { ActionBar } from '../features/scope_editor/ActionBar';

interface ScopeEditorProps {
  scopeId: string;
}

export const ScopeEditor: React.FC<ScopeEditorProps> = ({ scopeId }) => {
  const {
    loadScopeEditor,
    closeScopeEditor,
    scopeEditor,
    entities,
    links,
    projectId
  } = useProjectStore((s: any) => ({
    loadScopeEditor: s.loadScopeEditor,
    closeScopeEditor: s.closeScopeEditor,
    scopeEditor: s.scopeEditor,
    entities: s.entities,
    links: s.links,
    projectId: s.projectId
  }));

  // Load scope editor data on mount
  React.useEffect(() => {
    loadScopeEditor(scopeId);
    
    return () => {
      closeScopeEditor();
      clearScreenshotCache();
    };
  }, [scopeId, loadScopeEditor, closeScopeEditor]);

  const handleBack = () => {
    navigateToProject(projectId);
  };

  // Find the scope entity
  const scope = entities.find((e: any) => e.id === scopeId && e.entity_type === 'scope');

  // Get linked symbol (1:1 relationship via JUSTIFIED_BY)
  const symbolLink = links.find((l: any) => 
    l.rel_type === 'JUSTIFIED_BY' && 
    l.source_id === scopeId && 
    entities.find((e: any) => e.id === l.target_id && e.entity_type === 'symbol_instance')
  );
  const linkedSymbol = symbolLink ? entities.find((e: any) => e.id === symbolLink.target_id) : null;

  // Get evidence links (other JUSTIFIED_BY links)
  const evidenceLinks = links.filter((l: any) => 
    l.rel_type === 'JUSTIFIED_BY' && 
    l.source_id === scopeId &&
    (!linkedSymbol || l.target_id !== linkedSymbol.id)  // Exclude the primary symbol
  );

  if (scopeEditor.loading) {
    return (
      <div className="scope-editor-loading" style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading scope editor...</div>
      </div>
    );
  }

  if (scopeEditor.error) {
    return (
      <div className="scope-editor-error" style={styles.errorContainer}>
        <h2>Error Loading Scope</h2>
        <p>{scopeEditor.error}</p>
        <button onClick={handleBack} style={styles.button}>
          ← Back to Project
        </button>
      </div>
    );
  }

  if (!scope) {
    return (
      <div className="scope-editor-error" style={styles.errorContainer}>
        <h2>Scope Not Found</h2>
        <p>Scope with ID {scopeId} does not exist.</p>
        <button onClick={handleBack} style={styles.button}>
          ← Back to Project
        </button>
      </div>
    );
  }

  return (
    <div className="scope-editor" style={styles.container}>
      {/* Breadcrumb Navigation */}
      <div style={styles.breadcrumb}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Project
        </button>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbText}>Scope Editor</span>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Header with scope name and info */}
        <ScopeHeader scope={scope} />

        {/* Two-column layout */}
        <div style={styles.mainLayout}>
          {/* Left Column */}
          <div style={styles.leftColumn}>
            <SymbolLinkSection 
              scope={scope} 
              linkedSymbol={linkedSymbol} 
            />
            
            <RelatedEntitiesPanel 
              linkedSymbol={linkedSymbol} 
              scopeId={scopeId}
            />
            
            <EvidenceLinksSection 
              scopeId={scopeId}
              evidenceLinks={evidenceLinks}
            />
          </div>

          {/* Right Column */}
          <div style={styles.rightColumn}>
            <VisualContextViewer 
              scope={scope}
              linkedSymbol={linkedSymbol}
              evidenceLinks={evidenceLinks}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar scope={scope} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    gap: '8px',
  },
  backButton: {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  breadcrumbSeparator: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  breadcrumbText: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    fontSize: '16px',
    color: '#64748b',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px',
    textAlign: 'center',
  },
  button: {
    padding: '8px 16px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '14px',
    borderRadius: '6px',
    fontWeight: 500,
    marginTop: '16px',
  },
};

