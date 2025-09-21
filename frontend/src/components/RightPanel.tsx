import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const RightPanel: React.FC = () => {
    const { currentPageIndex, pageOcr, ocrBlockState, setBlockStatus, toggleOcr, showOcr, selectedBlocks, toggleSelectBlock, clearSelection, bulkSetStatus, mergeSelectedBlocks, deleteSelectedBlocks, promoteSelectionToNote, notes, rightPanelTab, setRightPanelTab, setScrollTarget, updateNoteType, pageTitles, setPageTitle, deriveTitleFromBlocks, entities, startEntityCreation, startDefinitionCreation, startInstanceStamp, creatingEntity, cancelEntityCreation, fetchEntities, selectedEntityId, setSelectedEntityId, updateEntityMeta, deleteEntity, addToast, concepts, links, conceptsStatus, linksStatus, fetchConcepts, fetchLinks, createConcept, updateConcept, deleteConceptById, startLinking, toggleLinkTarget, finishLinking, cancelLinking, linking, deleteLinkById, rightInspectorHeightPx, setRightInspectorHeight } = useProjectStore((s: ProjectStore & any) => ({
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
    }));
    const [defDraft, setDefDraft] = React.useState<null | { type: 'symbol_definition' | 'component_definition'; name: string; scope: 'project' | 'sheet'; description: string; visual_pattern_description?: string; specifications?: string }>(null);
    const defsSectionRef = React.useRef<HTMLDivElement | null>(null);
    const [sectionsOpen, setSectionsOpen] = React.useState<{ details: boolean; definitions: boolean; spaces: boolean; scopes: boolean; backend: boolean; notes: boolean }>({ details: true, definitions: true, spaces: true, scopes: true, backend: true, notes: true });
    const toggleSection = (k: 'details' | 'definitions' | 'spaces' | 'scopes' | 'backend' | 'notes') => setSectionsOpen(s => ({ ...s, [k]: !s[k] }));
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
                </div>
            </h3>
            <section className="kp-section" style={{ borderBottom: '1px solid #1f2937', paddingBottom: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, opacity: .85 }}>Page {currentPageIndex + 1}</span>
                    <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showOcr} onChange={toggleOcr} /> OCR
                    </label>
                </div>
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>Sheet Title</div>
                    <input
                        value={draftTitle}
                        onChange={e => setDraftTitle(e.target.value)}
                        onBlur={applyTitle}
                        onKeyDown={e => { if (e.key === 'Enter') { applyTitle(); (e.target as HTMLInputElement).blur(); } else if (e.key === 'Escape') { setDraftTitle(titleEntry?.text || ''); (e.target as HTMLInputElement).blur(); } }}
                        placeholder="Enter title or use selection"
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#f1f5f9', fontSize: 12, padding: '4px 6px', borderRadius: 4 }}
                    />
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <button
                            disabled={!selected.length}
                            onClick={() => deriveTitleFromBlocks(currentPageIndex, selected)}
                            style={miniBtn(!selected.length)}
                        >Set From Selection</button>
                        {titleEntry?.fromBlocks && <div style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center' }}>from blocks: {titleEntry.fromBlocks.join(', ')}</div>}
                    </div>
                </div>
            </section>
            {rightPanelTab === 'blocks' && (
                <>
                    <section className="kp-section" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <button disabled={!selected.length} onClick={() => bulkSetStatus(currentPageIndex, 'accepted')} style={miniBtn(!selected.length)}>Accept</button>
                            <button disabled={!selected.length} onClick={() => bulkSetStatus(currentPageIndex, 'flagged')} style={miniBtn(!selected.length)}>Flag</button>
                            <button disabled={!selected.length} onClick={() => bulkSetStatus(currentPageIndex, 'noise')} style={miniBtn(!selected.length)}>Noise</button>
                            <button disabled={selected.length < 2} onClick={() => mergeSelectedBlocks(currentPageIndex)} style={miniBtn(selected.length < 2)}>Merge</button>
                            <button disabled={!selected.length} onClick={() => deleteSelectedBlocks(currentPageIndex)} style={miniBtn(!selected.length)}>Delete</button>
                            <button disabled={!selected.length} onClick={() => promoteSelectionToNote(currentPageIndex)} style={miniBtn(!selected.length)}>Promote→Note</button>
                            <button disabled={!selected.length} onClick={() => clearSelection(currentPageIndex)} style={miniBtn(!selected.length)}>Clear</button>
                        </div>
                        <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 11, opacity: .7 }}>Selected: {selected.length}</span>
                        </div>
                    </section>
                    <section className="kp-section" style={{ maxHeight: 220, overflow: 'auto' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>OCR Blocks ({blocks.length})</div>
                        {blocks.length === 0 && <p style={{ fontSize: 12, opacity: .7, margin: 0 }}>(No OCR yet)</p>}
                        {blocks.slice(0, 300).map((b: any, i: number) => {
                            const status = meta[i]?.status || 'unverified';
                            const isSel = selected.includes(i);
                            return (
                                <div key={i} style={{ border: '1px solid #374151', borderRadius: 4, padding: '4px 6px', marginBottom: 6, background: isSel ? '#1e3a8a' : '#111827', cursor: 'pointer', color: '#f1f5f9' }}
                                    onClick={(e) => {
                                        toggleSelectBlock(currentPageIndex, i, e.metaKey || e.ctrlKey || e.shiftKey);
                                        // Only set scroll target if multi-select modifier not used and not already selected (explicit navigation intent)
                                        if (!(e.metaKey || e.ctrlKey || e.shiftKey)) {
                                            setScrollTarget(currentPageIndex, i);
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                        <div style={{ fontSize: 11, opacity: .85, color: '#e2e8f0', display: 'flex', gap: 6, alignItems: 'center' }}>#{i} {status}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deriveTitleFromBlocks(currentPageIndex, [i]); }}
                                                style={{ fontSize: 10, padding: '2px 4px', borderRadius: 3, background: '#374151', color: '#f1f5f9', border: '1px solid #475569', cursor: 'pointer' }}
                                                title="Set sheet title from this block"
                                            >Title</button>
                                        </div>
                                        <select
                                            value={status}
                                            onChange={e => setBlockStatus(currentPageIndex, i, e.target.value as any)}
                                            style={{ background: '#1f2937', color: '#fff', border: '1px solid #374151', fontSize: 11, borderRadius: 4 }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ fontSize: 11, lineHeight: 1.3, marginTop: 4, whiteSpace: 'pre-wrap', color: '#f8fafc' }}>
                                        {b.text.length > 160 ? b.text.slice(0, 160) + '…' : b.text || <em style={{ opacity: .6 }}>(empty)</em>}
                                    </div>
                                </div>
                            );
                        })}
                        {blocks.length > 300 && <div style={{ fontSize: 11, opacity: .6 }}>Showing first 300 of {blocks.length} blocks…</div>}
                    </section>
                    <section className="kp-section" style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Aggregated Accepted Text</div>
                        <div style={{ maxHeight: 140, overflow: 'auto', fontSize: 11, lineHeight: 1.3, whiteSpace: 'pre-wrap', background: '#111827', padding: 6, border: '1px solid #374151', borderRadius: 4, color: '#f1f5f9' }}>
                            {blocks.filter((_: any, i: number) => meta[i]?.status === 'accepted').map((b: any) => b.text.trim()).join('\n\n') || <span style={{ opacity: .6 }}>(None accepted yet)</span>}
                        </div>
                    </section>
                </>
            )}
            {rightPanelTab === 'entities' && (
                <section className="kp-section" style={{ maxHeight: `calc(100vh - ${rightInspectorHeightPx}px)`, overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Entities (Page {currentPageIndex + 1})</div>
                        <button onClick={() => fetchEntities()} style={miniBtn(false)}>↻</button>
                    </div>
                    {/* Linking mode banner */}
                    {linking && (
                        <div style={{ border: '1px solid #1e3a8a', background: '#0b1220', padding: 8, borderRadius: 6, marginBottom: 10, color: '#e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>Linking Mode: {linking.relType} • Anchor {linking.anchor.kind} #{linking.anchor.id.slice(0,6)}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => finishLinking()} style={miniBtn(false)}>Finish ({linking.selectedTargetIds.length})</button>
                                    <button onClick={() => cancelLinking()} style={miniBtn(false)}>Cancel</button>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, opacity: .8, marginTop: 4 }}>Select targets from the list or canvas. Finish to commit links.</div>
                        </div>
                    )}
                    {/* Conceptual Entities: Spaces */}
                    <div style={{ marginBottom: 10 }}>
                        <div onClick={() => toggleSection('spaces')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 6px', background: '#0b1220', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0' }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>Spaces</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={(e) => { e.stopPropagation(); fetchConcepts(); fetchLinks(); }} style={miniBtn(false)}>↻</button>
                                <span style={{ opacity: .8 }}>{sectionsOpen.spaces ? '▾' : '▸'}</span>
                            </div>
                        </div>
                        {sectionsOpen.spaces && (
                            <ConceptSpacesSection
                                concepts={concepts}
                                entities={entities}
                                links={links}
                                createConcept={createConcept}
                                updateConcept={updateConcept}
                                deleteConcept={deleteConceptById}
                                deleteLink={deleteLinkById}
                                startLinking={startLinking}
                            />
                        )}
                    </div>
                    {/* Conceptual Entities: Scopes */}
                    <div style={{ marginBottom: 10 }}>
                        <div onClick={() => toggleSection('scopes')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 6px', background: '#0b1220', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0' }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>Scopes</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={(e) => { e.stopPropagation(); fetchConcepts(); fetchLinks(); }} style={miniBtn(false)}>↻</button>
                                <span style={{ opacity: .8 }}>{sectionsOpen.scopes ? '▾' : '▸'}</span>
                            </div>
                        </div>
                        {sectionsOpen.scopes && (
                            <ConceptScopesSection
                                concepts={concepts}
                                entities={entities}
                                links={links}
                                createConcept={createConcept}
                                updateConcept={updateConcept}
                                deleteConcept={deleteConceptById}
                                deleteLink={deleteLinkById}
                                startLinking={startLinking}
                            />
                        )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {(['drawing', 'legend', 'schedule', 'note'] as const).map(t => (
                            <button key={t} disabled={!!creatingEntity} onClick={() => startEntityCreation(t)} style={miniBtn(!!creatingEntity)}>{t}</button>
                        ))}
                        {/* Global: add Symbol/Component Definition without requiring parent selection */}
                        <button disabled={!!creatingEntity} onClick={() => { setDefDraft({ type: 'symbol_definition', name: '', scope: 'sheet', description: '', visual_pattern_description: '' }); setTimeout(() => defsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0); }} style={miniBtn(!!creatingEntity)}>symbol_definition</button>
                        <button disabled={!!creatingEntity} onClick={() => { setDefDraft({ type: 'component_definition', name: '', scope: 'sheet', description: '', specifications: '' }); setTimeout(() => defsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0); }} style={miniBtn(!!creatingEntity)}>component_definition</button>
                        {creatingEntity && <button onClick={() => cancelEntityCreation()} style={miniBtn(false)}>Cancel</button>}
                    </div>
                    {creatingEntity && <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>Drawing new {creatingEntity.type}: click-drag on sheet to place. Esc to cancel.</div>}
                    {/* Selected Entity Editor (collapsible) */}
                    {selectedEntityId && (() => {
                        const ent = entities.find((e: any) => e.id === selectedEntityId);
                        if (!ent || ent.source_sheet_number !== currentPageIndex + 1) return null;
                        return (
                            <div style={{ marginBottom: 8 }}>
                                <div onClick={() => toggleSection('details')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 6px', background: '#0b1220', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>Entity Details</div>
                                    <span style={{ opacity: .8 }}>{sectionsOpen.details ? '▾' : '▸'}</span>
                                </div>
                                {sectionsOpen.details && (
                                    <EntityEditor key={ent.id} entity={ent} updateEntityMeta={updateEntityMeta} deleteEntity={deleteEntity} deselect={() => setSelectedEntityId(null)} />
                                )}
                            </div>
                        );
                    })()}
                    {/* Global Definition Creation (no parent required) */}
                    {(() => {
                        const parent = entities.find((e: any) => e.id === selectedEntityId && (e.entity_type === 'legend' || e.entity_type === 'schedule'));
                        if (!defDraft || parent) return null;
                        return (
                            <div style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginBottom: 10, background: '#0b1220', color: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{defDraft.type === 'symbol_definition' ? 'New Symbol Definition' : 'New Component Definition'}</div>
                                    <button onClick={() => setDefDraft(null)} style={miniBtn(false)}>×</button>
                                </div>
                                <div style={{ border: '1px solid #1e3a8a', background: '#0b1220', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                        <div>
                                            <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Name</label>
                                            <input value={defDraft.name} onChange={e => setDefDraft({ ...defDraft, name: e.target.value })} placeholder="Required" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Scope</label>
                                            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                                                    <input type="radio" checked={defDraft.scope === 'sheet'} onChange={() => setDefDraft({ ...defDraft, scope: 'sheet' })} /> This Sheet Only
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                                                    <input type="radio" checked={defDraft.scope === 'project'} onChange={() => setDefDraft({ ...defDraft, scope: 'project' })} /> Project-Wide
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Description</label>
                                            <textarea value={defDraft.description} onChange={e => setDefDraft({ ...defDraft, description: e.target.value })} rows={3} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                        </div>
                                        {defDraft.type === 'symbol_definition' && (
                                            <div>
                                                <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Visual Pattern Description</label>
                                                <textarea value={defDraft.visual_pattern_description || ''} onChange={e => setDefDraft({ ...defDraft, visual_pattern_description: e.target.value })} rows={2} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                            </div>
                                        )}
                                        {defDraft.type === 'component_definition' && (
                                            <div>
                                                <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Specifications (JSON)</label>
                                                <textarea value={defDraft.specifications || ''} onChange={e => setDefDraft({ ...defDraft, specifications: e.target.value })} rows={3} placeholder='{"key":"value"}' style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button onClick={() => setDefDraft(null)} style={miniBtn(false)}>Cancel</button>
                                            <button
                                                disabled={!defDraft.name.trim()}
                                                onClick={() => {
                                                    if (!defDraft.name.trim()) { addToast({ kind: 'error', message: 'Name is required' }); return; }
                                                    let specsObj: any = undefined;
                                                    if (defDraft.type === 'component_definition' && defDraft.specifications && defDraft.specifications.trim()) {
                                                        try { specsObj = JSON.parse(defDraft.specifications); } catch { addToast({ kind: 'error', message: 'Specifications must be valid JSON' }); return; }
                                                    }
                                                    const meta: any = defDraft.type === 'symbol_definition'
                                                        ? { name: defDraft.name.trim(), scope: defDraft.scope, description: defDraft.description || '', visual_pattern_description: defDraft.visual_pattern_description || '' }
                                                        : { name: defDraft.name.trim(), scope: defDraft.scope, description: defDraft.description || '', specifications: specsObj || {} };
                                                    startDefinitionCreation(defDraft.type, null as any, meta);
                                                    setDefDraft(null);
                                                    setRightPanelTab('entities');
                                                    addToast({ kind: 'info', message: 'Draw a tight box on the canvas to place the definition' });
                                                }}
                                                style={miniBtn(!defDraft.name.trim())}
                                            >Select on Drawing</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {/* Instances Palette */}
                    {(() => {
                        // All definitions available for this page respecting scope
                        const defs = entities.filter((e: any) => e.entity_type === 'symbol_definition' || e.entity_type === 'component_definition');
                        const pageDefs = defs.filter((d: any) => d.scope === 'project' || d.source_sheet_number === currentPageIndex + 1);
                        if (pageDefs.length === 0) return null;
                        return (
                            <div style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginBottom: 10, background: '#0b1220' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, color: '#e2e8f0' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>Instances</div>
                                    {creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance') && (
                                        <button onClick={() => cancelEntityCreation()} style={miniBtn(false)}>Cancel Stamping</button>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gap: 6 }}>
                                    {pageDefs.map((d: any) => {
                                        const active = creatingEntity && ((creatingEntity.type === 'symbol_instance' && d.entity_type === 'symbol_definition') || (creatingEntity.type === 'component_instance' && d.entity_type === 'component_definition')) && creatingEntity.meta?.definitionId === d.id;
                                        return (
                                            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', borderRadius: 4, padding: '4px 6px', background: active ? '#1e3a8a' : '#111827', color: '#f1f5f9' }}>
                                                <div>
                                                    <strong style={{ fontSize: 12 }}>{d.name || '(unnamed)'}</strong>
                                                    <span style={{ marginLeft: 6, fontSize: 10, opacity: .7 }}>[{d.entity_type.replace('_', ' ')} — {d.scope}]</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (active) { cancelEntityCreation(); return; }
                                                        startInstanceStamp(d.entity_type === 'symbol_definition' ? 'symbol' : 'component', d.id);
                                                    }}
                                                    style={miniBtn(false)}
                                                >{active ? 'Stop Stamping' : 'Stamp'}</button>
                                            </div>
                                        );
                                    })}
                                </div>
                                {(creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance')) && (
                                    <div style={{ marginTop: 6, fontSize: 11, color: '#fbbf24' }}>Stamping: click within a Drawing to place. Esc to cancel.</div>
                                )}
                            </div>
                        );
                    })()}
                    {/* Nested Definitions for Legend/Schedule */}
                    {selectedEntityId && (() => {
                        const parent = entities.find((e: any) => e.id === selectedEntityId);
                        if (!parent) return null;
                        const isLegend = parent.entity_type === 'legend';
                        const isSchedule = parent.entity_type === 'schedule';
                        if (!isLegend && !isSchedule) return null;
                        const defs = entities.filter((e: any) => (e.entity_type === 'symbol_definition' || e.entity_type === 'component_definition') && e.defined_in_id === parent.id);
                        return (
                            <div ref={defsSectionRef} style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginBottom: 10, background: '#0b1220' }}>
                                <div onClick={() => toggleSection('definitions')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: 'pointer', color: '#e2e8f0' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{isLegend ? 'Symbol Definitions' : 'Component Definitions'}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ opacity: .8 }}>{sectionsOpen.definitions ? '▾' : '▸'}</span>
                                        {!defDraft && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDefDraft({ type: isLegend ? 'symbol_definition' : 'component_definition', name: '', scope: 'sheet', description: '', visual_pattern_description: '', specifications: '' }); }}
                                                style={miniBtn(false)}
                                            >+ Add Definition</button>
                                        )}
                                    </div>
                                </div>
                                {sectionsOpen.definitions && defDraft && (
                                    <div style={{ border: '1px solid #1e3a8a', background: '#0b1220', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                        <div style={{ display: 'grid', gap: 6 }}>
                                            <div>
                                                <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Name</label>
                                                <input value={defDraft.name} onChange={e => setDefDraft({ ...defDraft, name: e.target.value })} placeholder="Required" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Scope</label>
                                                <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                                                        <input type="radio" checked={defDraft.scope === 'sheet'} onChange={() => setDefDraft({ ...defDraft, scope: 'sheet' })} /> This Sheet Only
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                                                        <input type="radio" checked={defDraft.scope === 'project'} onChange={() => setDefDraft({ ...defDraft, scope: 'project' })} /> Project-Wide
                                                    </label>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Description</label>
                                                <textarea value={defDraft.description} onChange={e => setDefDraft({ ...defDraft, description: e.target.value })} rows={3} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                            </div>
                                            {defDraft.type === 'symbol_definition' && (
                                                <div>
                                                    <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Visual Pattern Description</label>
                                                    <textarea value={defDraft.visual_pattern_description || ''} onChange={e => setDefDraft({ ...defDraft, visual_pattern_description: e.target.value })} rows={2} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                                </div>
                                            )}
                                            {defDraft.type === 'component_definition' && (
                                                <div>
                                                    <label style={{ fontSize: 10, opacity: .8, display: 'block', marginBottom: 2, color: '#cbd5e1' }}>Specifications (JSON)</label>
                                                    <textarea value={defDraft.specifications || ''} onChange={e => setDefDraft({ ...defDraft, specifications: e.target.value })} rows={3} placeholder='{"key":"value"}' style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button onClick={() => setDefDraft(null)} style={miniBtn(false)}>Cancel</button>
                                                <button
                                                    disabled={!defDraft.name.trim()}
                                                    onClick={() => {
                                                        if (!defDraft.name.trim()) { addToast({ kind: 'error', message: 'Name is required' }); return; }
                                                        let specsObj: any = undefined;
                                                        if (defDraft.type === 'component_definition' && defDraft.specifications && defDraft.specifications.trim()) {
                                                            try { specsObj = JSON.parse(defDraft.specifications); } catch { addToast({ kind: 'error', message: 'Specifications must be valid JSON' }); return; }
                                                        }
                                                        const meta: any = defDraft.type === 'symbol_definition'
                                                            ? { name: defDraft.name.trim(), scope: defDraft.scope, description: defDraft.description || '', visual_pattern_description: defDraft.visual_pattern_description || '' }
                                                            : { name: defDraft.name.trim(), scope: defDraft.scope, description: defDraft.description || '', specifications: specsObj || {} };
                                                        // parent linking is optional; pass parent.id only if user started from a parent context
                                                        startDefinitionCreation(defDraft.type, parent.id || null, meta);
                                                        // Clear the form after arming selection so the next definition starts fresh
                                                        setDefDraft(null);
                                                        setRightPanelTab('entities');
                                                        addToast({ kind: 'info', message: 'Draw a tight box on the canvas to place the definition' });
                                                    }}
                                                    style={miniBtn(!defDraft.name.trim())}
                                                >Select on Drawing</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {sectionsOpen.definitions && defs.length === 0 && <div style={{ fontSize: 11, opacity: .8, color: '#e2e8f0' }}>(None yet)</div>}
                                {sectionsOpen.definitions && defs.map((d: any) => {
                                    const sel = d.id === selectedEntityId;
                                    return (
                                        <div key={d.id} onClick={() => setSelectedEntityId(d.id)} style={{ border: '1px solid ' + (sel ? '#1e3a8a' : '#374151'), borderRadius: 4, padding: '4px 6px', marginBottom: 6, background: sel ? '#0f172a' : '#111827', cursor: 'pointer', color: '#f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <strong style={{ fontSize: 12 }}>{d.name || '(unnamed)'}</strong>
                                                    <span style={{ marginLeft: 6, fontSize: 10, opacity: .7 }}>[{d.scope}]</span>
                                                </div>
                                                <span style={{ opacity: .6, fontSize: 10 }}>{d.entity_type.replace('_', ' ')}</span>
                                            </div>
                                            {d.description && <div style={{ fontSize: 11, opacity: .85, marginTop: 4 }}>{d.description.length > 140 ? d.description.slice(0, 140) + '…' : d.description}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    <div onClick={() => toggleSection('backend')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 6px', background: '#0b1220', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', marginTop: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>Backend Entities</div>
                        <span style={{ opacity: .8 }}>{sectionsOpen.backend ? '▾' : '▸'}</span>
                    </div>
                    {sectionsOpen.backend && entities.filter((e: any) => e.source_sheet_number === currentPageIndex + 1).map((e: any) => {
                        const selected = e.id === selectedEntityId;
                        const linkingActive = !!linking;
                        const isLinkTargetSelected = linkingActive && (linking!.selectedTargetIds.includes(e.id));
                        const allowedByLinking = (() => {
                            if (!linkingActive) return true;
                            if (linking!.relType === 'JUSTIFIED_BY') return ['note', 'symbol_instance', 'component_instance'].includes(e.entity_type);
                            if (linking!.relType === 'DEPICTS') return e.entity_type === 'drawing';
                            if (linking!.relType === 'LOCATED_IN') return ['symbol_instance', 'component_instance'].includes(e.entity_type);
                            return false;
                        })();
                        // Linkage pills
                        const linkage = (() => {
                            if (e.entity_type === 'symbol_instance') {
                                const d = entities.find((x: any) => x.id === e.symbol_definition_id);
                                return d ? `→ ${d.name || d.id.slice(0,6)} (symbol def)` : `→ def ${e.symbol_definition_id?.slice?.(0,6)}`;
                            }
                            if (e.entity_type === 'component_instance') {
                                const d = entities.find((x: any) => x.id === e.component_definition_id);
                                return d ? `→ ${d.name || d.id.slice(0,6)} (component def)` : `→ def ${e.component_definition_id?.slice?.(0,6)}`;
                            }
                            if (e.entity_type === 'symbol_definition' || e.entity_type === 'component_definition') {
                                const container = entities.find((x: any) => x.id === e.defined_in_id);
                                return container ? `in ${container.entity_type} ${container.title || container.id.slice(0,6)}` : undefined;
                            }
                            return undefined;
                        })();
                        return (
                            <div
                                key={e.id}
                                onClick={() => {
                                    if (linkingActive) {
                                        if (!allowedByLinking) return;
                                        toggleLinkTarget(e.id);
                                    } else {
                                        setSelectedEntityId(selected ? null : e.id);
                                    }
                                }}
                                style={{
                                    border: '1px solid ' + (linkingActive ? (isLinkTargetSelected ? '#16a34a' : allowedByLinking ? '#64748b' : '#374151') : (selected ? '#1e3a8a' : '#374151')),
                                    boxShadow: linkingActive ? (isLinkTargetSelected ? '0 0 0 1px #16a34a' : 'none') : (selected ? '0 0 0 1px #1e3a8a' : 'none'),
                                    borderRadius: 4,
                                    padding: '4px 6px',
                                    marginBottom: 6,
                                    background: linkingActive ? (isLinkTargetSelected ? '#064e3b' : allowedByLinking ? '#0b1220' : '#111827') : (selected ? '#1e3a8a' : '#111827'),
                                    color: '#f1f5f9',
                                    fontSize: 11,
                                    cursor: linkingActive ? (allowedByLinking ? 'pointer' : 'not-allowed') : 'pointer'
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ textTransform: 'capitalize' }}>{e.entity_type.replace('_', ' ')}</strong>
                                    <span style={{ opacity: .7 }}>#{e.id.slice(0, 6)}</span>
                                </div>
                                <div style={{ marginTop: 2, opacity: .8 }}>Box: {e.bounding_box.x1.toFixed(1)}, {e.bounding_box.y1.toFixed(1)}, {e.bounding_box.x2.toFixed(1)}, {e.bounding_box.y2.toFixed(1)}</div>
                                {e.title && <div style={{ marginTop: 2 }}>Title: {e.title}</div>}
                                {e.name && <div style={{ marginTop: 2 }}>Name: {e.name}</div>}
                                {e.scope && <div style={{ marginTop: 2, fontSize: 10, opacity: .8 }}>Scope: {e.scope}</div>}
                                {e.text && <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{e.text.length > 120 ? e.text.slice(0, 120) + '…' : e.text}</div>}
                                {linkage && <div style={{ marginTop: 2, fontSize: 10, opacity: .9, color: '#fde68a' }}>{linkage}</div>}
                                {selected && <div style={{ marginTop: 4, fontSize: 10, opacity: .8 }}>Click again to deselect • Edit form above</div>}
                            </div>
                        );
                    })}
                    {entities.filter((e: any) => e.source_sheet_number === currentPageIndex + 1).length === 0 && <div style={{ fontSize: 11, opacity: .6 }}>(None yet)</div>}
                    <div onClick={() => toggleSection('notes')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 6px', background: '#0b1220', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', marginTop: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>Page Notes</div>
                        <span style={{ opacity: .8 }}>{sectionsOpen.notes ? '▾' : '▸'}</span>
                    </div>
                    {sectionsOpen.notes && notes.filter((n: any) => n.pageIndex === currentPageIndex).map((n: any) => {
                        const truncated = n.text.length > 200 ? n.text.slice(0, 200) + '…' : n.text;
                        return (
                            <div key={n.id} style={{ border: '1px solid #374151', borderRadius: 4, padding: '6px 6px 8px', marginBottom: 6, background: '#111827', color: '#f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontSize: 11, opacity: .8 }}>Blocks: {n.blockIds.join(', ')}</div>
                                    <select
                                        value={n.note_type || 'general'}
                                        onChange={e => updateNoteType(n.id, e.target.value)}
                                        style={{ background: '#1f2937', color: '#f1f5f9', border: '1px solid #374151', fontSize: 11, borderRadius: 4 }}
                                    >
                                        <option value="general">General</option>
                                        <option value="definition">Definition</option>
                                        <option value="citation">Citation</option>
                                        <option value="data_point">Data Point</option>
                                        <option value="question">Question</option>
                                        <option value="todo">To-Do</option>
                                    </select>
                                </div>
                                <div style={{ fontSize: 11, lineHeight: 1.35, whiteSpace: 'pre-wrap', color: '#f8fafc' }}>{truncated || <em style={{ opacity: .6 }}>(empty)</em>}</div>
                            </div>
                        );
                    })}
                    {notes.filter((n: any) => n.pageIndex === currentPageIndex).length === 0 && <p style={{ fontSize: 12, opacity: .7, margin: 0 }}>(No notes yet)</p>}
                </section>
            )}
            <section className="kp-section muted" style={{ marginTop: 12, position: 'relative' }}>
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
        background: active ? '#1e3a8a' : '#1f2937',
        color: '#fff',
        border: '1px solid #374151',
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'pointer'
    };
}

function miniBtn(disabled: boolean): React.CSSProperties {
    return {
        background: disabled ? '#374151' : '#2563eb',
        color: '#fff',
        border: 'none',
        fontSize: 11,
        padding: '4px 6px',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1
    };
}

interface EntityEditorProps {
    entity: any;
    updateEntityMeta: (id: string, data: any) => Promise<void>;
    deleteEntity: (id: string) => Promise<void>;
    deselect: () => void;
}

const EntityEditor: React.FC<EntityEditorProps> = ({ entity, updateEntityMeta, deleteEntity, deselect }) => {
    const { links, concepts, deleteLinkById, addToast } = useProjectStore((s: any) => ({
        links: s.links,
        concepts: s.concepts,
        deleteLinkById: s.deleteLinkById,
        addToast: s.addToast,
    }));
    const isNote = entity.entity_type === 'note';
    const supportsTitle = ['drawing', 'legend', 'schedule'].includes(entity.entity_type);
    const isSymDef = entity.entity_type === 'symbol_definition';
    const isCompDef = entity.entity_type === 'component_definition';
    const isSymInst = entity.entity_type === 'symbol_instance';
    const isCompInst = entity.entity_type === 'component_instance';
    const [title, setTitle] = React.useState(supportsTitle ? (entity.title || '') : '');
    const [text, setText] = React.useState(isNote ? (entity.text || '') : '');
    const [name, setName] = React.useState(isSymDef || isCompDef ? (entity.name || '') : '');
    const [scope, setScope] = React.useState<'project' | 'sheet'>(isSymDef || isCompDef ? (entity.scope || 'sheet') : 'sheet');
    const [description, setDescription] = React.useState(isSymDef || isCompDef ? (entity.description || '') : '');
    const [visual, setVisual] = React.useState(isSymDef ? (entity.visual_pattern_description || '') : '');
    const [specs, setSpecs] = React.useState(isCompDef ? JSON.stringify(entity.specifications || {}, null, 2) : '');
    // Sync when entity object updates (same id but refreshed data) or id changes
    React.useEffect(() => {
        if (supportsTitle) setTitle(entity.title || ''); else setTitle('');
        if (isNote) setText(entity.text || ''); else setText('');
        if (isSymDef || isCompDef) {
            setName(entity.name || '');
            setScope(entity.scope || 'sheet');
            setDescription(entity.description || '');
            if (isSymDef) setVisual(entity.visual_pattern_description || ''); else setVisual('');
            if (isCompDef) setSpecs(JSON.stringify(entity.specifications || {}, null, 2)); else setSpecs('');
        } else {
            setName(''); setDescription(''); setVisual(''); setSpecs('');
        }
    }, [entity.id, entity.title, entity.text]);
    const dirtyDefinitions = (() => {
        if (!(isSymDef || isCompDef)) return false;
        const baseChanged = (name || '') !== (entity.name || '') || (scope || 'sheet') !== (entity.scope || 'sheet') || (description || '') !== (entity.description || '');
        if (isSymDef) {
            return baseChanged || (visual || '') !== (entity.visual_pattern_description || '');
        }
        if (isCompDef) {
            const orig = JSON.stringify(entity.specifications || {}, null, 2);
            return baseChanged || (specs || '') !== orig;
        }
        return false;
    })();
    const dirty = (
        (supportsTitle && (title || '') !== (entity.title || '')) ||
        (isNote && (text || '') !== (entity.text || '')) ||
        dirtyDefinitions
    );
    const save = async () => {
        if (!dirty) return;
        const payload: any = {};
        if (supportsTitle) payload.title = title.trim() || null;
        if (isNote) payload.text = text.trim() || null;
        if (isSymDef || isCompDef) {
            payload.name = name.trim() || null;
            payload.scope = scope;
            payload.description = description.trim() || null;
            if (isSymDef) payload.visual_pattern_description = visual.trim() || null;
            if (isCompDef) {
                try { payload.specifications = specs.trim() ? JSON.parse(specs) : {}; }
                catch { alert('Specifications must be valid JSON'); return; }
            }
        }
        await updateEntityMeta(entity.id, payload);
    };
    return (
        <div style={{ border: '1px solid #1e3a8a', background: '#102a44', padding: 10, borderRadius: 6, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: '#f1f5f9' }}>{entity.entity_type} #{entity.id.slice(0, 6)}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={deselect} style={miniBtn(false)} title="Deselect">✕</button>
                    <button onClick={() => { if (confirm('Delete entity?')) deleteEntity(entity.id); }} style={miniBtn(false)} title="Delete">🗑</button>
                </div>
            </div>
            {/* Linkage summary for instances */}
            {(isSymInst || isCompInst) && (() => {
                let label = '';
                if (isSymInst) {
                    const def = (useProjectStore.getState() as any).entities.find((e: any) => e.id === entity.symbol_definition_id);
                    label = def ? `Instance of: ${def.name || def.id.slice(0,6)}` : `Instance of: ${entity.symbol_definition_id?.slice?.(0,6)}`;
                } else if (isCompInst) {
                    const def = (useProjectStore.getState() as any).entities.find((e: any) => e.id === entity.component_definition_id);
                    label = def ? `Instance of: ${def.name || def.id.slice(0,6)}` : `Instance of: ${entity.component_definition_id?.slice?.(0,6)}`;
                }
                return <div style={{ fontSize: 11, marginBottom: 6, color: '#fde68a' }}>{label}</div>;
            })()}
            <div style={{ fontSize: 10, opacity: .7, marginBottom: 4, color: '#cbd5e1' }}>Bounding Box (PDF pts)</div>
            <div style={{ fontSize: 11, background: '#1e293b', padding: '4px 6px', border: '1px solid #1e3a8a', borderRadius: 4, marginBottom: 10, color: '#e2e8f0' }}>
                {entity.bounding_box.x1.toFixed(2)}, {entity.bounding_box.y1.toFixed(2)}, {entity.bounding_box.x2.toFixed(2)}, {entity.bounding_box.y2.toFixed(2)}
            </div>
            {/* Instance-specific fields */}
            {isSymInst && (
                <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontSize: 10, opacity: .7, marginBottom: 2, color: '#cbd5e1' }}>Recognized Text</label>
                    <input defaultValue={entity.recognized_text || ''} onBlur={(e) => (e.target as HTMLInputElement).value !== (entity.recognized_text || '') && updateEntityMeta(entity.id, { recognized_text: (e.target as HTMLInputElement).value })} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                </div>
            )}
            {supportsTitle && (
                <>
                    <label style={{ display: 'block', fontSize: 10, opacity: .7, marginBottom: 2, color: '#cbd5e1' }}>Title</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { save(); (e.target as HTMLInputElement).blur(); } }}
                        placeholder="Optional title"
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, marginBottom: isNote ? 10 : 0 }}
                    />
                </>
            )}
            {isNote && (
                <>
                    {supportsTitle && <div style={{ height: 10 }} />}
                    <label style={{ display: 'block', fontSize: 10, opacity: .7, margin: '10px 0 2px', color: '#cbd5e1' }}>Text</label>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={4}
                        placeholder="Note text"
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical', marginBottom: 8 }}
                    />
                </>
            )}
            {(isSymDef || isCompDef) && (
                <>
                    <div style={{ height: 10 }} />
                    <label style={{ display: 'block', fontSize: 10, opacity: .7, marginBottom: 2, color: '#cbd5e1' }}>Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Required" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                            <input type="radio" checked={scope === 'sheet'} onChange={() => setScope('sheet')} /> This Sheet Only
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f8fafc' }}>
                            <input type="radio" checked={scope === 'project'} onChange={() => setScope('project')} /> Project-Wide
                        </label>
                    </div>
                    <label style={{ display: 'block', fontSize: 10, opacity: .7, margin: '10px 0 2px', color: '#cbd5e1' }}>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                    {isSymDef && (
                        <>
                            <label style={{ display: 'block', fontSize: 10, opacity: .7, margin: '10px 0 2px', color: '#cbd5e1' }}>Visual Pattern Description</label>
                            <textarea value={visual} onChange={e => setVisual(e.target.value)} rows={2} placeholder="Optional" style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                        </>
                    )}
                    {isCompDef && (
                        <>
                            <label style={{ display: 'block', fontSize: 10, opacity: .7, margin: '10px 0 2px', color: '#cbd5e1' }}>Specifications (JSON)</label>
                            <textarea value={specs} onChange={e => setSpecs(e.target.value)} rows={6} placeholder='{"key":"value"}' style={{ width: '100%', background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4, resize: 'vertical' }} />
                        </>
                    )}
                </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button disabled={!dirty} onClick={save} style={miniBtn(!dirty)}>{dirty ? 'Save' : 'Saved'}</button>
                <div style={{ fontSize: 10, opacity: .6, color: '#cbd5e1' }}>Cmd/Ctrl+Enter to save</div>
            </div>
            <div style={{ fontSize: 10, opacity: .55, marginTop: 6, color: '#94a3b8' }}>
                {supportsTitle && !isNote && !isSymDef && !isCompDef && 'Only title is stored for this entity type.'}
                {isNote && 'Only text is stored for notes.'}
                {(isSymDef || isCompDef) && 'You can edit definition attributes here. BBoxes are still edited on the canvas.'}
            </div>
            {/* Linked concepts (parents) */}
            {(() => {
                // Parent Spaces: drawing via DEPICTS (source = drawing), instances via LOCATED_IN (source = instance)
                const parentSpaces = (() => {
                    if (entity.entity_type === 'drawing') {
                        return links.filter((l: any) => l.rel_type === 'DEPICTS' && l.source_id === entity.id)
                            .map((l: any) => concepts.find((c: any) => c.id === l.target_id))
                            .filter(Boolean);
                    }
                    if (entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance') {
                        return links.filter((l: any) => l.rel_type === 'LOCATED_IN' && l.source_id === entity.id)
                            .map((l: any) => concepts.find((c: any) => c.id === l.target_id))
                            .filter(Boolean);
                    }
                    return [] as any[];
                })();
                // Parent Scopes: this entity is evidence via JUSTIFIED_BY (target = entity)
                const parentScopes = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.target_id === entity.id)
                    .map((l: any) => concepts.find((c: any) => c.id === l.source_id))
                    .filter((c: any) => c && c.kind === 'scope');
                if ((parentSpaces.length === 0) && (parentScopes.length === 0)) return null;
                const unlink = async (conceptId: string) => {
                    // Find the specific link(s) and delete them
                    const toDelete = links.filter((l: any) =>
                        (l.rel_type === 'DEPICTS' && entity.entity_type === 'drawing' && l.source_id === entity.id && l.target_id === conceptId) ||
                        (l.rel_type === 'LOCATED_IN' && (entity.entity_type === 'symbol_instance' || entity.entity_type === 'component_instance') && l.source_id === entity.id && l.target_id === conceptId) ||
                        (l.rel_type === 'JUSTIFIED_BY' && l.target_id === entity.id && l.source_id === conceptId)
                    );
                    if (!toDelete.length) return;
                    try {
                        for (const lnk of toDelete) { await deleteLinkById(lnk.id); }
                        addToast({ kind: 'success', message: 'Link removed' });
                    } catch (e: any) {
                        console.error(e);
                        addToast({ kind: 'error', message: e?.message || 'Failed to remove link' });
                    }
                };
                return (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>Linked Concepts</div>
                        </div>
                        {parentSpaces.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#e2e8f0' }}>
                                <div style={{ opacity: .8, marginBottom: 4 }}>Spaces:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {parentSpaces.map((sp: any) => (
                                        <span key={sp.id} style={{ fontSize: 10, border: '1px solid #334155', padding: '2px 6px', borderRadius: 10, background: '#0b1220' }}>
                                            {sp.name || sp.id.slice(0,6)}
                                            <button onClick={() => unlink(sp.id)} style={{ marginLeft: 6, fontSize: 10, background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {parentScopes.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#e2e8f0' }}>
                                <div style={{ opacity: .8, marginBottom: 4 }}>Scopes:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {parentScopes.map((sc: any) => (
                                        <span key={sc.id} style={{ fontSize: 10, border: '1px solid #334155', padding: '2px 6px', borderRadius: 10, background: '#0b1220' }}>
                                            {sc.description?.slice(0, 50) || sc.id.slice(0,6)}
                                            <button onClick={() => unlink(sc.id)} style={{ marginLeft: 6, fontSize: 10, background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

interface ConceptSpacesProps {
    concepts: any[];
    entities: any[];
    links: any[];
    createConcept: (data: { kind: 'space'; name: string }) => Promise<void>;
    updateConcept: (id: string, data: Partial<{ name: string }>) => Promise<void>;
    deleteConcept: (id: string) => Promise<void>;
    deleteLink: (id: string) => Promise<void>;
    startLinking: (relType: 'DEPICTS' | 'LOCATED_IN', anchor: { kind: 'space'; id: string }) => void;
}

const ConceptSpacesSection: React.FC<ConceptSpacesProps> = ({ concepts, entities, links, createConcept, updateConcept, deleteConcept, deleteLink, startLinking }) => {
    const spaces = concepts.filter(c => c.kind === 'space');
    const [draftName, setDraftName] = React.useState('');
    return (
        <div style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginTop: 6, background: '#0b1220', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="New space name" style={{ flex: 1, background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                <button disabled={!draftName.trim()} onClick={() => { if (!draftName.trim()) return; createConcept({ kind: 'space', name: draftName.trim() }); setDraftName(''); }} style={miniBtn(!draftName.trim())}>+ Add</button>
            </div>
            {spaces.length === 0 && <div style={{ fontSize: 11, opacity: .8 }}>(No spaces yet)</div>}
            {spaces.map((s) => {
                const depicting = links.filter((l: any) => l.rel_type === 'DEPICTS' && l.target_id === s.id);
                const located = links.filter((l: any) => l.rel_type === 'LOCATED_IN' && l.target_id === s.id);
                return (
                    <div key={s.id} style={{ border: '1px solid #334155', borderRadius: 4, padding: '6px 6px 8px', marginBottom: 6, background: '#111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <input defaultValue={s.name} onBlur={(e) => { const v = (e.target as HTMLInputElement).value; if (v && v !== s.name) updateConcept(s.id, { name: v }); }} style={{ background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '2px 6px', borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => startLinking('DEPICTS', { kind: 'space', id: s.id })} style={miniBtn(false)} title="Add depicting drawings">Link Drawings</button>
                                <button onClick={() => startLinking('LOCATED_IN', { kind: 'space', id: s.id })} style={miniBtn(false)} title="Add instances located in this space">Link Instances</button>
                                <button onClick={() => deleteConcept(s.id)} style={miniBtn(false)} title="Delete space">🗑</button>
                            </div>
                        </div>
                        {/* Linked pills */}
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {depicting.map((l: any) => {
                                const dr = entities.find((e: any) => e.id === l.source_id);
                                const label = dr ? (dr.title || 'Drawing') : l.source_id.slice(0, 6);
                                return (
                                    <span key={l.id} style={{ fontSize: 10, border: '1px solid #334155', padding: '2px 6px', borderRadius: 10, background: '#0b1220' }}>
                                        <span onClick={() => { if (dr) { (useProjectStore.getState() as any).setCurrentPageIndex(dr.source_sheet_number - 1); (useProjectStore.getState() as any).setRightPanelTab('entities'); (useProjectStore.getState() as any).setSelectedEntityId(dr.id); } }} style={{ cursor: dr ? 'pointer' : 'default' }}>DEPICTS: {label}</span>
                                        <button onClick={() => deleteLink(l.id)} style={{ marginLeft: 6, fontSize: 10, background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>×</button>
                                    </span>
                                );
                            })}
                            {located.map((l: any) => {
                                const inst = entities.find((e: any) => e.id === l.source_id);
                                const label = inst ? inst.entity_type.replace('_', ' ') : l.source_id.slice(0, 6);
                                return (
                                    <span key={l.id} style={{ fontSize: 10, border: '1px solid #334155', padding: '2px 6px', borderRadius: 10, background: '#0b1220' }}>
                                        <span onClick={() => { if (inst) { (useProjectStore.getState() as any).setCurrentPageIndex(inst.source_sheet_number - 1); (useProjectStore.getState() as any).setRightPanelTab('entities'); (useProjectStore.getState() as any).setSelectedEntityId(inst.id); } }} style={{ cursor: inst ? 'pointer' : 'default' }}>LOCATED_IN: {label}</span>
                                        <button onClick={() => deleteLink(l.id)} style={{ marginLeft: 6, fontSize: 10, background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>×</button>
                                    </span>
                                );
                            })}
                            {depicting.length + located.length === 0 && <span style={{ fontSize: 10, opacity: .7 }}>(No links yet)</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface ConceptScopesProps {
    concepts: any[];
    entities: any[];
    links: any[];
    createConcept: (data: { kind: 'scope'; description: string; category?: string | null }) => Promise<void>;
    updateConcept: (id: string, data: Partial<{ description: string; category?: string | null }>) => Promise<void>;
    deleteConcept: (id: string) => Promise<void>;
    deleteLink: (id: string) => Promise<void>;
    startLinking: (relType: 'JUSTIFIED_BY', anchor: { kind: 'scope'; id: string }) => void;
}

const ConceptScopesSection: React.FC<ConceptScopesProps> = ({ concepts, entities, links, createConcept, updateConcept, deleteConcept, deleteLink, startLinking }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');
    const [desc, setDesc] = React.useState('');
    const [cat, setCat] = React.useState('');
    return (
        <div style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginTop: 6, background: '#0b1220', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="New scope description" style={{ flex: 1, background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                <input value={cat} onChange={e => setCat(e.target.value)} placeholder="Category (optional)" style={{ width: 160, background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '4px 6px', borderRadius: 4 }} />
                <button disabled={!desc.trim()} onClick={() => { if (!desc.trim()) return; createConcept({ kind: 'scope', description: desc.trim(), category: cat.trim() || undefined }); setDesc(''); setCat(''); }} style={miniBtn(!desc.trim())}>+ Add</button>
            </div>
            {scopes.length === 0 && <div style={{ fontSize: 11, opacity: .8 }}>(No scopes yet)</div>}
            {scopes.map((s) => {
                const evidence = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id);
                return (
                    <div key={s.id} style={{ border: '1px solid #334155', borderRadius: 4, padding: '6px 6px 8px', marginBottom: 6, background: '#111827' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 6, alignItems: 'center' }}>
                            <input defaultValue={s.description} onBlur={(e) => { const v = (e.target as HTMLInputElement).value; if (v && v !== s.description) updateConcept(s.id, { description: v }); }} style={{ background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '2px 6px', borderRadius: 4 }} />
                            <input defaultValue={s.category || ''} onBlur={(e) => { const v = (e.target as HTMLInputElement).value; if (v !== (s.category || '')) updateConcept(s.id, { category: v || null }); }} placeholder="Category" style={{ background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, padding: '2px 6px', borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button onClick={() => startLinking('JUSTIFIED_BY', { kind: 'scope', id: s.id })} style={miniBtn(false)} title="Add evidence links">Link Evidence</button>
                                <button onClick={() => deleteConcept(s.id)} style={miniBtn(false)} title="Delete scope">🗑</button>
                            </div>
                        </div>
                        {/* Evidence pills */}
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {evidence.map((l: any) => {
                                const ev = entities.find((e: any) => e.id === l.target_id);
                                const label = ev ? (ev.title || ev.name || ev.entity_type) : l.target_id.slice(0, 6);
                                return (
                                    <span key={l.id} style={{ fontSize: 10, border: '1px solid #334155', padding: '2px 6px', borderRadius: 10, background: '#0b1220' }}>
                                        <span onClick={() => { if (ev) { (useProjectStore.getState() as any).setCurrentPageIndex(ev.source_sheet_number - 1); (useProjectStore.getState() as any).setRightPanelTab('entities'); (useProjectStore.getState() as any).setSelectedEntityId(ev.id); } }} style={{ cursor: ev ? 'pointer' : 'default' }}>JUSTIFIED_BY: {label}</span>
                                        <button onClick={() => deleteLink(l.id)} style={{ marginLeft: 6, fontSize: 10, background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>×</button>
                                    </span>
                                );
                            })}
                            {evidence.length === 0 && <span style={{ fontSize: 10, opacity: .7 }}>(No evidence yet)</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
