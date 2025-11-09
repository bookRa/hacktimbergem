import React, { useEffect } from 'react';
import { useProjectStore } from '../state/store';
import { navigateToScope } from '../utils/router';
import { useUIV2Linking, useUIV2Actions } from '../state/ui_v2';

export const RightExplorer: React.FC = () => {
    const { concepts, entities, selectedScopeId, setSelectedScopeId, setHoverScopeId, hoverEntityId, explorerTab, setExplorerTab, selectSpace, links } = useProjectStore((s: any) => ({
        concepts: s.concepts,
        entities: s.entities,
        selectedScopeId: s.selectedScopeId,
        setSelectedScopeId: s.setSelectedScopeId,
        setHoverScopeId: s.setHoverScopeId,
        hoverEntityId: s.hoverEntityId,
        explorerTab: s.explorerTab,
        setExplorerTab: s.setExplorerTab,
        selectSpace: s.selectSpace,
        links: s.links,
    }));
    const tab = explorerTab;
    const setTab = setExplorerTab;
    return (
        <div className="right-explorer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setTab('scopes')} style={btn(tab==='scopes')}>Scopes</button>
                <button onClick={() => setTab('legends')} style={btn(tab==='legends')}>Legends</button>
                <button onClick={() => setTab('schedules')} style={btn(tab==='schedules')}>Schedules</button>
                <button onClick={() => setTab('assemblies')} style={btn(tab==='assemblies')}>Assemblies</button>
                <button onClick={() => setTab('symbolsDef')} style={btn(tab==='symbolsDef')}>Symbols ▸ Definitions</button>
                <button onClick={() => setTab('symbolsInst')} style={btn(tab==='symbolsInst')}>Symbols ▸ Instances</button>
                <button onClick={() => setTab('componentsDef')} style={btn(tab==='componentsDef')}>Components ▸ Definitions</button>
                <button onClick={() => setTab('componentsInst')} style={btn(tab==='componentsInst')}>Components ▸ Instances</button>
                <button onClick={() => setTab('spaces')} style={btn(tab==='spaces')}>Spaces</button>
                <button onClick={() => setTab('notes')} style={btn(tab==='notes')}>Notes</button>
            </div>
            {tab === 'scopes' && <ScopesList concepts={concepts} selectedScopeId={selectedScopeId} setSelectedScopeId={setSelectedScopeId} entities={entities} setHover={(id)=>setHoverScopeId(id)} />}
            {tab === 'legends' && <LegendsList entities={entities} />}
            {tab === 'schedules' && <SchedulesList entities={entities} />}
            {tab === 'assemblies' && <AssembliesList entities={entities} />}
            {tab === 'symbolsDef' && <SymbolsDefinitions entities={entities} />}
            {tab === 'symbolsInst' && <SymbolsInstances entities={entities} hoverEntityId={hoverEntityId} />}
            {tab === 'componentsDef' && <ComponentsDefinitions entities={entities} />}
            {tab === 'componentsInst' && <ComponentsInstances entities={entities} />}
            {tab === 'spaces' && <SpacesList concepts={concepts} onSelectSpace={(id) => selectSpace(id)} />}
            {tab === 'notes' && <NotesList entities={entities} />}
        </div>
    );
};

