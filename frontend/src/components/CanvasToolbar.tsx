import React from 'react';
import { useProjectStore } from '../state/store';

export const CanvasToolbar: React.FC = () => {
    const { layers, setLayer, toggleOcr, undo, redo } = useProjectStore((s: any) => ({ layers: s.layers, setLayer: s.setLayer, toggleOcr: s.toggleOcr, undo: s.undo, redo: s.redo }));
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
            if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); redo(); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);
    return (
        <div className="canvas-toolbar" style={{ position: 'absolute', top: 12, left: 12, zIndex: 15, background: 'rgba(32,37,43,0.9)', color: '#fff', padding: 8, borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => undo()} title="Undo (⌘/Ctrl+Z)" style={{ background: '#f5f7fa', color: '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>Undo</button>
            <button onClick={() => redo()} title="Redo (⇧⌘/Ctrl+Y|Z)" style={{ background: '#f5f7fa', color: '#111', border: '1px solid #e1e6eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>Redo</button>
            <Toggle label="OCR" checked={layers.ocr} onChange={(v) => { setLayer('ocr', v); toggleOcr(); }} />
            <Toggle label="Symbols" checked={layers.symbols} onChange={(v) => setLayer('symbols', v)} />
            <Toggle label="Components" checked={layers.components} onChange={(v) => setLayer('components', v)} />
            <Toggle label="Notes" checked={layers.notes} onChange={(v) => setLayer('notes', v)} />
            <Toggle label="Scopes" checked={layers.scopes} onChange={(v) => setLayer('scopes', v)} />
        </div>
    );
};

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
    </label>
);


