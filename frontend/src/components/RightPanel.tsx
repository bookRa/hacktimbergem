import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';
import { RightExplorer } from './RightExplorer';
import { EntityEditor } from './EntityEditor';
import { componentStyles, colors, typography, spacing } from '../styles/designSystem';

export const RightPanel: React.FC = () => {
    const { currentPageIndex, pageOcr, ocrBlockState, setBlockStatus, toggleOcr, showOcr, selectedBlocks, toggleSelectBlock, clearSelection, bulkSetStatus, mergeSelectedBlocks, deleteSelectedBlocks, promoteSelectionToNote, notes, rightPanelTab, setRightPanelTab, setScrollTarget, updateNoteType, pageTitles, setPageTitle, deriveTitleFromBlocks, entities, startEntityCreation, startDefinitionCreation, startInstanceStamp, creatingEntity, cancelEntityCreation, fetchEntities, selectedEntityId, setSelectedEntityId, updateEntityMeta, deleteEntity, addToast, concepts, links, conceptsStatus, linksStatus, fetchConcepts, fetchLinks, createConcept, updateConcept, deleteConceptById, startLinking, toggleLinkTarget, finishLinking, cancelLinking, linking, deleteLinkById, rightInspectorHeightPx, setRightInspectorHeight, selectedScopeId } = useProjectStore((s: ProjectStore & any) => ({
        currentPageIndex: s.currentPageIndex,
        pageOcr: s.pageOcr,
        ocrBlockState: s.ocrBlockState,
        setBlockStatus: s.setBlockStatus,
        toggleOcr: s.toggleOcr,
        showOcr: s.showOcr,
        selectedBlocks: s.selectedBlocks,
        toggleSelectBlock: s.toggleSelectBlock,
        clearSelection: s.clearSelection,
        bulkSetStatus: s.bulkSetStatus,
        mergeSelectedBlocks: s.mergeSelectedBlocks,
        deleteSelectedBlocks: s.deleteSelectedBlocks,
        promoteSelectionToNote: s.promoteSelectionToNote,
        notes: s.notes,
        rightPanelTab: s.rightPanelTab,
        setRightPanelTab: s.setRightPanelTab,
        setScrollTarget: s.setScrollTarget,
        updateNoteType: s.updateNoteType,
        pageTitles: s.pageTitles,
        setPageTitle: s.setPageTitle,
        deriveTitleFromBlocks: s.deriveTitleFromBlocks,
        entities: s.entities,
        startEntityCreation: s.startEntityCreation,
        startDefinitionCreation: (s as any).startDefinitionCreation,
        creatingEntity: s.creatingEntity,
        cancelEntityCreation: s.cancelEntityCreation,
        fetchEntities: s.fetchEntities,
        selectedEntityId: s.selectedEntityId,
        setSelectedEntityId: s.setSelectedEntityId,
        updateEntityMeta: s.updateEntityMeta,
        deleteEntity: s.deleteEntity,
        startInstanceStamp: (s as any).startInstanceStamp,
        addToast: s.addToast,
        concepts: (s as any).concepts,
        links: (s as any).links,
        conceptsStatus: (s as any).conceptsStatus,
        linksStatus: (s as any).linksStatus,
        fetchConcepts: (s as any).fetchConcepts,
        fetchLinks: (s as any).fetchLinks,
        createConcept: (s as any).createConcept,
        updateConcept: (s as any).updateConcept,
        deleteConceptById: (s as any).deleteConceptById,
        startLinking: (s as any).startLinking,
        toggleLinkTarget: (s as any).toggleLinkTarget,
        finishLinking: (s as any).finishLinking,
        cancelLinking: (s as any).cancelLinking,
        linking: (s as any).linking,
        deleteLinkById: (s as any).deleteLinkById,
        rightInspectorHeightPx: (s as any).rightInspectorHeightPx,
        setRightInspectorHeight: (s as any).setRightInspectorHeight,
        selectedScopeId: (s as any).selectedScopeId,
    }));
    const [defDraft, setDefDraft] = React.useState<null | { type: 'symbol_definition' | 'component_definition'; name: string; scope: 'project' | 'sheet'; description: string; visual_pattern_description?: string; specifications?: string }>(null);
    const defsSectionRef = React.useRef<HTMLDivElement | null>(null);
    const persistedSections = React.useMemo(() => {
        try { const raw = localStorage.getItem('ui:sectionsOpen'); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }, []);
    const [sectionsOpen, setSectionsOpen] = React.useState<{ details: boolean; definitions: boolean; spaces: boolean; scopes: boolean; backend: boolean; notes: boolean }>(persistedSections || { details: true, definitions: true, spaces: true, scopes: true, backend: true, notes: true });
    const persistSections = (next: any) => { try { localStorage.setItem('ui:sectionsOpen', JSON.stringify(next)); } catch {} };
    const toggleSection = (k: 'details' | 'definitions' | 'spaces' | 'scopes' | 'backend' | 'notes') => setSectionsOpen(s => { const n = { ...s, [k]: !s[k] }; persistSections(n); return n; });
    React.useEffect(() => {
        if (!selectedEntityId && sectionsOpen.details) {
            setSectionsOpen(s => ({ ...s, details: false }));
        }
    }, [selectedEntityId]);
    React.useEffect(() => {
        if (selectedEntityId && !sectionsOpen.details) {
            setSectionsOpen(s => ({ ...s, details: true }));
        }
    }, [selectedEntityId, sectionsOpen.details]);
    const ocr = pageOcr[currentPageIndex];
    const blocks = ocr?.blocks || [];
    const meta = ocrBlockState[currentPageIndex] || {};
    const selected = selectedBlocks[currentPageIndex] || [];
    const statusOptions: Array<{ value: any; label: string; }> = [
        { value: 'unverified', label: 'Unverified' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'flagged', label: 'Flagged' },
        { value: 'noise', label: 'Noise' }
    ];
    const titleEntry = pageTitles[currentPageIndex];
    const [draftTitle, setDraftTitle] = React.useState(titleEntry?.text || '');
    React.useEffect(() => { setDraftTitle(titleEntry?.text || ''); }, [titleEntry, currentPageIndex]);
    const applyTitle = () => { if (draftTitle.trim()) setPageTitle(currentPageIndex, draftTitle); else setDraftTitle(titleEntry?.text || ''); };
    return (
        <aside className="right-panel">
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Knowledge Panel</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setRightPanelTab('blocks')} style={tabBtnStyle(rightPanelTab === 'blocks')}>Blocks</button>
                    <button onClick={() => setRightPanelTab('entities')} style={tabBtnStyle(rightPanelTab === 'entities')}>Entities</button>
                    <button onClick={() => setRightPanelTab('explorer')} style={tabBtnStyle(rightPanelTab === 'explorer')}>Explorer</button>
                </div>
            </h3>
            <section className="kp-section" style={{ borderBottom: `2px solid ${colors.borderLight}`, paddingBottom: spacing.md, marginBottom: spacing.md }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: typography.base, fontWeight: typography.medium, color: colors.textSecondary }}>Page {currentPageIndex + 1}</span>
                    <label style={{ fontSize: typography.base, display: 'flex', gap: spacing.sm, alignItems: 'center', cursor: 'pointer', color: colors.textSecondary, fontWeight: typography.medium }}>
                        <input type="checkbox" checked={showOcr} onChange={toggleOcr} /> OCR
                    </label>
                </div>
                <div style={{ marginTop: spacing.md }}>
                    <div style={{ ...componentStyles.label, marginBottom: spacing.sm }}>Sheet Title</div>
                    <input id="sheet-title" name="sheet-title" autoComplete="off"
                        value={draftTitle}
                        onChange={e => setDraftTitle(e.target.value)}
                        onBlur={applyTitle}
                        onKeyDown={e => { if (e.key === 'Enter') { applyTitle(); (e.target as HTMLInputElement).blur(); } else if (e.key === 'Escape') { setDraftTitle(titleEntry?.text || ''); (e.target as HTMLInputElement).blur(); } }}
                        placeholder="Enter title or use selection"
                        style={componentStyles.input}
                    />
                    <div style={{ marginTop: spacing.sm, display: 'flex', gap: spacing.sm }}>
                        <button
                            disabled={!selected.length}
                            onClick={() => deriveTitleFromBlocks(currentPageIndex, selected)}
                            style={miniBtn(!selected.length)}
                        >Set From Selection</button>
                        {titleEntry?.fromBlocks && <div style={{ fontSize: typography.xs, color: colors.textMuted, alignSelf: 'center' }}>from blocks: {titleEntry.fromBlocks.join(', ')}</div>}
                    </div>
                </div>
            </section>
            {rightPanelTab === 'blocks' && (
                <>
                    <section className="kp-section scrollable" style={{ paddingBottom: selected.length > 0 ? 60 : 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#e2e8f0' }}>
                            OCR Blocks ({blocks.length})
                        </div>
                        {blocks.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, textAlign: 'center', marginTop: 20 }}>(No OCR yet)</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {blocks.slice(0, 300).map((b: any, i: number) => {
                                const status = (meta[i]?.status || 'unverified') as 'unverified' | 'accepted' | 'flagged' | 'noise';
                            const isSel = selected.includes(i);
                                
                                const statusColor: Record<typeof status, string> = {
                                    unverified: '#64748b',
                                    accepted: '#10b981',
                                    flagged: '#f59e0b',
                                    noise: '#ef4444'
                                };
                                const color = statusColor[status];
                                
                            return (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            border: isSel ? '2px solid #2563eb' : '1px solid #e1e6eb',
                                            borderRadius: 6,
                                            padding: 8,
                                            background: isSel ? '#eff6ff' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    onClick={(e) => {
                                        toggleSelectBlock(currentPageIndex, i, e.metaKey || e.ctrlKey || e.shiftKey);
                                        if (!(e.metaKey || e.ctrlKey || e.shiftKey)) {
                                            setScrollTarget(currentPageIndex, i);
                                        }
                                    }}
                                >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSel}
                                                    onChange={() => {}}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>#{i}</span>
                                                <span 
                                                    style={{ 
                                                        fontSize: 10, 
                                                        fontWeight: 600,
                                                        color,
                                                        textTransform: 'uppercase',
                                                        background: color + '20',
                                                        padding: '2px 6px',
                                                        borderRadius: 3
                                                    }}
                                                >
                                                    {status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        deriveTitleFromBlocks(currentPageIndex, [i]); 
                                                    }}
                                                    style={{ 
                                                        fontSize: 10, 
                                                        padding: '3px 6px', 
                                                        borderRadius: 4, 
                                                        background: '#f5f7fa',
                                                        color: '#111',
                                                        border: '1px solid #e1e6eb',
                                                        cursor: 'pointer',
                                                        fontWeight: 500
                                                    }}
                                                    title="Set sheet title from this block"
                                                >
                                                    Set Title
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11, lineHeight: 1.4, color: '#1e293b', marginBottom: 8 }}>
                                            {b.text.length > 200 ? b.text.slice(0, 200) + '…' : b.text || <em style={{ opacity: .6 }}>(empty)</em>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBlockStatus(currentPageIndex, i, 'accepted'); }}
                                                style={{ 
                                                    fontSize: 10, 
                                                    padding: '2px 8px', 
                                                    borderRadius: 4, 
                                                    background: status === 'accepted' ? '#10b981' : '#f5f7fa',
                                                    color: status === 'accepted' ? '#fff' : '#111',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                ✓ Accept
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBlockStatus(currentPageIndex, i, 'flagged'); }}
                                                style={{ 
                                                    fontSize: 10, 
                                                    padding: '2px 8px', 
                                                    borderRadius: 4, 
                                                    background: status === 'flagged' ? '#f59e0b' : '#f5f7fa',
                                                    color: status === 'flagged' ? '#fff' : '#111',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                ⚠ Flag
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBlockStatus(currentPageIndex, i, 'noise'); }}
                                                style={{ 
                                                    fontSize: 10, 
                                                    padding: '2px 8px', 
                                                    borderRadius: 4, 
                                                    background: status === 'noise' ? '#ef4444' : '#f5f7fa',
                                                    color: status === 'noise' ? '#fff' : '#111',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                ✕ Noise
                                            </button>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                        {blocks.length > 300 && (
                            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 12, padding: 8 }}>
                                Showing first 300 of {blocks.length} blocks
                            </div>
                        )}
                    </section>
                    {/* Floating bulk actions bar */}
                    {selected.length > 0 && (
                        <div style={{
                            position: 'fixed',
                            bottom: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#fff',
                            border: '2px solid #2563eb',
                            borderRadius: 8,
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            zIndex: 100
                        }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>
                                {selected.length} selected
                            </span>
                            <div style={{ width: 1, height: 20, background: '#e1e6eb' }} />
                            <button onClick={() => bulkSetStatus(currentPageIndex, 'accepted')} style={{ ...miniBtn(false), fontSize: 10, background: '#10b981' }}>
                                Accept All
                            </button>
                            <button onClick={() => bulkSetStatus(currentPageIndex, 'flagged')} style={{ ...miniBtn(false), fontSize: 10, background: '#f59e0b' }}>
                                Flag All
                            </button>
                            <button onClick={() => bulkSetStatus(currentPageIndex, 'noise')} style={{ ...miniBtn(false), fontSize: 10, background: '#ef4444' }}>
                                Noise
                            </button>
                            <button disabled={selected.length < 2} onClick={() => mergeSelectedBlocks(currentPageIndex)} style={{ ...miniBtn(selected.length < 2), fontSize: 10 }}>
                                Merge
                            </button>
                            <button onClick={() => {
                                // Get text from all selected blocks
                                const ocr = pageOcr[currentPageIndex];
                                if (!ocr) return;
                                const blocks = ocr.blocks || [];
                                const allText = selected
                                    .map((blockIndex: number) => blocks[blockIndex]?.text || '')
                                    .filter((text: string) => text.trim())
                                    .join('\n');
                                
                                if (allText) {
                                    navigator.clipboard.writeText(allText).then(
                                        () => addToast({ kind: 'success', message: 'OCR text copied to clipboard' }),
                                        (err) => {
                                            console.error('Failed to copy text:', err);
                                            addToast({ kind: 'error', message: 'Failed to copy text' });
                                        }
                                    );
                                }
                            }} style={{ ...miniBtn(false), fontSize: 10, background: '#6366f1' }}>
                                Copy Text
                            </button>
                            <button onClick={() => promoteSelectionToNote(currentPageIndex)} style={{ ...miniBtn(false), fontSize: 10 }}>
                                → Note
                            </button>
                            <div style={{ width: 1, height: 20, background: '#e1e6eb' }} />
                            <button onClick={() => clearSelection(currentPageIndex)} style={{ ...miniBtn(false), fontSize: 10, background: '#64748b' }}>
                                Clear
                            </button>
                        </div>
                    )}
                </>
            )}
            {rightPanelTab === 'explorer' && (
                <section className="kp-section scrollable">
                        {/* Linking banner for Explorer context */}
                        {linking && linking.relType === 'JUSTIFIED_BY' && (
                            <div style={{ border: '1px solid #1e3a8a', background: '#0b1220', padding: 8, borderRadius: 6, marginBottom: 10, color: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>Linking Evidence • Scope #{linking.anchor.id.slice(0,6)}</div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => finishLinking()} style={miniBtn(false)}>Finish ({linking.selectedTargetIds.length})</button>
                                        <button onClick={() => cancelLinking()} style={miniBtn(false)}>Cancel</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, opacity: .8, marginTop: 4 }}>Click instances or notes on the canvas (or in lists) to add evidence.</div>
                            </div>
                        )}
                    <RightExplorer />
                    </section>
            )}
            {rightPanelTab === 'entities' && (
                <section className="kp-section scrollable" style={{ display: 'flex', flexDirection: 'column' }}>
                    {selectedEntityId ? (
                        <EntityEditor 
                            entityId={selectedEntityId} 
                            onClose={() => {
                                setSelectedEntityId(null);
                                // Clear explicit selection flag to allow canvas to resume normal selection
                                useProjectStore.setState({ _explicitSelection: false } as any);
                            }}
                        />
                    ) : (
                        <div style={{ padding: 16, overflow: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>Entity Editor</div>
                        <button onClick={() => fetchEntities()} style={miniBtn(false)}>↻</button>
                    </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
                                Select an entity from the canvas or Explorer tab to edit
                            </div>
                        </div>
                    )}
                </section>
            )}
            <section className="kp-section muted" style={{ position: 'relative' }}>
                <p style={{ fontSize: 11, lineHeight: 1.4 }}>Tips: Use Cmd/Ctrl/Shift to multi-select. Merge creates a composite block. Promote turns selection into a Note and auto-accepts its blocks.</p>
                {/* Resize grabber for inspector height */}
                <div
                    onMouseDown={(e) => {
                        const startY = e.clientY;
                        const startH = rightInspectorHeightPx;
                        const onMove = (ev: MouseEvent) => setRightInspectorHeight(startH + (ev.clientY - startY));
                        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                    }}
                    title="Drag to resize inspector"
                    style={{ position: 'absolute', top: -6, left: 6, right: 6, height: 8, cursor: 'row-resize', background: 'transparent' }}
                />
            </section>
        </aside>
    );
};

function tabBtnStyle(active: boolean): React.CSSProperties {
    return {
        background: active ? colors.primary : colors.bgTertiary,
        color: active ? colors.white : colors.textSecondary,
        border: `1px solid ${active ? colors.primary : colors.borderMedium}`,
        fontSize: typography.base,
        fontWeight: typography.medium,
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.15s ease'
    };
}

function miniBtn(disabled: boolean): React.CSSProperties {
    return componentStyles.button(disabled);
}