const ScopesList: React.FC<{ concepts: any[]; selectedScopeId: string | null; setSelectedScopeId: (id: string | null) => void; entities: any[]; setHover: (id: string | null) => void; }> = ({ concepts, selectedScopeId, setSelectedScopeId, entities, setHover }) => {
    // FIX: Query entities array, not concepts (scopes are stored as entities)
    const scopes = entities.filter((e: any) => e.entity_type === 'scope');
    const { links, selectEntity, setCurrentPageIndex, startScopeCreation, projectId } = useProjectStore((s: any) => ({
        links: s.links,
        selectEntity: s.selectEntity,
        setCurrentPageIndex: s.setCurrentPageIndex,
        startScopeCreation: s.startScopeCreation,
        projectId: s.projectId,
    }));
    
    // Separate conceptual (no bbox) from canvas-based (has bbox)
    const conceptualScopes = scopes.filter((s: any) => !s.bounding_box);
    const canvasScopes = scopes.filter((s: any) => s.bounding_box);
    
    // Count scopes with evidence
    const scopesWithEvidence = scopes.filter(s => 
        links.some((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id)
    ).length;
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {/* Header with action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingLeft: 4 }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                    {scopes.length} scopes • {scopesWithEvidence} with evidence
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                        onClick={() => startScopeCreation?.('conceptual')}
                        style={{ 
                            background: '#2563eb', 
                            color: 'white', 
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                        title="Create a project-level scope without canvas location"
                    >
                        + New Scope
                    </button>
                    <button 
                        onClick={() => startScopeCreation?.('canvas')}
                        style={{ 
                            background: '#f5f7fa', 
                            color: '#111', 
                            border: '1px solid #e1e6eb',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                        title="Draw a scope on the canvas"
                    >
                        + Draw Scope
                    </button>
                </div>
            </div>
            
            {/* Conceptual Scopes Section */}
            {conceptualScopes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6, paddingLeft: 4 }}>
                        💭 Conceptual Scopes ({conceptualScopes.length})
                    </div>
                    {conceptualScopes.map(s => {
                        const evidenceLinks = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id);
                        const evidenceCount = evidenceLinks.length;
                        const sel = selectedScopeId === s.id;
                        const hasEvidence = evidenceCount > 0;
                        
                        return (
                            <div
                                key={s.id}
                                onMouseEnter={() => setHover(s.id)}
                                onMouseLeave={() => setHover(null)}
                                style={{ padding: 8, borderRadius: 6, border: sel ? '1px solid #2563eb' : '1px solid #e1e6eb', background: sel ? '#eff6ff' : '#fff', marginBottom: 6 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedScopeId(sel ? null : s.id)}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name || s.description || s.id.slice(0,6)}</div>
                                        {s.description && s.name && (
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.description}</div>
                                        )}
                                        <div style={{ fontSize: 10, color: hasEvidence ? '#10b981' : '#f59e0b', marginTop: 2 }}>
                                            {hasEvidence ? `✓ ${evidenceCount} evidence` : '⚠ No evidence'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToScope(s.id, projectId);
                                            }}
                                            style={btn(false)}
                                            title="Open scope editor"
                                        >
                                            Open Editor
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Canvas Scopes Section */}
            {canvasScopes.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6, paddingLeft: 4 }}>
                        📍 Canvas Scopes ({canvasScopes.length})
                    </div>
                    {canvasScopes.map(s => {
                        const evidenceLinks = links.filter((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.source_id === s.id);
                        const evidenceCount = evidenceLinks.length;
                        const sel = selectedScopeId === s.id;
                        const hasEvidence = evidenceCount > 0;
                        
                        return (
                            <div
                                key={s.id}
                                onMouseEnter={() => setHover(s.id)}
                                onMouseLeave={() => setHover(null)}
                                style={{ padding: 8, borderRadius: 6, border: sel ? '1px solid #2563eb' : '1px solid #e1e6eb', background: sel ? '#eff6ff' : '#fff', marginBottom: 6 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedScopeId(sel ? null : s.id)}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name || s.description || s.id.slice(0,6)}</div>
                                        {s.description && s.name && (
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.description}</div>
                                        )}
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                            Sheet {s.source_sheet_number}
                                        </div>
                                        <div style={{ fontSize: 10, color: hasEvidence ? '#10b981' : '#f59e0b', marginTop: 2 }}>
                                            {hasEvidence ? `✓ ${evidenceCount} evidence` : '⚠ No evidence'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToScope(s.id, projectId);
                                            }}
                                            style={btn(false)}
                                            title="Open scope editor"
                                        >
                                            Open Editor
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Jump to scope on canvas
                                                if (s.source_sheet_number) {
                                                    setCurrentPageIndex(s.source_sheet_number - 1);
                                                    selectEntity(s.id);
                                                }
                                            }}
                                            style={btn(false)}
                                            title="Jump to scope on canvas"
                                        >
                                            Jump
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Empty state */}
            {scopes.length === 0 && <div style={{ fontSize: 12, opacity: .7, paddingLeft: 4 }}>(No scopes yet)</div>}
        </div>
    );
};

