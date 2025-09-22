import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { OcrOverlay } from './OcrOverlay';
import { DragSelectOverlay } from './DragSelectOverlay';
import { EntitiesOverlay } from './EntitiesOverlay';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const TARGET_DPI = 300;
const PDF_POINT_DPI = 72;
const RASTER_SCALE = TARGET_DPI / PDF_POINT_DPI; // ~4.1667

export const PdfCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pageWrapperRef = useRef<HTMLDivElement | null>(null);
    const resizeObsRef = useRef<ResizeObserver | null>(null);

    const { pdfDoc, currentPageIndex, pages, setPageMeta, pagesMeta, effectiveScale, updateFitScale, zoom, setManualScale, setZoomMode, pageImages, fetchPageImage, pageOcr, fetchPageOcr, showOcr, scrollTarget, setScrollTarget, clearScrollTarget, creatingEntity } = useProjectStore((s: ProjectStore & any) => ({
        pdfDoc: s.pdfDoc,
        currentPageIndex: s.currentPageIndex,
        pages: s.pages,
        setPageMeta: s.setPageMeta,
        pagesMeta: s.pagesMeta,
        effectiveScale: s.effectiveScale,
        updateFitScale: s.updateFitScale,
        zoom: s.zoom,
        setManualScale: s.setManualScale,
        setZoomMode: s.setZoomMode,
        pageImages: s.pageImages,
        fetchPageImage: s.fetchPageImage,
        pageOcr: s.pageOcr,
        fetchPageOcr: s.fetchPageOcr,
        showOcr: s.showOcr,
        scrollTarget: s.scrollTarget,
        setScrollTarget: s.setScrollTarget,
        clearScrollTarget: s.clearScrollTarget,
        creatingEntity: s.creatingEntity
    }));

    // Render page and compute fit scale (only if backend image not yet present)
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
            // pageWidthPts/pageHeightPts are PDF-space dimensions (points). Since
            // viewport was created with scale=RASTER_SCALE (300/72), dividing by
            // RASTER_SCALE yields original PDF width/height in points.
            setPageMeta({
                pageNumber: currentPageIndex,
                nativeWidth: canvas.width,
                nativeHeight: canvas.height,
                fitPageScale: fitScale,
                pageWidthPts: viewport.width / RASTER_SCALE,
                pageHeightPts: viewport.height / RASTER_SCALE
            });
            if (zoom.mode === 'fit') updateFitScale(currentPageIndex, fitScale);
            // Only render via pdf.js if no backend raster yet
            if (!pageImages[currentPageIndex]) {
                await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, currentPageIndex, zoom.mode, pageImages]);

    // Fetch backend image and OCR lazily when we have a projectId (OCR fetch is required for coordinate transforms)
    useEffect(() => {
        fetchPageImage(currentPageIndex);
        fetchPageOcr(currentPageIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPageIndex]);

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

    // Scroll to target block center when requested
    useEffect(() => {
        if (!scrollTarget) return;
        if (scrollTarget.pageIndex !== currentPageIndex) return;
        const ocr = pageOcr[currentPageIndex];
        if (!ocr) return;
        const blocks = ocr.blocks || [];
        const b = blocks[scrollTarget.blockIndex];
        if (!b) { clearScrollTarget(); return; }
        const [x1, y1, x2, y2] = b.bbox;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        if (!containerRef.current || !meta) { clearScrollTarget(); return; }
        const maxLeft = meta.nativeWidth * scale - containerRef.current.clientWidth;
        const maxTop = meta.nativeHeight * scale - containerRef.current.clientHeight;
        const targetScrollLeft = Math.max(0, Math.min(maxLeft, centerX * scale - containerRef.current.clientWidth / 2));
        const targetScrollTop = Math.max(0, Math.min(maxTop, centerY * scale - containerRef.current.clientHeight / 2));
        containerRef.current.scrollTo({ left: targetScrollLeft, top: targetScrollTop, behavior: 'smooth' });
        // Clear entirely after first use
        setTimeout(() => { clearScrollTarget(); }, 50);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollTarget, scale]);

    // Pointer-centered zoom utility
    const applyPointerZoom = (deltaFactor: number, clientX: number, clientY: number) => {
        if (!meta || !containerRef.current) return;
        // Switch to manual if currently fit so user adjusts freely
        if (zoom.mode === 'fit') setZoomMode('manual');
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const offsetX = clientX - rect.left + container.scrollLeft - 8; // subtract padding
        const offsetY = clientY - rect.top + container.scrollTop - 8;
        const preScale = scale;
        const nextScale = Math.min(4, Math.max(0.05, preScale * deltaFactor));
        if (Math.abs(nextScale - preScale) < 0.0001) return;
        // Maintain pointer anchor: compute new scroll so that (offset / preScale) == (newOffset / nextScale)
        const normX = offsetX / preScale;
        const normY = offsetY / preScale;
        setManualScale(nextScale);
        requestAnimationFrame(() => {
            const newOffsetX = normX * nextScale;
            const newOffsetY = normY * nextScale;
            const dx = newOffsetX - offsetX;
            const dy = newOffsetY - offsetY;
            container.scrollLeft += dx;
            container.scrollTop += dy;
        });
    };

    // Wheel & pinch handlers
    useEffect(() => {
        const holder = containerRef.current;
        if (!holder) return;

        const handleWheel = (e: WheelEvent) => {
            // Zoom only if ctrl (Windows) or meta (macOS) pressed.
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const direction = e.deltaY > 0 ? -1 : 1;
                const factor = direction > 0 ? 1.1 : 1 / 1.1;
                applyPointerZoom(factor, e.clientX, e.clientY);
                return;
            }
            // Shift+wheel should become horizontal scroll; let browser handle vertical->horizontal mapping except enforce horizontal manually if needed.
            if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
                // If browser already translates to horizontal (deltaX !=0) do nothing special; else manually scroll.
                if (e.deltaX === 0 && e.deltaY !== 0 && containerRef.current) {
                    containerRef.current.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
                return;
            }
            // Otherwise (no modifier) let normal vertical scroll pass through.
        };

        // Basic two-pointer pinch using pointer events
        let pointers: Map<number, PointerEvent> = new Map();
        let initialDist = 0;
        let initialScale = scale;

        const calcDist = () => {
            if (pointers.size !== 2) return 0;
            const pts = Array.from(pointers.values());
            const dx = pts[0].clientX - pts[1].clientX;
            const dy = pts[0].clientY - pts[1].clientY;
            return Math.hypot(dx, dy);
        };

        const onPointerDown = (e: PointerEvent) => {
            pointers.set(e.pointerId, e);
            if (pointers.size === 2) {
                initialDist = calcDist();
                initialScale = scale;
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, e);
            if (pointers.size === 2 && initialDist > 0) {
                const dist = calcDist();
                if (dist > 0) {
                    const ratio = dist / initialDist;
                    const desired = Math.min(4, Math.max(0.05, initialScale * ratio));
                    const pts = Array.from(pointers.values());
                    const centerX = (pts[0].clientX + pts[1].clientX) / 2;
                    const centerY = (pts[0].clientY + pts[1].clientY) / 2;
                    applyPointerZoom(desired / scale, centerX, centerY);
                }
            }
        };
        const onPointerUp = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            if (pointers.size < 2) {
                initialDist = 0;
            }
        };

        holder.addEventListener('wheel', handleWheel, { passive: false });
        holder.addEventListener('pointerdown', onPointerDown);
        holder.addEventListener('pointermove', onPointerMove);
        holder.addEventListener('pointerup', onPointerUp);
        holder.addEventListener('pointercancel', onPointerUp);
        holder.addEventListener('pointerleave', onPointerUp);

        return () => {
            holder.removeEventListener('wheel', handleWheel);
            holder.removeEventListener('pointerdown', onPointerDown);
            holder.removeEventListener('pointermove', onPointerMove);
            holder.removeEventListener('pointerup', onPointerUp);
            holder.removeEventListener('pointercancel', onPointerUp);
            holder.removeEventListener('pointerleave', onPointerUp);
        };
    }, [applyPointerZoom, scale, zoom.mode]);

    if (!pdfDoc) return null;

    return (
        <div ref={containerRef} className="pdf-canvas-wrapper" style={{ padding: '8px' }}>
            <div ref={pageWrapperRef} style={{ margin: '0 auto', position: 'relative', width: displayWidth, height: displayHeight }}>
                {pageImages[currentPageIndex] ? (
                    <>
                        <img
                            src={pageImages[currentPageIndex]}
                            alt={`Page ${currentPageIndex + 1}`}
                            style={{ width: displayWidth, height: displayHeight, display: 'block', background: '#fff', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }}
                            draggable={false}
                        />
                        {showOcr && <>
                            <OcrOverlay pageIndex={currentPageIndex} scale={scale} />
                            {!creatingEntity && <DragSelectOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />}
                        </>}
                        <EntitiesOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />
                    </>
                ) : (
                    <>
                        <canvas ref={canvasRef} className="pdf-canvas" style={{ width: displayWidth, height: displayHeight, background: '#fff', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }} />
                        {showOcr && <>
                            <OcrOverlay pageIndex={currentPageIndex} scale={scale} />
                            {!creatingEntity && <DragSelectOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />}
                        </>}
                        <EntitiesOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />
                    </>
                )}
            </div>
        </div>
    );
};
