import React from 'react';
import { useProjectStore } from '../state/store';

export const RightExplorer: React.FC = () => {
    const { concepts, entities, selectedScopeId, setSelectedScopeId, setHoverScopeId, hoverEntityId, explorerTab, setExplorerTab } = useProjectStore((s: any) => ({
        concepts: s.concepts,
        entities: s.entities,
        selectedScopeId: s.selectedScopeId,
        setSelectedScopeId: s.setSelectedScopeId,
        setHoverScopeId: s.setHoverScopeId,
        hoverEntityId: s.hoverEntityId,
        explorerTab: s.explorerTab,
        setExplorerTab: s.setExplorerTab,
    }));
    const tab = explorerTab;
    const setTab = setExplorerTab;
    return (
        <div className="right-explorer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTab('scopes')} style={btn(tab==='scopes')}>Scopes</button>
                <button onClick={() => setTab('symbolsInst')} style={btn(tab==='symbolsInst')}>Symbols ▸ Instances</button>
            </div>
            {tab === 'scopes' && <ScopesList concepts={concepts} selectedScopeId={selectedScopeId} setSelectedScopeId={setSelectedScopeId} entities={entities} setHover={(id)=>setHoverScopeId(id)} />}
            {tab === 'symbolsInst' && <SymbolsInstances entities={entities} hoverEntityId={hoverEntityId} />}
        </div>
    );
};

const ScopesList: React.FC<{ concepts: any[]; selectedScopeId: string | null; setSelectedScopeId: (id: string | null) => void; entities: any[]; setHover: (id: string | null) => void; }> = ({ concepts, selectedScopeId, setSelectedScopeId, entities, setHover }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {scopes.map(s => {
                const evidenceCount = (useProjectStore.getState() as any).links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id).length;
                const sel = selectedScopeId === s.id;
                return (
                    <div
                        key={s.id}
                        onClick={() => setSelectedScopeId(sel ? null : s.id)}
                        onDoubleClick={() => {
                            // Jump to first evidence entity
                            const st = useProjectStore.getState() as any;
                            const links = st.links as any[];
                            const ev = links.find(l => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id);
                            if (ev) {
                                const ent = (st.entities as any[]).find(e => e.id === ev.target_id);
                                if (ent) {
                                    st.setCurrentPageIndex?.(ent.source_sheet_number - 1);
                                    st.setSelectedEntityId(ent.id);
                                    st.setRightPanelTab('entities');
                                }
                            }
                        }}
                        onMouseEnter={() => setHover(s.id)}
                        onMouseLeave={() => setHover(null)}
                        style={{ padding: 8, borderRadius: 6, border: sel ? '1px solid #2563eb' : '1px solid #e1e6eb', background: sel ? '#eff6ff' : '#fff', cursor: 'pointer', marginBottom: 6 }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{s.description || s.id.slice(0,6)}</div>
                        <div style={{ fontSize: 11, opacity: .7 }}>Evidence: {evidenceCount}</div>
                    </div>
                );
            })}
            {scopes.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No scopes yet)</div>}
        </div>
    );
};

const SymbolsInstances: React.FC<{ entities: any[]; hoverEntityId?: string | null }> = ({ entities, hoverEntityId }) => {
    const { setHoverEntityId, currentPageIndex, creatingEntity, startInstanceStamp, cancelEntityCreation } = useProjectStore((s: any) => ({
        setHoverEntityId: s.setHoverEntityId,
        currentPageIndex: s.currentPageIndex,
        creatingEntity: s.creatingEntity,
        startInstanceStamp: s.startInstanceStamp,
        cancelEntityCreation: s.cancelEntityCreation,
    }));
    const defs = entities.filter((e: any) => e.entity_type === 'symbol_definition' && (e.scope === 'project' || e.source_sheet_number === currentPageIndex + 1));
    // Keyboard shortcuts 1..9 to pick def
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!document.body.contains(document.activeElement) || (document.activeElement as HTMLElement).tagName === 'INPUT' || (document.activeElement as HTMLElement).tagName === 'TEXTAREA') return;
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= 9) {
                const d = defs[n - 1];
                if (d) { startInstanceStamp('symbol', d.id); e.preventDefault(); }
            }
            if (e.key === 'Escape') { if (creatingEntity && (creatingEntity.type === 'symbol_instance')) cancelInstanceStamp(); }
        };
        const cancelInstanceStamp = () => { if (creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance')) cancelEntityCreation(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [defs, creatingEntity, startInstanceStamp, cancelEntityCreation]);
    const inst = entities.filter(e => e.entity_type === 'symbol_instance');
    // Group by containing drawing using bbox containment; fallback to sheet group if none
    const drawings = entities.filter(e => e.entity_type === 'drawing');
    const grouped = inst.reduce((acc: Record<string, any[]>, e: any) => {
        const d = drawings.find((dr: any) => {
            const bb = dr.bounding_box; const ib = e.bounding_box;
            return ib.x1 >= bb.x1 && ib.y1 >= bb.y1 && ib.x2 <= bb.x2 && ib.y2 <= bb.y2 && dr.source_sheet_number === e.source_sheet_number;
        });
        const key = d ? `d:${d.id}` : `s:${e.source_sheet_number}`;
        (acc[key] ||= []).push(e);
        return acc;
    }, {} as Record<string, any[]>);
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {/* Stamp Palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {defs.slice(0, 9).map((d: any, idx: number) => {
                    const active = creatingEntity && creatingEntity.type === 'symbol_instance' && creatingEntity.meta?.definitionId === d.id;
                    return (
                        <button key={d.id} onClick={() => startInstanceStamp('symbol', d.id)} title={`Press ${idx + 1}`} style={{ background: active ? '#2563eb' : '#f5f7fa', color: active ? '#fff' : '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>
                            [{idx + 1}] {d.name || d.id.slice(0,6)}
                        </button>
                    );
                })}
                {(creatingEntity && creatingEntity.type === 'symbol_instance') && (
                    <button onClick={() => cancelEntityCreation()} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>Cancel Stamping (Esc)</button>
                )}
            </div>
            {Object.keys(grouped).map((key) => (
                <div key={key} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                    <div style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>
                        {(() => {
                            if (key.startsWith('d:')) {
                                const id = key.slice(2);
                                const dr = drawings.find((d: any) => d.id === id);
                                return `Drawing ${dr?.title || id.slice(0,6)}`;
                            }
                            const sn = key.slice(2);
                            return `Sheet ${sn}`;
                        })()}
                    </div>
                    <div style={{ padding: '0 8px 8px', display: 'grid', gap: 6 }}>
                        {grouped[key].map(i => (
                            <div key={i.id} onMouseEnter={() => setHoverEntityId(i.id)} onMouseLeave={() => setHoverEntityId(null)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e1e6eb', background: hoverEntityId === i.id ? '#eff6ff' : '#fff' }}>
                                <div style={{ fontSize: 12 }}>#{i.id.slice(0,6)} • def {(() => {
                                    const def = entities.find((e: any) => e.id === i.symbol_definition_id);
                                    return def?.name || i.symbol_definition_id?.slice?.(0,6);
                                })()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {inst.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No instances yet)</div>}
        </div>
    );
};

function btn(active: boolean): React.CSSProperties {
    return { background: active ? '#2563eb' : '#f5f7fa', color: active ? '#fff' : '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' };
}


