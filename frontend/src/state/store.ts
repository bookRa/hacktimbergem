import { create } from 'zustand';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';

// Page raster meta at 300 DPI baseline
export interface PageRenderMeta {
    pageNumber: number;
    nativeWidth: number;   // 300 DPI raster width (px)
    nativeHeight: number;  // 300 DPI raster height (px)
    fitPageScale: number;  // computed to fit entire page (width & height)
}

export interface ZoomState {
    mode: 'fit' | 'manual';
    manualScale: number;      // current manual scale (1 = 100%)
    lastManualScale: number;  // remembered when toggling fit
}

interface AppState {
    pdfDoc: PDFDocumentProxy | null;
    pages: number[];              // zero-based page indexes convenience
    currentPageIndex: number;     // zero-based
    pagesMeta: Record<number, PageRenderMeta>; // keyed by zero-based index
    // Backend imagery & OCR
    pageImages: Record<number, string>; // object URL of backend PNG per page index
    pageOcr: Record<number, any>; // simplified OCR JSON per page index
    showOcr: boolean; // overlay toggle
    zoom: ZoomState;
    // Backend ingestion state
    projectId: string | null;
    manifest: any | null;
    manifestStatus: 'idle' | 'polling' | 'complete' | 'error';
    uploadAndStart: (file: File) => Promise<void>; // uploads to backend & loads local PDF
    pollManifest: () => Promise<void>;
    fetchPageImage: (pageIndex: number) => Promise<void>;
    fetchPageOcr: (pageIndex: number) => Promise<void>;
    toggleOcr: () => void;
    loadPdf: (file: File) => Promise<void>;
    setCurrentPageIndex: (i: number) => void;
    setPageMeta: (meta: PageRenderMeta) => void;
    updateFitScale: (pageIndex: number, fit: number) => void;
    setZoomMode: (m: ZoomState['mode']) => void;
    setManualScale: (s: number) => void;
    effectiveScale: (pageIndex: number) => number;
    // OCR block meta state (per page -> per block index)
    ocrBlockState: Record<number, Record<number, { status: 'unverified' | 'accepted' | 'flagged' | 'noise'; }>>;
    initBlocksForPage: (pageIndex: number, count: number) => void;
    setBlockStatus: (pageIndex: number, blockIndex: number, status: 'unverified' | 'accepted' | 'flagged' | 'noise') => void;
    // OCR interaction state
    hoveredBlock: Record<number, number | null>; // per page hovered block index
    setHoveredBlock: (pageIndex: number, blockIndex: number | null) => void;
    selectedBlocks: Record<number, number[]>; // per page list of selected block indices
    toggleSelectBlock: (pageIndex: number, blockIndex: number, additive?: boolean) => void;
    clearSelection: (pageIndex: number) => void;
    setSelectedBlocks: (pageIndex: number, indices: number[], additive?: boolean) => void;
    bulkSetStatus: (pageIndex: number, status: 'unverified' | 'accepted' | 'flagged' | 'noise') => void;
    mergeSelectedBlocks: (pageIndex: number) => void; // create synthetic merged block
    // Notes entities (promoted selections)
    notes: { id: string; pageIndex: number; blockIds: number[]; bbox: [number, number, number, number]; text: string; createdAt: number; }[];
    promoteSelectionToNote: (pageIndex: number) => void;
    // Panel tabs
    rightPanelTab: 'blocks' | 'entities';
    setRightPanelTab: (tab: 'blocks' | 'entities') => void;
    // Scroll targeting for PdfCanvas
    scrollTarget: { pageIndex: number; blockIndex: number; at: number } | null;
    setScrollTarget: (pageIndex: number, blockIndex: number) => void;
    clearScrollTarget: () => void;
    // Toast notifications
    toasts: { id: string; kind: 'info' | 'error' | 'success'; message: string; createdAt: number; timeoutMs?: number; }[];
    addToast: (t: { kind?: 'info' | 'error' | 'success'; message: string; timeoutMs?: number; }) => void;
    dismissToast: (id: string) => void;
}

