import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/store';
import { pdfToCanvas } from '../utils/coords';

interface Props { pageIndex: number; scale: number; wrapperRef?: React.RefObject<HTMLDivElement>; }

// Toggleable verbose logging (can be turned on via window.__TG_DEBUG_DRAG = true in console)
declare global { interface Window { __TG_DEBUG_DRAG?: boolean } }
const log = (...args: any[]) => { if (window.__TG_DEBUG_DRAG) console.log('[DragSelect]', ...args); };

export const DragSelectOverlay: React.FC<Props> = ({ pageIndex, scale, wrapperRef }) => {
    const { pageOcr, pagesMeta, showOcr, setSelectedBlocks } = useProjectStore(s => ({
        pageOcr: s.pageOcr,
        pagesMeta: s.pagesMeta,
        showOcr: s.showOcr,
        setSelectedBlocks: (s as any).setSelectedBlocks
    }));
    const meta = pagesMeta[pageIndex];
    const ocr = pageOcr[pageIndex];
    const blocks = ocr?.blocks || [];
    const [dragging, setDragging] = useState(false); // UI flag only
    const draggingRef = useRef(false);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const rectRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Live refs to avoid stale closure after zoom / data updates
    const scaleRef = useRef(scale); if (scaleRef.current !== scale) { log('scale change', { prev: scaleRef.current, next: scale }); }
    scaleRef.current = scale;
    const blocksRef = useRef(blocks); blocksRef.current = blocks;
    const metaRef = useRef(meta); metaRef.current = meta;
    const ocrRef = useRef(ocr); ocrRef.current = ocr;

    useEffect(() => {
        if (!meta || !showOcr) return;
        const target = wrapperRef?.current || containerRef.current?.parentElement;
        if (!target) return;

        const handleDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const tag = (e.target as HTMLElement).tagName.toLowerCase();
            if (tag === 'rect') return; // allow single block click
            const bounds = target.getBoundingClientRect();
            startRef.current = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
            log('mousedown start', { start: startRef.current, scale: scaleRef.current, bounds: { left: bounds.left, top: bounds.top, w: bounds.width, h: bounds.height } });
            draggingRef.current = true;
            setDragging(true);
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
            if (!startRef.current) return;
            if (!draggingRef.current) {
                if (window.__TG_DEBUG_DRAG) console.log('[DragSelect] move ignored (draggingRef false)', { start: startRef.current });
                return;
            }
            const bounds = target.getBoundingClientRect();
            const cx = e.clientX - bounds.left;
            const cy = e.clientY - bounds.top;
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
            log('mousemove drag', { current: { cx, cy }, rect: { x1, y1, x2, y2 }, scale: scaleRef.current });
        };
        const handleUp = (e: MouseEvent) => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            setDragging(false);
            if (rectRef.current) rectRef.current.style.display = 'none';
            if (!startRef.current) return;
            const bounds = target.getBoundingClientRect();
            const endX = e.clientX - bounds.left;
            const endY = e.clientY - bounds.top;
            const rx1 = Math.min(startRef.current.x, endX);
            const ry1 = Math.min(startRef.current.y, endY);
            const rx2 = Math.max(startRef.current.x, endX);
            const ry2 = Math.max(startRef.current.y, endY);
            const width = rx2 - rx1;
            const height = ry2 - ry1;
            const additive = e.metaKey || e.ctrlKey || e.shiftKey;
            if (width < 3 && height < 3) {
                log('mouseup click-clear', { width, height, additive });
                if (!additive) setSelectedBlocks(pageIndex, []);
                startRef.current = null;
                return;
            }
            const m = metaRef.current;
            const o = ocrRef.current;
            const sc = scaleRef.current;
            if (!m || !o) { startRef.current = null; return; }
            const renderMeta = {
                pageWidthPts: o.width_pts,
                pageHeightPts: o.height_pts,
                rasterWidthPx: m.nativeWidth,
                rasterHeightPx: m.nativeHeight,
                rotation: 0 as 0
            };
            const hit: number[] = [];
            blocksRef.current.forEach((b: any, i: number) => {
                const [bx1, by1, bx2, by2] = b.bbox;
                const [cx1, cy1, cx2, cy2] = pdfToCanvas([bx1, by1, bx2, by2], renderMeta as any);
                const sx1 = cx1 * sc;
                const sy1 = cy1 * sc;
                const sx2 = cx2 * sc;
                const sy2 = cy2 * sc;
                if (sx2 < rx1 || sx1 > rx2 || sy2 < ry1 || sy1 > ry2) return;
                hit.push(i);
            });
            log('mouseup selection', { dragRect: { rx1, ry1, rx2, ry2, width, height }, hits: hit, additive, scale: sc });
            if (hit.length) {
                setSelectedBlocks(pageIndex, hit, additive);
            } else if (!additive) {
                // If no hits and not additive, clear selection (dragging empty area)
                setSelectedBlocks(pageIndex, []);
            }
            startRef.current = null;
        };
        target.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            target.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [meta, showOcr, pageIndex, setSelectedBlocks, wrapperRef, scale]);

    // Cancel any in-progress drag when scale changes mid-drag
    useEffect(() => {
    if (!draggingRef.current) return;
    log('scale changed during drag -> cancel');
    draggingRef.current = false;
    setDragging(false);
        if (rectRef.current) rectRef.current.style.display = 'none';
        startRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale]);

    if (!showOcr || !meta) return null;

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div ref={rectRef} style={{ position: 'absolute', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.15)', display: 'none', zIndex: 10 }} />
        </div>
    );
};
