import React from 'react';
import { useProjectStore } from '../state/store';

export const RightExplorer: React.FC = () => {
    const { concepts, entities, selectedScopeId, setSelectedScopeId, setHoverScopeId } = useProjectStore((s: any) => ({
        concepts: s.concepts,
        entities: s.entities,
        selectedScopeId: s.selectedScopeId,
        setSelectedScopeId: s.setSelectedScopeId,
        setHoverScopeId: s.setHoverScopeId,
    }));
    const [tab, setTab] = React.useState<'scopes'|'symbolsInst'>('scopes');
    return (
        <div className="right-explorer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTab('scopes')} style={btn(tab==='scopes')}>Scopes</button>
                <button onClick={() => setTab('symbolsInst')} style={btn(tab==='symbolsInst')}>Symbols ▸ Instances</button>
            </div>
            {tab === 'scopes' && <ScopesList concepts={concepts} selectedScopeId={selectedScopeId} setSelectedScopeId={setSelectedScopeId} entities={entities} setHover={(id)=>setHoverScopeId(id)} />}
            {tab === 'symbolsInst' && <SymbolsInstances entities={entities} />}
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

const SymbolsInstances: React.FC<{ entities: any[] }> = ({ entities }) => {
    const inst = entities.filter(e => e.entity_type === 'symbol_instance');
    const grouped = inst.reduce((acc: Record<number, any[]>, e: any) => {
        const sn = e.source_sheet_number; (acc[sn] ||= []).push(e); return acc;
    }, {});
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {Object.keys(grouped).sort((a,b)=>parseInt(a)-parseInt(b)).map((sn) => (
                <div key={sn} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                    <div style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>Sheet {sn}</div>
                    <div style={{ padding: '0 8px 8px', display: 'grid', gap: 6 }}>
                        {grouped[parseInt(sn,10)].map(i => (
                            <div key={i.id} style={{ padding: 6, borderRadius: 6, border: '1px solid #e1e6eb' }}>
                                <div style={{ fontSize: 12 }}>#{i.id.slice(0,6)} • def {i.symbol_definition_id?.slice?.(0,6)}</div>
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


