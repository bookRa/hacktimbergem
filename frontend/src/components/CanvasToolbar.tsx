import React from 'react';
import { useProjectStore } from '../state/store';

export const CanvasToolbar: React.FC = () => {
    const { layers, setLayer, toggleOcr } = useProjectStore((s: any) => ({ layers: s.layers, setLayer: s.setLayer, toggleOcr: s.toggleOcr }));
    return (
        <div className="canvas-toolbar" style={{ position: 'absolute', top: 12, left: 12, zIndex: 15, background: 'rgba(32,37,43,0.9)', color: '#fff', padding: 8, borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
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


