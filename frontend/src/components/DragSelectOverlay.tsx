import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/store';
import { pdfToCanvas } from '../utils/coords';

interface Props { pageIndex: number; scale: number; }

// Drag rectangle multi-select for OCR blocks
export const DragSelectOverlay: React.FC<Props> = ({ pageIndex, scale }) => {
    const { pageOcr, pagesMeta, showOcr, ocrBlockState, setSelectedBlocks } = useProjectStore(s => ({
        pageOcr: s.pageOcr,
        pagesMeta: s.pagesMeta,
        showOcr: s.showOcr,
        ocrBlockState: (s as any).ocrBlockState || {},
        setSelectedBlocks: (s as any).setSelectedBlocks
    }));
    const meta = pagesMeta[pageIndex];
    const ocr = pageOcr[pageIndex];
    const blocks = ocr?.blocks || [];
    const [dragging, setDragging] = useState(false);
    // Work purely in displayed pixel space (already scaled) to avoid scale math drift
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const rectRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!meta || !showOcr) return;
        // Parent positioned wrapper: the element that also contains <img>/<canvas> & overlays
        const parentWrapper = containerRef.current?.parentElement; // positioned wrapper (width=displayWidth)
        if (!parentWrapper) return;

        const handleDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            // Don't start drag if user clicked a block (rect) so single-select still works
            const tag = (e.target as HTMLElement).tagName.toLowerCase();
            if (tag === 'rect') return;
            setDragging(true);
            const bounds = parentWrapper.getBoundingClientRect();
            startRef.current = { x: (e.clientX - bounds.left), y: (e.clientY - bounds.top) };
            if (rectRef.current) {
                rectRef.current.style.display = 'block';
                rectRef.current.style.left = startRef.current.x + 'px';
                rectRef.current.style.top = startRef.current.y + 'px';
                rectRef.current.style.width = '0px';
                rectRef.current.style.height = '0px';
            }
            e.preventDefault();
        };
        const handleMove = (e: MouseEvent) => {
            if (!dragging || !startRef.current) return;
            const bounds = parentWrapper.getBoundingClientRect();
            const cx = (e.clientX - bounds.left);
            const cy = (e.clientY - bounds.top);
            const x1 = Math.min(startRef.current.x, cx);
            const y1 = Math.min(startRef.current.y, cy);
            const x2 = Math.max(startRef.current.x, cx);
            const y2 = Math.max(startRef.current.y, cy);
            if (rectRef.current) {
                rectRef.current.style.left = x1 + 'px';
                rectRef.current.style.top = y1 + 'px';
                rectRef.current.style.width = (x2 - x1) + 'px';
                rectRef.current.style.height = (y2 - y1) + 'px';
            }
        };
        const handleUp = (e: MouseEvent) => {
            if (!dragging) return;
            setDragging(false);
            if (rectRef.current) rectRef.current.style.display = 'none';
            if (!startRef.current) return;
            const bounds = parentWrapper.getBoundingClientRect();
            const end = { x: (e.clientX - bounds.left), y: (e.clientY - bounds.top) };
            const rx1 = Math.min(startRef.current.x, end.x);
            const ry1 = Math.min(startRef.current.y, end.y);
            const rx2 = Math.max(startRef.current.x, end.x);
            const ry2 = Math.max(startRef.current.y, end.y);
            const width = rx2 - rx1;
            const height = ry2 - ry1;
            const additive = e.metaKey || e.ctrlKey || e.shiftKey;
            // Treat as simple click if below threshold
            if (width < 3 && height < 3) {
                // Simple click blank area: clear unless additive key pressed
                if (!additive) setSelectedBlocks(pageIndex, []);
                startRef.current = null;
                return;
            }
            // Determine which blocks intersect selection in raster coordinates
            const renderMeta = meta && ocr ? {
                pageWidthPts: ocr.width_pts,
                pageHeightPts: ocr.height_pts,
                rasterWidthPx: meta.nativeWidth,
                rasterHeightPx: meta.nativeHeight,
                rotation: 0 as 0
            } : null;
            if (!renderMeta) return;
            const hit: number[] = [];
            blocks.forEach((b: any, i: number) => {
                const [bx1, by1, bx2, by2] = b.bbox;
                const [cx1, cy1, cx2, cy2] = pdfToCanvas([bx1, by1, bx2, by2], renderMeta as any);
                // Scale block coords into displayed pixel space
                const sx1 = cx1 * scale;
                const sy1 = cy1 * scale;
                const sx2 = cx2 * scale;
                const sy2 = cy2 * scale;
                if (sx2 < rx1 || sx1 > rx2 || sy2 < ry1 || sy1 > ry2) return;
                hit.push(i);
            });
            if (hit.length) setSelectedBlocks(pageIndex, hit, additive);
            startRef.current = null;
        };
        parentWrapper.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            parentWrapper.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [meta, showOcr, scale, blocks, pageIndex, setSelectedBlocks, ocr]);

    if (!showOcr || !meta) return null;

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div ref={rectRef} style={{ position: 'absolute', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.15)', display: 'none', zIndex: 10 }} />
        </div>
    );
};
