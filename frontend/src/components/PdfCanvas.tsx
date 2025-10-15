import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { OcrOverlay } from './OcrOverlay';
import { DragSelectOverlay } from './DragSelectOverlay';
import { OverlayLayer } from '../ui_v2/OverlayLayer';
import { ZoomControls } from './ZoomControls';
import { useUIV2OCRSelection } from '../state/ui_v2';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const TARGET_DPI = 300;
const PDF_POINT_DPI = 72;
const RASTER_SCALE = TARGET_DPI / PDF_POINT_DPI; // ~4.1667

export const PdfCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pageWrapperRef = useRef<HTMLDivElement | null>(null);
    const resizeObsRef = useRef<ResizeObserver | null>(null);
    const renderTaskRef = useRef<any>(null);
    const zoomOverlayRef = useRef<HTMLDivElement | null>(null);

    const { pdfDoc, currentPageIndex, pages, setPageMeta, pagesMeta, effectiveScale, updateFitScale, zoom, setManualScale, setZoomMode, pageImages, fetchPageImage, pageOcr, fetchPageOcr, showOcr, scrollTarget, setScrollTarget, clearScrollTarget, creatingEntity, manifestStatus, focusBBoxPts, clearFocusBBox } = useProjectStore((s: ProjectStore & any) => ({
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
        creatingEntity: s.creatingEntity,
        manifestStatus: s.manifestStatus,
        focusBBoxPts: (s as any).focusBBoxPts,
        clearFocusBBox: (s as any).clearFocusBBox,
    }));
    
    const ocrSelectionMode = useUIV2OCRSelection();

    // Render page and compute fit scale (only if backend image not yet present)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!pdfDoc) return;
            const pageNumber = currentPageIndex + 1;
            const page = await pdfDoc.getPage(pageNumber);
            if (cancelled) return;
            const viewport = page.getViewport({ scale: RASTER_SCALE });
            const holder = containerRef.current;
            if (!holder) return;
            const nativeWidth = Math.floor(viewport.width);
            const nativeHeight = Math.floor(viewport.height);
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
                fitScale = Math.min(availableW / nativeWidth, availableH / nativeHeight);
            }
            // pageWidthPts/pageHeightPts are PDF-space dimensions (points). Since
            // viewport was created with scale=RASTER_SCALE (300/72), dividing by
            // RASTER_SCALE yields original PDF width/height in points.
            setPageMeta({
                pageNumber: currentPageIndex,
                nativeWidth,
                nativeHeight,
                fitPageScale: fitScale,
                pageWidthPts: viewport.width / RASTER_SCALE,
                pageHeightPts: viewport.height / RASTER_SCALE
            });
            if (zoom.mode === 'fit') updateFitScale(currentPageIndex, fitScale);
            // Cancel any in-flight render before starting a new one
            if (renderTaskRef.current && typeof renderTaskRef.current.cancel === 'function') {
                try { renderTaskRef.current.cancel(); } catch {}
                renderTaskRef.current = null;
            }
            // Only render via pdf.js if no backend raster yet
            if (!pageImages[currentPageIndex]) {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return;
                canvas.width = nativeWidth;
                canvas.height = nativeHeight;
                const task = page.render({ canvasContext: ctx, viewport, intent: 'print' });
                renderTaskRef.current = task;
                try {
                    await task.promise;
                } catch (_) {
                    // ignore cancellations
                } finally {
                    if (renderTaskRef.current === task) renderTaskRef.current = null;
                }
            }
        })();
        return () => {
            cancelled = true;
            if (renderTaskRef.current && typeof renderTaskRef.current.cancel === 'function') {
                try { renderTaskRef.current.cancel(); } catch {}
                renderTaskRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, currentPageIndex]);

    // Fetch backend image and OCR lazily when we have a projectId (OCR fetch is required for coordinate transforms)
    useEffect(() => {
        // Avoid double fetch if already cached
        if (!pageImages[currentPageIndex]) fetchPageImage(currentPageIndex);
        if (!pageOcr[currentPageIndex]) fetchPageOcr(currentPageIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPageIndex]);

    // Recompute when switching into fit mode or when wrapper resizes
    useEffect(() => {
        if (zoom.mode === 'fit') recomputeFitScale();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom.mode, currentPageIndex]);

    // When entering Fit mode, immediately center the page within the viewport (no animated scroll)
    useEffect(() => {
        if (zoom.mode !== 'fit') return;
        const holder = containerRef.current;
        const meta = pagesMeta[currentPageIndex];
        if (!holder || !meta) return;
        const scaleFit = meta.fitPageScale || effectiveScale(currentPageIndex);
        const contentW = meta.nativeWidth * scaleFit;
        const contentH = meta.nativeHeight * scaleFit;
        const targetLeft = Math.max(0, (contentW - holder.clientWidth) / 2);
        const targetTop = Math.max(0, (contentH - holder.clientHeight) / 2);
        holder.scrollTo({ left: targetLeft, top: targetTop, behavior: 'auto' });
    }, [zoom.mode, currentPageIndex, pagesMeta, effectiveScale]);

    // Resize observer to recompute fit width scale (debounced)
    useLayoutEffect(() => {
        if (!containerRef.current) return;
        let frame: number | null = null;
        resizeObsRef.current = new ResizeObserver(() => {
            if (frame != null) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                recomputeFitScale();
                frame = null;
            });
        });
        resizeObsRef.current.observe(containerRef.current);
        return () => { if (frame != null) cancelAnimationFrame(frame); resizeObsRefRefCleanup(); };
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

    // Focus to an arbitrary bbox (PDF pts) when requested
    useEffect(() => {
        if (!focusBBoxPts) return;
        const { pageIndex, bboxPts } = focusBBoxPts as any;
        if (pageIndex !== currentPageIndex) return;
        const ocr = pageOcr[currentPageIndex];
        if (!ocr || !containerRef.current || !meta) return;
        const [x1, y1, x2, y2] = bboxPts as [number, number, number, number];
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const desiredW = (x2 - x1);
        const desiredH = (y2 - y1);
        // If bbox is tiny, gently zoom in for visibility
        const minViewPx = 160; // target minimum size on screen
        const neededScaleX = (minViewPx / Math.max(1, desiredW)) / (meta.nativeWidth / ocr.width_pts);
        const neededScaleY = (minViewPx / Math.max(1, desiredH)) / (meta.nativeHeight / ocr.height_pts);
        const neededScale = Math.min(4, Math.max(scale, Math.min(neededScaleX, neededScaleY)));
        if (neededScale > scale) {
            setZoomMode('manual');
            setManualScale(neededScale);
        }
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const maxLeft = meta.nativeWidth * neededScale - containerRef.current.clientWidth;
            const maxTop = meta.nativeHeight * neededScale - containerRef.current.clientHeight;
            const targetScrollLeft = Math.max(0, Math.min(maxLeft, centerX * neededScale - containerRef.current.clientWidth / 2));
            const targetScrollTop = Math.max(0, Math.min(maxTop, centerY * neededScale - containerRef.current.clientHeight / 2));
            containerRef.current.scrollTo({ left: targetScrollLeft, top: targetScrollTop, behavior: 'auto' });
        });
        // Clear focus after applying
        setTimeout(() => { (clearFocusBBox as any)(); }, 150);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusBBoxPts, scale]);

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

    // Keep zoom pill centered at bottom of visible viewport (accounts for both axes scroll)
    useEffect(() => {
        const holder = containerRef.current;
        const overlay = zoomOverlayRef.current;
        if (!holder || !overlay) return;
        const update = () => {
            const centerX = holder.scrollLeft + holder.clientWidth / 2;
            const margin = 24; // keep above horizontal scrollbar and content
            const pillH = overlay.offsetHeight || 0;
            const topY = holder.scrollTop + holder.clientHeight - pillH - margin;
            overlay.style.left = `${centerX}px`;
            overlay.style.top = `${topY}px`;
        };
        update();
        const onScroll = () => requestAnimationFrame(update);
        holder.addEventListener('scroll', onScroll);
        const ro = new ResizeObserver(() => requestAnimationFrame(update));
        ro.observe(holder);
        return () => { holder.removeEventListener('scroll', onScroll); ro.disconnect(); };
    }, [currentPageIndex]);

    if (!pdfDoc) return null;

    return (
        <div ref={containerRef} className="pdf-canvas-wrapper" style={{ padding: '8px', position: 'relative' }}>
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
                            {!creatingEntity && !ocrSelectionMode.active && <DragSelectOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />}
                        </>}
                        {/* Legacy overlay retained for fallback; UI V2 overlay mounted below */}
                        {/* <EntitiesOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} /> */}
                        <OverlayLayer pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />
                    </>
                ) : (
                    <>
                        <canvas ref={canvasRef} className="pdf-canvas" style={{ width: displayWidth, height: displayHeight, background: '#fff', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }} />
                        {showOcr && <>
                            <OcrOverlay pageIndex={currentPageIndex} scale={scale} />
                            {!creatingEntity && !ocrSelectionMode.active && <DragSelectOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />}
                        </>}
                        {/* Legacy overlay retained for fallback; UI V2 overlay mounted below */}
                        {/* <EntitiesOverlay pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} /> */}
                        <OverlayLayer pageIndex={currentPageIndex} scale={scale} wrapperRef={pageWrapperRef} />
                    </>
                )}
            </div>
            {/* Bottom-centered zoom pill pinned inside the scroll viewport */}
            {/* Bottom-center zoom pill: absolute overlay updated on scroll to stay centered in viewport */}
            <div ref={zoomOverlayRef} style={{ position: 'absolute', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <ZoomControls />
                </div>
            </div>
        </div>
    );
};
