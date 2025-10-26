import React from 'react';
import { useProjectStore } from '../state/store';

export const CanvasToolbar: React.FC = () => {
    const { layers, setLayer, undo, redo, creatingEntity, cancelEntityCreation } = useProjectStore((s: any) => ({ 
        layers: s.layers, 
        setLayer: s.setLayer, 
        undo: s.undo, 
        redo: s.redo,
        creatingEntity: s.creatingEntity,
        cancelEntityCreation: s.cancelEntityCreation,
    }));
    
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
            if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); redo(); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);
    
    // Get human-readable label for entity type being created
    const getCreatingLabel = () => {
        if (!creatingEntity) return null;
        const labels: Record<string, string> = {
            'drawing': 'Drawing',
            'legend': 'Legend',
            'schedule': 'Schedule',
            'note': 'Note',
            'scope': 'Scope',
            'symbol_definition': 'Symbol Definition',
            'component_definition': 'Component Definition',
            'symbol_instance': 'Symbol Instance',
            'component_instance': 'Component Instance',
            'assembly_group': 'Assembly Group',
        };
        return labels[creatingEntity.type] || creatingEntity.type;
    };
    
    const creatingLabel = getCreatingLabel();
    
    return (
        <>
            <div className="canvas-toolbar" style={{ position: 'absolute', top: 12, left: 12, zIndex: 15, background: 'rgba(32,37,43,0.9)', color: '#fff', padding: 8, borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => undo()} title="Undo (⌘/Ctrl+Z)" style={{ background: '#f5f7fa', color: '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>Undo</button>
                <button onClick={() => redo()} title="Redo (⇧⌘/Ctrl+Y|Z)" style={{ background: '#f5f7fa', color: '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>Redo</button>
                <Toggle label="OCR" checked={layers.ocr} onChange={(v) => setLayer('ocr', v)} />
                <Toggle label="Drawings" checked={layers.drawings} onChange={(v) => setLayer('drawings', v)} />
                <Toggle label="Legends" checked={layers.legends} onChange={(v) => setLayer('legends', v)} />
                <Toggle label="Schedules" checked={layers.schedules} onChange={(v) => setLayer('schedules', v)} />
                <Toggle label="Assemblies" checked={layers.assemblyGroups} onChange={(v) => setLayer('assemblyGroups', v)} />
                <Toggle label="Symbols" checked={layers.symbols} onChange={(v) => setLayer('symbols', v)} />
                <Toggle label="Components" checked={layers.components} onChange={(v) => setLayer('components', v)} />
                <Toggle label="Notes" checked={layers.notes} onChange={(v) => setLayer('notes', v)} />
                <Toggle label="Scopes" checked={layers.scopes} onChange={(v) => setLayer('scopes', v)} />
            </div>
            
            {/* Drawing Mode Indicator */}
            {creatingLabel && (
                <div 
                    className="drawing-mode-indicator" 
                    style={{ 
                        position: 'absolute', 
                        top: 12, 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        zIndex: 15, 
                        background: '#2563eb', 
                        color: '#fff', 
                        padding: '10px 16px', 
                        borderRadius: 8, 
                        display: 'flex', 
                        gap: 12, 
                        alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        fontWeight: 500,
                        fontSize: 14,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h12v12H2V2zm1 1v10h10V3H3z"/>
                            <path d="M5 5h6v6H5V5z" opacity="0.5"/>
                        </svg>
                        <span>Drawing: <strong>{creatingLabel}</strong></span>
                    </div>
                    <button 
                        onClick={() => cancelEntityCreation()} 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.2)', 
                            color: '#fff', 
                            border: '1px solid rgba(255, 255, 255, 0.3)', 
                            borderRadius: 6, 
                            padding: '4px 12px', 
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                        title="Cancel drawing mode"
                    >
                        Cancel (Esc)
                    </button>
                </div>
            )}
        </>
    );
};

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
    </label>
);


