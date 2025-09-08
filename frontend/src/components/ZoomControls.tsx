import React, { useCallback } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const ZoomControls: React.FC = () => {
    const { currentPageIndex, zoom, setZoomMode, setManualScale, effectiveScale, pagesMeta } = useProjectStore((s: ProjectStore) => ({
        currentPageIndex: s.currentPageIndex,
        zoom: s.zoom,
        setZoomMode: s.setZoomMode,
        setManualScale: s.setManualScale,
        effectiveScale: s.effectiveScale,
        pagesMeta: s.pagesMeta
    }));

    const scale = effectiveScale(currentPageIndex);
    const pctRaw = Math.round(scale * 100);
    const pct = pctRaw <= 0 ? 100 : pctRaw; // fallback to 100 if not yet computed
    const meta = pagesMeta[currentPageIndex];

    const step = useCallback((dir: 1 | -1) => {
        const base = zoom.mode === 'manual' ? zoom.manualScale : scale;
        const next = dir === 1 ? base * 1.1 : base / 1.1;
        setManualScale(next);
    }, [zoom.mode, zoom.manualScale, scale, setManualScale]);

    const isFit = zoom.mode === 'fit';

    const goFit = () => {
        setZoomMode('fit');
    };
    const goActualSize = () => {
        setManualScale(1);
    };

    return (
        <div className="zoom-controls" role="group" aria-label="Zoom Controls">
            <button onClick={() => step(-1)} title="Zoom Out" aria-label="Zoom Out">−</button>
            <span className="zoom-display" title={isFit ? 'Fit Page (auto)' : 'Manual Zoom'}>
                {`${pct}%`}{isFit ? ' (Fit)' : ''}
            </span>
            <button onClick={() => step(1)} title="Zoom In" aria-label="Zoom In">+</button>
            <button onClick={goFit} className={isFit ? 'active' : ''} title="Fit Page" aria-label="Fit Page">Fit</button>
            <button onClick={goActualSize} className={!isFit && Math.abs(scale - 1) < 0.0001 ? 'active' : ''} title="Actual Size (100%)" aria-label="Actual Size">100%</button>
        </div>
    );
};