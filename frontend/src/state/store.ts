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
                    done = true;
                } else if (data.status === 'error') {
                    set({ manifestStatus: 'error' });
                    done = true;
                } else {
                    await new Promise(r => setTimeout(r, 1500));
                }
            } catch (e) {
                console.error(e);
                set({ manifestStatus: 'error' });
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
        const { projectId, pageOcr } = get();
        if (!projectId) return;
        if (pageOcr[pageIndex]) return; // cached
        const resp = await fetch(`/api/projects/${projectId}/ocr/${pageIndex + 1}`);
        if (!resp.ok) return;
        const data = await resp.json();
        set(state => ({ pageOcr: { ...state.pageOcr, [pageIndex]: data } }));
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
    }
}));
