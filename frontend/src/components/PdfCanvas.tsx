import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const TARGET_DPI = 300;
const PDF_POINT_DPI = 72;
const RASTER_SCALE = TARGET_DPI / PDF_POINT_DPI; // ~4.1667

export const PdfCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const resizeObsRef = useRef<ResizeObserver | null>(null);

    const { pdfDoc, currentPageIndex, pages, setPageMeta, pagesMeta, effectiveScale, updateFitScale, zoom } = useProjectStore((s: ProjectStore) => ({
        pdfDoc: s.pdfDoc,
        currentPageIndex: s.currentPageIndex,
        pages: s.pages,
        setPageMeta: s.setPageMeta,
        pagesMeta: s.pagesMeta,
        effectiveScale: s.effectiveScale,
        updateFitScale: s.updateFitScale,
        zoom: s.zoom
    }));

    // Render page and compute fit scale
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!pdfDoc) return;
            const pageNumber = currentPageIndex + 1;
            const page = await pdfDoc.getPage(pageNumber);
            if (cancelled) return;
            const viewport = page.getViewport({ scale: RASTER_SCALE });
            const canvas = canvasRef.current;
            const holder = containerRef.current;
            if (!canvas || !holder) return;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            // Compute fit scale immediately using holder size
            const style = getComputedStyle(holder);
            const padL = parseFloat(style.paddingLeft) || 0;
            const padR = parseFloat(style.paddingRight) || 0;
            const padT = parseFloat(style.paddingTop) || 0;
            const padB = parseFloat(style.paddingBottom) || 0;
            const availableW = holder.clientWidth - padL - padR - 4;
            const availableH = holder.clientHeight - padT - padB - 4;
            let fitScale = 1;
            if (availableW > 0 && availableH > 0) {
                fitScale = Math.min(availableW / canvas.width, availableH / canvas.height);
            }
            setPageMeta({
                pageNumber: currentPageIndex,
                nativeWidth: canvas.width,
                nativeHeight: canvas.height,
                fitPageScale: fitScale
            });
            if (zoom.mode === 'fit') updateFitScale(currentPageIndex, fitScale);
            await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, currentPageIndex, zoom.mode]);

    // Recompute when switching into fit mode (ensures correct scale after manual panning/resize)
    useEffect(() => {
        if (zoom.mode === 'fit') {
            recomputeFitScale();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom.mode]);

    // Resize observer to recompute fit width scale
    useLayoutEffect(() => {
        if (!containerRef.current) return;
        resizeObsRef.current = new ResizeObserver(() => {
            recomputeFitScale();
        });
        resizeObsRef.current.observe(containerRef.current);
        return () => resizeObsRefRefCleanup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPageIndex]);

    function resizeObsRefRefCleanup() {
        resizeObsRef.current?.disconnect();
    }

    const recomputeFitScale = () => {
        const meta = pagesMeta[currentPageIndex];
        if (!meta) return;
        const holder = containerRef.current;
        if (!holder) return;
        const style = getComputedStyle(holder);
        const padL = parseFloat(style.paddingLeft) || 0;
        const padR = parseFloat(style.paddingRight) || 0;
        const padT = parseFloat(style.paddingTop) || 0;
        const padB = parseFloat(style.paddingBottom) || 0;
        const availableW = holder.clientWidth - padL - padR - 4;
        const availableH = holder.clientHeight - padT - padB - 4;
        if (availableW <= 0 || availableH <= 0) return;
        const widthScale = availableW / meta.nativeWidth;
        const heightScale = availableH / meta.nativeHeight;
        const fitScale = Math.min(widthScale, heightScale);
        // Only update if different or unset
        updateFitScale(currentPageIndex, fitScale);
    };

    const meta = pagesMeta[currentPageIndex];
    const rawScale = meta ? effectiveScale(currentPageIndex) : 1;
    const scale = Math.max(0.01, rawScale);
    const displayWidth = meta ? meta.nativeWidth * scale : 0;
    const displayHeight = meta ? meta.nativeHeight * scale : 0;

    if (!pdfDoc) return null;

    return (
        <div ref={containerRef} className="pdf-canvas-wrapper" style={{ padding: '8px' }}>
            <div style={{ margin: '0 auto', position: 'relative', width: displayWidth, height: displayHeight }}>
                <canvas ref={canvasRef} className="pdf-canvas" style={{ width: displayWidth, height: displayHeight, background: '#fff', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            </div>
        </div>
    );
};
