import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const RightPanel: React.FC = () => {
    const { currentPageIndex, pageOcr, ocrBlockState, setBlockStatus, toggleOcr, showOcr, selectedBlocks, toggleSelectBlock, clearSelection, bulkSetStatus, mergeSelectedBlocks, deleteSelectedBlocks, promoteSelectionToNote, notes, rightPanelTab, setRightPanelTab, setScrollTarget, updateNoteType, pageTitles, setPageTitle, deriveTitleFromBlocks, entities, startEntityCreation, startDefinitionCreation, creatingEntity, cancelEntityCreation, fetchEntities, selectedEntityId, setSelectedEntityId, updateEntityMeta, deleteEntity, addToast } = useProjectStore((s: ProjectStore & any) => ({
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
        addToast: s.addToast
    }));
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
                <section className="kp-section" style={{ maxHeight: 520, overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Entities (Page {currentPageIndex + 1})</div>
                        <button onClick={() => fetchEntities()} style={miniBtn(false)}>↻</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {(['drawing', 'legend', 'schedule', 'note'] as const).map(t => (
                            <button key={t} disabled={!!creatingEntity} onClick={() => startEntityCreation(t)} style={miniBtn(!!creatingEntity)}>{t}</button>
                        ))}
                        {creatingEntity && <button onClick={() => cancelEntityCreation()} style={miniBtn(false)}>Cancel</button>}
                    </div>
                    {creatingEntity && <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>Drawing new {creatingEntity.type}: click-drag on sheet to place. Esc to cancel.</div>}
                    {/* Selected Entity Editor */}
                    {selectedEntityId && (() => {
                        const ent = entities.find((e: any) => e.id === selectedEntityId);
                        if (!ent || ent.source_sheet_number !== currentPageIndex + 1) return null;
                        return (
                            <EntityEditor key={ent.id} entity={ent} updateEntityMeta={updateEntityMeta} deleteEntity={deleteEntity} deselect={() => setSelectedEntityId(null)} />
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
                            <div style={{ border: '1px dashed #334155', padding: 8, borderRadius: 6, marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{isLegend ? 'Symbol Definitions' : 'Component Definitions'}</div>
                                    <button
                                        onClick={() => {
                                            const name = prompt('Name (required):') || '';
                                            if (!name.trim()) { addToast({ kind: 'error', message: 'Name is required' }); return; }
                                            const scope = (prompt("Scope: type 'project' or 'sheet' (default: sheet)") || 'sheet').toLowerCase() === 'project' ? 'project' : 'sheet';
                                            const description = prompt('Description (optional):') || '';
                                            if (isLegend) {
                                                const visual = prompt('Visual pattern description (optional):') || '';
                                                startDefinitionCreation('symbol_definition', parent.id, { name, scope, description, visual_pattern_description: visual });
                                                setRightPanelTab('entities');
                                                addToast({ kind: 'info', message: 'Draw a tight box around the symbol within the legend' });
                                            } else {
                                                startDefinitionCreation('component_definition', parent.id, { name, scope, description, specifications: {} });
                                                setRightPanelTab('entities');
                                                addToast({ kind: 'info', message: 'Draw a tight box around the component key within the schedule' });
                                            }
                                        }}
                                        style={miniBtn(false)}
                                    >+ Add Definition</button>
                                </div>
                                {defs.length === 0 && <div style={{ fontSize: 11, opacity: .65 }}>(None yet)</div>}
                                {defs.map((d: any) => {
                                    const sel = d.id === selectedEntityId;
                                    return (
                                        <div key={d.id} onClick={() => setSelectedEntityId(d.id)} style={{ border: '1px solid ' + (sel ? '#1e3a8a' : '#374151'), borderRadius: 4, padding: '4px 6px', marginBottom: 6, background: sel ? '#0f172a' : '#111827', cursor: 'pointer' }}>
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
                    <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>Backend Entities</div>
                    {entities.filter((e: any) => e.source_sheet_number === currentPageIndex + 1).map((e: any) => {
                        const selected = e.id === selectedEntityId;
                        return (
                            <div
                                key={e.id}
                                onClick={() => setSelectedEntityId(selected ? null : e.id)}
                                style={{
                                    border: '1px solid ' + (selected ? '#1e3a8a' : '#374151'),
                                    boxShadow: selected ? '0 0 0 1px #1e3a8a' : 'none',
                                    borderRadius: 4,
                                    padding: '4px 6px',
                                    marginBottom: 6,
                                    background: selected ? '#1e3a8a' : '#111827',
                                    color: '#f1f5f9',
                                    fontSize: 11,
                                    cursor: 'pointer'
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
                                {selected && <div style={{ marginTop: 4, fontSize: 10, opacity: .8 }}>Click again to deselect • Edit form above</div>}
                            </div>
                        );
                    })}
                    {entities.filter((e: any) => e.source_sheet_number === currentPageIndex + 1).length === 0 && <div style={{ fontSize: 11, opacity: .6 }}>(None yet)</div>}
                    <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.4, opacity: .65 }}>Notes (promoted OCR selections) remain separate below:</div>
                    <div style={{ fontWeight: 600, fontSize: 12, margin: '8px 0 4px' }}>Local Notes ({notes.filter((n: any) => n.pageIndex === currentPageIndex).length})</div>
                    {notes.filter((n: any) => n.pageIndex === currentPageIndex).map((n: any) => {
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
            <section className="kp-section muted" style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, lineHeight: 1.4 }}>Tips: Use Cmd/Ctrl/Shift to multi-select. Merge creates a composite block. Promote turns selection into a Note and auto-accepts its blocks.</p>
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
    updateEntityMeta: (id: string, data: { title?: string | null; text?: string | null }) => Promise<void>;
    deleteEntity: (id: string) => Promise<void>;
    deselect: () => void;
}

const EntityEditor: React.FC<EntityEditorProps> = ({ entity, updateEntityMeta, deleteEntity, deselect }) => {
    const isNote = entity.entity_type === 'note';
    const supportsTitle = ['drawing', 'legend', 'schedule'].includes(entity.entity_type);
    const [title, setTitle] = React.useState(supportsTitle ? (entity.title || '') : '');
    const [text, setText] = React.useState(isNote ? (entity.text || '') : '');
    // Sync when entity object updates (same id but refreshed data) or id changes
    React.useEffect(() => {
        if (supportsTitle) setTitle(entity.title || ''); else setTitle('');
        if (isNote) setText(entity.text || ''); else setText('');
    }, [entity.id, entity.title, entity.text]);
    const dirty = (
        (supportsTitle && (title || '') !== (entity.title || '')) ||
        (isNote && (text || '') !== (entity.text || ''))
    );
    const save = async () => {
        if (!dirty) return;
        const payload: any = {};
        if (supportsTitle) payload.title = title.trim() || null;
        if (isNote) payload.text = text.trim() || null;
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
            <div style={{ fontSize: 10, opacity: .7, marginBottom: 4, color: '#cbd5e1' }}>Bounding Box (PDF pts)</div>
            <div style={{ fontSize: 11, background: '#1e293b', padding: '4px 6px', border: '1px solid #1e3a8a', borderRadius: 4, marginBottom: 10, color: '#e2e8f0' }}>
                {entity.bounding_box.x1.toFixed(2)}, {entity.bounding_box.y1.toFixed(2)}, {entity.bounding_box.x2.toFixed(2)}, {entity.bounding_box.y2.toFixed(2)}
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button disabled={!dirty} onClick={save} style={miniBtn(!dirty)}>{dirty ? 'Save' : 'Saved'}</button>
                <div style={{ fontSize: 10, opacity: .6, color: '#cbd5e1' }}>Cmd/Ctrl+Enter to save</div>
            </div>
            <div style={{ fontSize: 10, opacity: .55, marginTop: 6, color: '#94a3b8' }}>
                {supportsTitle && !isNote && 'Only title is stored for this entity type.'}
                {isNote && 'Only text is stored for notes.'}
            </div>
        </div>
    );
};