const SymbolsInstances: React.FC<{ entities: any[]; hoverEntityId?: string | null }> = ({ entities, hoverEntityId }) => {
    const { setHoverEntityId, currentPageIndex, creatingEntity, startInstanceStamp, cancelEntityCreation, selectEntity, links } = useProjectStore((s: any) => ({
        setHoverEntityId: s.setHoverEntityId,
        currentPageIndex: s.currentPageIndex,
        creatingEntity: s.creatingEntity,
        startInstanceStamp: s.startInstanceStamp,
        cancelEntityCreation: s.cancelEntityCreation,
        selectEntity: s.selectEntity,
        links: s.links,
    }));
    
    // UI V2 linking state
    const linking = useUIV2Linking();
    const { addPending } = useUIV2Actions();
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
                        {grouped[key].map(i => {
                            const def = entities.find((e: any) => e.id === i.symbol_definition_id);
                            const linkedToSpace = links.some((l: any) => l.rel_type === 'LOCATED_IN' && l.source_id === i.id);
                            const linkedToScope = links.some((l: any) => l.rel_type === 'JUSTIFIED_BY' && l.target_id === i.id);
                            
                            // Check if this instance is in the linking pending list
                            const isInLinkingPending = linking.active && linking.pending.some(p => p.id === i.id && p.type === 'SymbolInst');
                            const isLinkingSource = linking.active && linking.source?.id === i.id && linking.source?.type === 'SymbolInst';
                            
                            const handleClick = () => {
                                if (linking.active && linking.source?.type === 'Scope') {
                                    // In linking mode: add/remove from pending list
                                    addPending({
                                        type: 'SymbolInst',
                                        id: i.id,
                                        sheetId: String(i.source_sheet_number)
                                    });
                                } else {
                                    // Normal mode: open editor
                                    selectEntity(i.id);
                                }
                            };
                            
                            return (
                                <div 
                                    key={i.id} 
                                    onMouseEnter={() => setHoverEntityId(i.id)} 
                                    onMouseLeave={() => setHoverEntityId(null)} 
                                    onClick={handleClick}
                                    style={{ 
                                        padding: 6, 
                                        borderRadius: 6, 
                                        border: isInLinkingPending || isLinkingSource ? '2px solid #2563eb' : '1px solid #e1e6eb', 
                                        background: isInLinkingPending || isLinkingSource ? '#eff6ff' : (hoverEntityId === i.id ? '#f9fafb' : '#fff'),
                                        cursor: linking.active ? 'pointer' : 'default'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                                                #{i.id.slice(0,6)}
                                                {isInLinkingPending && <span style={{ color: '#2563eb', marginLeft: 4 }}>✓</span>}
                                            </div>
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                {def?.name || 'No definition'} 
                                                {(linkedToSpace || linkedToScope) && (
                                                    <span style={{ color: '#10b981', marginLeft: 4 }}>
                                                        {linkedToSpace && '📍'} {linkedToScope && '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!linking.active && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectEntity(i.id);
                                                }}
                                                style={btn(false)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {inst.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No instances yet)</div>}
        </div>
    );
};

const SymbolsDefinitions: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { selectEntity, currentPageIndex, setCurrentPageIndex, setFocusBBox, links } = useProjectStore((s: any) => ({ selectEntity: s.selectEntity, currentPageIndex: s.currentPageIndex, setCurrentPageIndex: s.setCurrentPageIndex, setFocusBBox: s.setFocusBBox, links: s.links }));
    const defs = entities.filter((e: any) => e.entity_type === 'symbol_definition');
    const legends = entities.filter((e: any) => e.entity_type === 'legend');
    const groups: Record<string, any[]> = {};
    defs.forEach(d => {
        const key = d.defined_in_id || (d.scope === 'project' ? 'Project' : `Sheet ${d.source_sheet_number}`);
        (groups[key] ||= []).push(d);
    });
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {Object.keys(groups).map((k) => (
                <div key={k} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                    <div style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>{k.startsWith('Sheet') || k==='Project' ? k : `Legend ${k.slice(0,6)}`}</div>
                    <div style={{ padding: '0 8px 8px', display: 'grid', gap: 6 }}>
                        {groups[k].map((d: any) => {
                            const instanceCount = entities.filter((e: any) => e.entity_type === 'symbol_instance' && e.symbol_definition_id === d.id).length;
                            
                            return (
                                <div key={d.id} style={{ padding: 6, borderRadius: 6, border: '1px solid #e1e6eb', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name || d.id.slice(0,6)}</div>
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                            {d.scope} • {instanceCount} instance{instanceCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => { 
                                            selectEntity(d.id); 
                                        }} style={btn(false)}>Edit</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {defs.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No symbol definitions)</div>}
        </div>
    );
};

const ComponentsDefinitions: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { selectEntity, currentPageIndex, setCurrentPageIndex, setFocusBBox, creatingEntity, startInstanceStamp, cancelEntityCreation } = useProjectStore((s: any) => ({ 
        selectEntity: s.selectEntity, 
        currentPageIndex: s.currentPageIndex, 
        setCurrentPageIndex: s.setCurrentPageIndex, 
        setFocusBBox: s.setFocusBBox,
        creatingEntity: s.creatingEntity,
        startInstanceStamp: s.startInstanceStamp,
        cancelEntityCreation: s.cancelEntityCreation
    }));
    const defs = entities.filter((e: any) => e.entity_type === 'component_definition');
    const schedules = entities.filter((e: any) => e.entity_type === 'schedule');
    
    // Keyboard shortcuts for stamping (1-9 keys)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const n = parseInt(e.key);
            if (n >= 1 && n <= 9) {
                const d = defs[n - 1];
                if (d) { startInstanceStamp('component', d.id); e.preventDefault(); }
            }
            if (e.key === 'Escape') { 
                if (creatingEntity && creatingEntity.type === 'component_instance') { 
                    cancelEntityCreation(); 
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [defs, creatingEntity, startInstanceStamp, cancelEntityCreation]);
    const groups: Record<string, any[]> = {};
    defs.forEach(d => {
        const key = d.defined_in_id || (d.scope === 'project' ? 'Project' : `Sheet ${d.source_sheet_number}`);
        (groups[key] ||= []).push(d);
    });
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {/* Stamp Palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {defs.slice(0, 9).map((d: any, idx: number) => {
                    const active = creatingEntity && creatingEntity.type === 'component_instance' && creatingEntity.meta?.definitionId === d.id;
                    return (
                        <button 
                            key={d.id} 
                            onClick={() => startInstanceStamp('component', d.id)} 
                            title={`Press ${idx + 1}`} 
                            style={{ 
                                background: active ? '#2563eb' : '#f5f7fa', 
                                color: active ? '#fff' : '#111', 
                                border: '1px solid #e1e6eb', 
                                borderRadius: 6, 
                                padding: '4px 6px', 
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 500
                            }}
                        >
                            [{idx + 1}] {d.name || d.id.slice(0,6)}
                        </button>
                    );
                })}
                {(creatingEntity && creatingEntity.type === 'component_instance') && (
                    <button 
                        onClick={() => cancelEntityCreation()} 
                        style={{ 
                            background: '#f59e0b', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '4px 6px', 
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 500
                        }}
                    >
                        Cancel Stamping (Esc)
                    </button>
                )}
            </div>
            {Object.keys(groups).map((k) => (
                <div key={k} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                    <div style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>{k.startsWith('Sheet') || k==='Project' ? k : `Schedule ${k.slice(0,6)}`}</div>
                    <div style={{ padding: '0 8px 8px', display: 'grid', gap: 6 }}>
                        {groups[k].map((d: any) => (
                            <div key={d.id} style={{ padding: 6, borderRadius: 6, border: '1px solid #e1e6eb', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name || d.id.slice(0,6)}</div>
                                    <div style={{ fontSize: 10, opacity: .7 }}>{d.scope}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => { selectEntity(d.id); }} style={btn(false)}>Edit</button>
                                    {d.defined_in_id && (() => {
                                        const parent = schedules.find((l: any) => l.id === d.defined_in_id);
                                        if (!parent) return null;
                                        return (
                                            <button onClick={() => { const idx = parent.source_sheet_number - 1; if (idx !== currentPageIndex) setCurrentPageIndex(idx); setFocusBBox(idx, [parent.bounding_box.x1, parent.bounding_box.y1, parent.bounding_box.x2, parent.bounding_box.y2]); }} style={btn(false)}>Select in Schedule</button>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {defs.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No component definitions)</div>}
        </div>
    );
};

const ComponentsInstances: React.FC<{ entities: any[] }> = ({ entities }) => {
    const drawings = entities.filter((e: any) => e.entity_type === 'drawing');
    const inst = entities.filter((e: any) => e.entity_type === 'component_instance');
    const grouped = inst.reduce((acc: Record<string, any[]>, e: any) => {
        const d = drawings.find((dr: any) => {
            const bb = dr.bounding_box; const ib = e.bounding_box;
            return ib.x1 >= bb.x1 && ib.y1 >= bb.y1 && ib.x2 <= bb.x2 && ib.y2 <= bb.y2 && dr.source_sheet_number === e.source_sheet_number;
        });
        const key = d ? `d:${d.id}` : `s:${e.source_sheet_number}`;
        (acc[key] ||= []).push(e);
        return acc;
    }, {} as Record<string, any[]>);
    
    // UI V2 linking state
    const linking = useUIV2Linking();
    const { addPending } = useUIV2Actions();
    const { selectEntity } = useProjectStore((s: any) => ({ selectEntity: s.selectEntity }));
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
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
                        {grouped[key].map(i => {
                            // Check if this instance is in the linking pending list
                            const isInLinkingPending = linking.active && linking.pending.some(p => p.id === i.id && p.type === 'CompInst');
                            const isLinkingSource = linking.active && linking.source?.id === i.id && linking.source?.type === 'CompInst';
                            
                            const handleClick = () => {
                                if (linking.active && linking.source?.type === 'Scope') {
                                    // In linking mode: add/remove from pending list
                                    addPending({
                                        type: 'CompInst',
                                        id: i.id,
                                        sheetId: String(i.source_sheet_number)
                                    });
                                } else {
                                    // Normal mode: open editor
                                    selectEntity(i.id);
                                }
                            };
                            
                            return (
                                <div 
                                    key={i.id} 
                                    onClick={handleClick}
                                    style={{ 
                                        padding: 6, 
                                        borderRadius: 6, 
                                        border: isInLinkingPending || isLinkingSource ? '2px solid #2563eb' : '1px solid #e1e6eb', 
                                        background: isInLinkingPending || isLinkingSource ? '#eff6ff' : '#fff',
                                        cursor: linking.active ? 'pointer' : 'default'
                                    }}
                                >
                                    <div style={{ fontSize: 12 }}>
                                        #{i.id.slice(0,6)}
                                        {isInLinkingPending && <span style={{ color: '#2563eb', marginLeft: 4 }}>✓</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {inst.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No instances yet)</div>}
        </div>
    );
};

const SpacesList: React.FC<{ concepts: any[]; onSelectSpace: (id: string | null) => void }> = ({ concepts, onSelectSpace }) => {
    const spaces = concepts.filter(c => c.kind === 'space');
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            {spaces.map(s => (
                <div key={s.id} onClick={() => onSelectSpace(s.id)} style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e6eb', background: '#fff', cursor: 'pointer', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                </div>
            ))}
            {spaces.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No spaces yet)</div>}
        </div>
    );
};

const NotesList: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { currentPageIndex, selectEntity, promoteSelectionToNotePersist, selectedBlocks } = useProjectStore((s: any) => ({ currentPageIndex: s.currentPageIndex, selectEntity: s.selectEntity, promoteSelectionToNotePersist: s.promoteSelectionToNotePersist, selectedBlocks: s.selectedBlocks }));
    const notes = entities.filter((e: any) => e.entity_type === 'note' && e.source_sheet_number === currentPageIndex + 1);
    const selectedCount = (selectedBlocks?.[currentPageIndex] || []).length;
    
    // UI V2 linking state
    const linking = useUIV2Linking();
    const { addPending } = useUIV2Actions();
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button disabled={!selectedCount} onClick={() => promoteSelectionToNotePersist(currentPageIndex)} style={btn(!selectedCount)}>Promote selection → Note</button>
                <span style={{ fontSize: 11, opacity: .7, alignSelf: 'center' }}>Selected OCR: {selectedCount}</span>
            </div>
            {notes.map(n => {
                // Check if this note is in the linking pending list
                const isInLinkingPending = linking.active && linking.pending.some(p => p.id === n.id && p.type === 'Note');
                const isLinkingSource = linking.active && linking.source?.id === n.id && linking.source?.type === 'Note';
                
                const handleClick = () => {
                    if (linking.active && linking.source?.type === 'Scope') {
                        // In linking mode: add/remove from pending list
                        addPending({
                            type: 'Note',
                            id: n.id,
                            sheetId: String(n.source_sheet_number)
                        });
                    } else {
                        // Normal mode: open editor
                        selectEntity(n.id);
                    }
                };
                
                return (
                    <div 
                        key={n.id} 
                        onClick={handleClick} 
                        style={{ 
                            padding: 8, 
                            borderRadius: 6, 
                            border: isInLinkingPending || isLinkingSource ? '2px solid #2563eb' : '1px solid #e1e6eb', 
                            background: isInLinkingPending || isLinkingSource ? '#eff6ff' : '#fff', 
                            cursor: 'pointer', 
                            marginBottom: 6 
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                            Note #{n.id.slice(0,6)}
                            {isInLinkingPending && <span style={{ color: '#2563eb', marginLeft: 4 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, opacity: .8 }}>{(n.text || '').slice(0, 140) || '(empty)'}</div>
                    </div>
                );
            })}
            {notes.length === 0 && <div style={{ fontSize: 12, opacity: .7 }}>(No notes on this sheet)</div>}
        </div>
    );
};

const LegendsList: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { selectEntity, setCurrentPageIndex, startEntityCreation } = useProjectStore((s: any) => ({
        selectEntity: s.selectEntity,
        setCurrentPageIndex: s.setCurrentPageIndex,
        startEntityCreation: s.startEntityCreation,
    }));
    const [expandedLegends, setExpandedLegends] = React.useState<Set<string>>(new Set());
    
    const legends = entities.filter((e: any) => e.entity_type === 'legend');
    const legendItems = entities.filter((e: any) => e.entity_type === 'legend_item');
    
    const toggleExpanded = (legendId: string) => {
        const newSet = new Set(expandedLegends);
        if (newSet.has(legendId)) {
            newSet.delete(legendId);
        } else {
            newSet.add(legendId);
        }
        setExpandedLegends(newSet);
    };
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', paddingLeft: 4 }}>
                    {legends.length} legend{legends.length !== 1 ? 's' : ''} • {legendItems.length} item{legendItems.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={() => startEntityCreation('legend')}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    + New Legend
                </button>
            </div>
            
            {legends.map(legend => {
                const items = legendItems.filter((item: any) => item.legend_id === legend.id);
                const isExpanded = expandedLegends.has(legend.id);
                
                return (
                    <div key={legend.id} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e1e6eb' : 'none' }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpanded(legend.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{legend.title || `Legend ${legend.id.slice(0, 6)}`}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>
                                            Sheet {legend.source_sheet_number} • {items.length} item{items.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectEntity(legend.id);
                                    }}
                                    style={btn(false)}
                                    title="Edit legend"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPageIndex(legend.source_sheet_number - 1);
                                        selectEntity(legend.id);
                                    }}
                                    style={btn(false)}
                                    title="Jump to legend"
                                >
                                    Jump
                                </button>
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div style={{ padding: '8px' }}>
                                {items.length === 0 ? (
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                        No items yet
                                    </div>
                                ) : (
                                    items.map((item: any) => (
                                        <div
                                            key={item.id}
                                            onClick={() => selectEntity(item.id)}
                                            style={{
                                                padding: 6,
                                                borderRadius: 6,
                                                border: '1px solid #e1e6eb',
                                                background: '#f9fafb',
                                                marginBottom: 6,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                                                {item.symbol_text ? `${item.symbol_text}: ` : ''}{item.description || `Item ${item.id.slice(0, 6)}`}
                                            </div>
                                            {item.notes && (
                                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                    {item.notes.slice(0, 60)}{item.notes.length > 60 ? '...' : ''}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {legends.length === 0 && (
                <div style={{ fontSize: 12, opacity: .7, paddingLeft: 4 }}>
                    (No legends yet. Click "+ New Legend" to create one on the canvas)
                </div>
            )}
        </div>
    );
};

const SchedulesList: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { selectEntity, setCurrentPageIndex, startEntityCreation } = useProjectStore((s: any) => ({
        selectEntity: s.selectEntity,
        setCurrentPageIndex: s.setCurrentPageIndex,
        startEntityCreation: s.startEntityCreation,
    }));
    const [expandedSchedules, setExpandedSchedules] = React.useState<Set<string>>(new Set());
    
    const schedules = entities.filter((e: any) => e.entity_type === 'schedule');
    const scheduleItems = entities.filter((e: any) => e.entity_type === 'schedule_item');
    
    const toggleExpanded = (scheduleId: string) => {
        const newSet = new Set(expandedSchedules);
        if (newSet.has(scheduleId)) {
            newSet.delete(scheduleId);
        } else {
            newSet.add(scheduleId);
        }
        setExpandedSchedules(newSet);
    };
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', paddingLeft: 4 }}>
                    {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} • {scheduleItems.length} item{scheduleItems.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={() => startEntityCreation('schedule')}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    + New Schedule
                </button>
            </div>
            
            {schedules.map(schedule => {
                const items = scheduleItems.filter((item: any) => item.schedule_id === schedule.id);
                const isExpanded = expandedSchedules.has(schedule.id);
                
                return (
                    <div key={schedule.id} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e1e6eb' : 'none' }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpanded(schedule.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{schedule.title || `Schedule ${schedule.id.slice(0, 6)}`}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>
                                            {schedule.schedule_type ? `${schedule.schedule_type} • ` : ''}Sheet {schedule.source_sheet_number} • {items.length} item{items.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectEntity(schedule.id);
                                    }}
                                    style={btn(false)}
                                    title="Edit schedule"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPageIndex(schedule.source_sheet_number - 1);
                                        selectEntity(schedule.id);
                                    }}
                                    style={btn(false)}
                                    title="Jump to schedule"
                                >
                                    Jump
                                </button>
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div style={{ padding: '8px' }}>
                                {items.length === 0 ? (
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                        No items yet
                                    </div>
                                ) : (
                                    items.map((item: any) => {
                                        const hasDrawing = item.drawing_id && entities.find((e: any) => e.id === item.drawing_id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => selectEntity(item.id)}
                                                style={{
                                                    padding: 6,
                                                    borderRadius: 6,
                                                    border: '1px solid #e1e6eb',
                                                    background: '#f9fafb',
                                                    marginBottom: 6,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                                                    {item.mark ? `[${item.mark}] ` : ''}{item.description || `Item ${item.id.slice(0, 6)}`}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                    {hasDrawing && '📐 '}
                                                    {item.notes && item.notes.slice(0, 60)}{item.notes && item.notes.length > 60 ? '...' : ''}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {schedules.length === 0 && (
                <div style={{ fontSize: 12, opacity: .7, paddingLeft: 4 }}>
                    (No schedules yet. Click "+ New Schedule" to create one on the canvas)
                </div>
            )}
        </div>
    );
};

const AssembliesList: React.FC<{ entities: any[] }> = ({ entities }) => {
    const { selectEntity, setCurrentPageIndex, startEntityCreation } = useProjectStore((s: any) => ({
        selectEntity: s.selectEntity,
        setCurrentPageIndex: s.setCurrentPageIndex,
        startEntityCreation: s.startEntityCreation,
    }));
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
    
    const assemblyGroups = entities.filter((e: any) => e.entity_type === 'assembly_group');
    const assemblies = entities.filter((e: any) => e.entity_type === 'assembly');
    
    const toggleExpanded = (groupId: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupId)) {
            newSet.delete(groupId);
        } else {
            newSet.add(groupId);
        }
        setExpandedGroups(newSet);
    };
    
    return (
        <div style={{ overflow: 'auto', maxHeight: '30vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', paddingLeft: 4 }}>
                    {assemblyGroups.length} group{assemblyGroups.length !== 1 ? 's' : ''} • {assemblies.length} assembl{assemblies.length !== 1 ? 'ies' : 'y'}
                </div>
                <button
                    onClick={() => startEntityCreation('assembly_group')}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    + New Assembly Group
                </button>
            </div>
            
            {assemblyGroups.map(group => {
                const items = assemblies.filter((item: any) => item.assembly_group_id === group.id);
                const isExpanded = expandedGroups.has(group.id);
                
                return (
                    <div key={group.id} style={{ border: '1px solid #e1e6eb', borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e1e6eb' : 'none' }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpanded(group.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{group.title || `Assembly Group ${group.id.slice(0, 6)}`}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>
                                            Sheet {group.source_sheet_number} • {items.length} assembl{items.length !== 1 ? 'ies' : 'y'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectEntity(group.id);
                                    }}
                                    style={btn(false)}
                                    title="Edit assembly group"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPageIndex(group.source_sheet_number - 1);
                                        selectEntity(group.id);
                                    }}
                                    style={btn(false)}
                                    title="Jump to assembly group"
                                >
                                    Jump
                                </button>
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div style={{ padding: '8px' }}>
                                {items.length === 0 ? (
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                        No assemblies yet
                                    </div>
                                ) : (
                                    items.map((item: any) => {
                                        const hasDrawing = item.drawing_id && entities.find((e: any) => e.id === item.drawing_id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => selectEntity(item.id)}
                                                style={{
                                                    padding: 6,
                                                    borderRadius: 6,
                                                    border: '1px solid #e1e6eb',
                                                    background: '#f9fafb',
                                                    marginBottom: 6,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                                                    {item.code ? `[${item.code}] ` : ''}{item.name || item.description || `Assembly ${item.id.slice(0, 6)}`}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                    {hasDrawing && '📐 '}
                                                    {item.notes && item.notes.slice(0, 60)}{item.notes && item.notes.length > 60 ? '...' : ''}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {assemblyGroups.length === 0 && (
                <div style={{ fontSize: 12, opacity: .7, paddingLeft: 4 }}>
                    (No assembly groups yet. Click "+ New Assembly Group" to create one on the canvas)
                </div>
            )}
        </div>
    );
};

function btn(active: boolean): React.CSSProperties {
    return { background: active ? '#2563eb' : '#f5f7fa', color: active ? '#fff' : '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' };
}


