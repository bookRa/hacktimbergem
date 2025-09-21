import React from 'react';
import { useProjectStore } from '../state/store';

export const RightExplorer: React.FC = () => {
    const { concepts, entities, selectedScopeId, setSelectedScopeId } = useProjectStore((s: any) => ({
        concepts: s.concepts,
        entities: s.entities,
        selectedScopeId: s.selectedScopeId,
        setSelectedScopeId: s.setSelectedScopeId,
    }));
    const [tab, setTab] = React.useState<'scopes'|'symbolsInst'>('scopes');
    return (
        <div className="right-explorer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTab('scopes')} style={btn(tab==='scopes')}>Scopes</button>
                <button onClick={() => setTab('symbolsInst')} style={btn(tab==='symbolsInst')}>Symbols ▸ Instances</button>
            </div>
            {tab === 'scopes' && <ScopesList concepts={concepts} selectedScopeId={selectedScopeId} setSelectedScopeId={setSelectedScopeId} entities={entities} />}
            {tab === 'symbolsInst' && <SymbolsInstances entities={entities} />}
        </div>
    );
};

const ScopesList: React.FC<{ concepts: any[]; selectedScopeId: string | null; setSelectedScopeId: (id: string | null) => void; entities: any[] }> = ({ concepts, selectedScopeId, setSelectedScopeId, entities }) => {
    const scopes = concepts.filter(c => c.kind === 'scope');
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {scopes.map(s => {
                const evidenceCount = (useProjectStore.getState() as any).links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id).length;
                const sel = selectedScopeId === s.id;
                return (
                    <div key={s.id} onClick={() => setSelectedScopeId(sel ? null : s.id)} style={{ padding: 8, borderRadius: 6, border: sel ? '1px solid #2563eb' : '1px solid #e1e6eb', background: sel ? '#eff6ff' : '#fff', cursor: 'pointer', marginBottom: 6 }}>
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
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {inst.map(i => (
                <div key={i.id} style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e6eb', background: '#fff', marginBottom: 6 }}>
                    <div style={{ fontSize: 12 }}>#{i.id.slice(0,6)} on sheet {i.source_sheet_number}</div>
                </div>
            ))}
            {inst.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No instances yet)</div>}
        </div>
    );
};

function btn(active: boolean): React.CSSProperties {
    return { background: active ? '#2563eb' : '#f5f7fa', color: active ? '#fff' : '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' };
}