export type ProjectStore = AppState; // backward export name for existing imports

export const useProjectStore = create<AppState>((set, get): AppState => ({
    pdfDoc: null,
    pages: [],
    currentPageIndex: 0,
    pagesMeta: {},
    pageImages: {},
    pageOcr: {},
    showOcr: false,
    zoom: { mode: 'fit', manualScale: 1, lastManualScale: 1 },
    projectId: null,
    manifest: null,
    manifestStatus: 'idle',
    toasts: [],
    ocrBlockState: {},
    hoveredBlock: {},
    selectedBlocks: {},
    notes: [],
    rightPanelTab: 'blocks',
    scrollTarget: null,
    uploadAndStart: async (file: File) => {
        // parallel: upload to backend and local load for immediate viewing
        const form = new FormData();
        form.append('file', file);
        try {
            const uploadPromise = fetch('/api/projects', { method: 'POST', body: form })
                .then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json(); });
            await get().loadPdf(file); // local preview
            const resp = await uploadPromise;
            set({ projectId: resp.project_id, manifestStatus: 'polling' });
            get().pollManifest();
        } catch (e) {
            console.error(e);
            set({ manifestStatus: 'error' });
            get().addToast({ kind: 'error', message: 'Upload failed' });
        }
    },
    pollManifest: async () => {
        const { projectId } = get();
        if (!projectId) return;
        let done = false;
        while (!done) {
            try {
                const r = await fetch(`/api/projects/${projectId}/status`);
                if (!r.ok) throw new Error('Status fetch failed');
                const data = await r.json();
                set({ manifest: data });
                if (data.status === 'complete') {
                    set({ manifestStatus: 'complete' });
                    get().addToast({ kind: 'success', message: 'Processing complete' });
                    done = true;
                } else if (data.status === 'error') {
                    set({ manifestStatus: 'error' });
                    get().addToast({ kind: 'error', message: 'Processing error' });
                    done = true;
                } else {
                    await new Promise(r => setTimeout(r, 1500));
                }
            } catch (e) {
                console.error(e);
                set({ manifestStatus: 'error' });
                get().addToast({ kind: 'error', message: 'Processing error (network)' });
                done = true;
            }
        }
    },
    fetchPageImage: async (pageIndex: number) => {
        const { projectId, pageImages } = get();
        if (!projectId) return;
        if (pageImages[pageIndex]) return; // cached
        const resp = await fetch(`/api/projects/${projectId}/pages/${pageIndex + 1}.png`);
        if (!resp.ok) return;
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        set(state => ({ pageImages: { ...state.pageImages, [pageIndex]: url } }));
    },
    fetchPageOcr: async (pageIndex: number) => {
        const { projectId, pageOcr, initBlocksForPage } = get();
        if (!projectId) return;
        if (pageOcr[pageIndex]) return; // cached
        const resp = await fetch(`/api/projects/${projectId}/ocr/${pageIndex + 1}`);
        if (!resp.ok) return;
        const data = await resp.json();
        set(state => ({ pageOcr: { ...state.pageOcr, [pageIndex]: data } }));
        const blocks = data?.blocks || [];
        initBlocksForPage(pageIndex, blocks.length);
    },
    toggleOcr: () => set(state => ({ showOcr: !state.showOcr })),
    loadPdf: async (file: File) => {
        const arrayBuf = await file.arrayBuffer();
        const loadingTask = getDocument({ data: arrayBuf });
        const pdfDoc = await loadingTask.promise;
        set({
            pdfDoc,
            pages: Array.from({ length: pdfDoc.numPages }, (_, i) => i),
            pagesMeta: {},
            currentPageIndex: 0,
            zoom: { mode: 'fit', manualScale: 1, lastManualScale: 1 }
        });
    },
    setCurrentPageIndex: (i: number) => set({ currentPageIndex: i }),
    setPageMeta: (meta: PageRenderMeta) => set(state => ({
        pagesMeta: { ...state.pagesMeta, [meta.pageNumber]: meta }
    })),
    updateFitScale: (pageIndex: number, fit: number) => set(state => {
        const existing = state.pagesMeta[pageIndex];
        if (!existing) return {};
        if (Math.abs(existing.fitPageScale - fit) < 0.0005) return {};
        return {
            pagesMeta: { ...state.pagesMeta, [pageIndex]: { ...existing, fitPageScale: fit } }
        };
    }),
    setZoomMode: (m) => set(state => ({
        zoom: {
            ...state.zoom,
            mode: m,
            // Restore manual scale from remembered value when switching back
            manualScale: m === 'manual' ? state.zoom.lastManualScale : state.zoom.manualScale
        }
    })),
    setManualScale: (s) => set(state => {
        const clamped = Math.min(4, Math.max(0.05, parseFloat(s.toFixed(4))));
        return {
            zoom: { mode: 'manual', manualScale: clamped, lastManualScale: clamped }
        };
    }),
    effectiveScale: (pageIndex: number) => {
        const { zoom, pagesMeta } = get();
        const meta = pagesMeta[pageIndex];
        if (!meta) return 1;
        return zoom.mode === 'fit' ? meta.fitPageScale : zoom.manualScale;
    },
    initBlocksForPage: (pageIndex: number, count: number) => set(state => {
        if (state.ocrBlockState[pageIndex]) return {};
        const meta: Record<number, { status: 'unverified' }> = {};
        for (let i = 0; i < count; i++) meta[i] = { status: 'unverified' };
        return { ocrBlockState: { ...state.ocrBlockState, [pageIndex]: meta } };
    }),
    setBlockStatus: (pageIndex, blockIndex, status) => set(state => {
        const pageMeta = state.ocrBlockState[pageIndex];
        if (!pageMeta || !pageMeta[blockIndex]) return {};
        if (pageMeta[blockIndex].status === status) return {};
        return {
            ocrBlockState: {
                ...state.ocrBlockState,
                [pageIndex]: { ...pageMeta, [blockIndex]: { status } }
            }
        };
    }),
    setHoveredBlock: (pageIndex, blockIndex) => set(state => ({
        hoveredBlock: { ...state.hoveredBlock, [pageIndex]: blockIndex }
    })),
    toggleSelectBlock: (pageIndex, blockIndex, additive) => set(state => {
        const existing = state.selectedBlocks[pageIndex] || [];
        let next: number[];
        if (additive) {
            if (existing.includes(blockIndex)) next = existing.filter(b => b !== blockIndex); else next = [...existing, blockIndex];
        } else {
            // single select replace
            if (existing.length === 1 && existing[0] === blockIndex) next = []; else next = [blockIndex];
        }
        return { selectedBlocks: { ...state.selectedBlocks, [pageIndex]: next } };
    }),
    clearSelection: (pageIndex) => set(state => ({ selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [] } })),
    setSelectedBlocks: (pageIndex, indices, additive) => set(state => {
        const existing = state.selectedBlocks[pageIndex] || [];
        let next = indices;
        if (additive) {
            const set = new Set(existing);
            indices.forEach(i => set.add(i));
            next = Array.from(set).sort((a, b) => a - b);
        }
        return { selectedBlocks: { ...state.selectedBlocks, [pageIndex]: next } };
    }),
    bulkSetStatus: (pageIndex, status) => set(state => {
        const meta = state.ocrBlockState[pageIndex];
        if (!meta) return {};
        const selected = state.selectedBlocks[pageIndex] || [];
        if (!selected.length) return {};
        const updated: Record<number, { status: 'unverified' | 'accepted' | 'flagged' | 'noise' }> = { ...meta };
        selected.forEach(i => { if (updated[i]) updated[i] = { status }; });
        return { ocrBlockState: { ...state.ocrBlockState, [pageIndex]: updated } };
    }),
    mergeSelectedBlocks: (pageIndex) => set((state): Partial<AppState> => {
        const ocr = state.pageOcr[pageIndex];
        if (!ocr) return {};
        const selected = (state.selectedBlocks[pageIndex] || []).sort((a, b) => a - b);
        if (selected.length < 2) return {};
        const blocks = ocr.blocks || [];
        const chosen = selected.map(i => blocks[i]).filter(Boolean);
        if (!chosen.length) return {};
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        const texts: string[] = [];
        chosen.forEach(b => {
            const [bx1, by1, bx2, by2] = b.bbox;
            if (bx1 < x1) x1 = bx1; if (by1 < y1) y1 = by1; if (bx2 > x2) x2 = bx2; if (by2 > y2) y2 = by2;
            if (b.text) texts.push(b.text.trim());
        });
        const merged = { bbox: [x1, y1, x2, y2], text: texts.join('\n\n'), merged_from: selected };
        const newBlocks = [...blocks, merged];
        const newOcr = { ...ocr, blocks: newBlocks };
        const newIndex = newBlocks.length - 1;
        const pageMeta = state.ocrBlockState[pageIndex] || {};
        const updatedMeta: Record<number, { status: 'unverified' | 'accepted' | 'flagged' | 'noise'; }> = { ...pageMeta, [newIndex]: { status: 'unverified' } };
        return {
            pageOcr: { ...state.pageOcr, [pageIndex]: newOcr },
            ocrBlockState: { ...state.ocrBlockState, [pageIndex]: updatedMeta },
            selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [newIndex] }
        };
    }),
    promoteSelectionToNote: (pageIndex) => set((state): Partial<AppState> => {
        const ocr = state.pageOcr[pageIndex];
        if (!ocr) return {};
        const selected = (state.selectedBlocks[pageIndex] || []).sort((a, b) => a - b);
        if (!selected.length) return {};
        const blocks = ocr.blocks || [];
        const chosen = selected.map(i => blocks[i]).filter(Boolean);
        if (!chosen.length) return {};
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        const texts: string[] = [];
        chosen.forEach(b => {
            const [bx1, by1, bx2, by2] = b.bbox;
            if (bx1 < x1) x1 = bx1; if (by1 < y1) y1 = by1; if (bx2 > x2) x2 = bx2; if (by2 > y2) y2 = by2;
            if (b.text) texts.push(b.text.trim());
        });
        const note = {
            id: 'note_' + Math.random().toString(36).slice(2),
            pageIndex,
            blockIds: selected,
            bbox: [x1, y1, x2, y2] as [number, number, number, number],
            text: texts.join('\n\n'),
            createdAt: Date.now()
        };
        // Auto-accept blocks used
        const pageMeta = state.ocrBlockState[pageIndex];
        let updatedMeta = pageMeta;
        if (pageMeta) {
            updatedMeta = { ...pageMeta };
            selected.forEach(i => { if (updatedMeta![i]) updatedMeta![i] = { status: 'accepted' }; });
        }
        return {
            notes: [...state.notes, note],
            ocrBlockState: { ...state.ocrBlockState, [pageIndex]: updatedMeta || pageMeta },
            selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [] },
            rightPanelTab: 'entities'
        };
    }),
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    setScrollTarget: (pageIndex, blockIndex) => set({ scrollTarget: { pageIndex, blockIndex, at: Date.now() } }),
    clearScrollTarget: () => set({ scrollTarget: null }),
    addToast: ({ kind = 'info', message, timeoutMs = 5000 }) => {
        const id = Math.random().toString(36).slice(2);
        const toast = { id, kind, message, createdAt: Date.now(), timeoutMs };
        set(state => ({ toasts: [...state.toasts, toast] }));
        if (timeoutMs && timeoutMs > 0) {
            setTimeout(() => {
                const { toasts } = get();
                if (toasts.find(t => t.id === id)) {
                    set({ toasts: toasts.filter(t => t.id !== id) });
                }
            }, timeoutMs);
        }
    },
    dismissToast: (id: string) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));
