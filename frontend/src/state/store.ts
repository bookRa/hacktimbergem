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
    deleteSelectedBlocks: (pageIndex: number) => void; // remove selected blocks (for accidental merged blocks)
    // Notes entities (promoted selections)
    notes: { id: string; pageIndex: number; blockIds: number[]; bbox: [number, number, number, number]; text: string; createdAt: number; note_type: string; }[];
    promoteSelectionToNote: (pageIndex: number) => void;
    updateNoteType: (id: string, note_type: string) => void;
    // Page titles
    pageTitles: Record<number, { text: string; fromBlocks?: number[] }>;
    setPageTitle: (pageIndex: number, text: string, fromBlocks?: number[]) => void;
    deriveTitleFromBlocks: (pageIndex: number, blockIds: number[]) => void;
    // Persisted visual entities from backend
    entities: any[]; // typed later via api/entities
    entitiesStatus: 'idle' | 'loading' | 'error';
    fetchEntities: () => Promise<void>;
    creatingEntity: { type: 'drawing' | 'legend' | 'schedule' | 'note' | 'symbol_definition' | 'component_definition'; startX: number; startY: number; parentId?: string | null; meta?: any } | null;
    startEntityCreation: (type: 'drawing' | 'legend' | 'schedule' | 'note') => void;
    startDefinitionCreation: (type: 'symbol_definition' | 'component_definition', parentId: string, meta: any) => void;
    cancelEntityCreation: () => void;
    finalizeEntityCreation: (x1: number, y1: number, x2: number, y2: number) => Promise<void>;
    selectedEntityId: string | null;
    setSelectedEntityId: (id: string | null) => void;
    updateEntityBBox: (id: string, bbox: [number, number, number, number]) => Promise<void>;
    updateEntityMeta: (id: string, data: any) => Promise<void>;
    deleteEntity: (id: string) => Promise<void>;
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
    pageTitles: {},
    rightPanelTab: 'blocks',
    scrollTarget: null,
    entities: [],
    entitiesStatus: 'idle',
    creatingEntity: null,
    selectedEntityId: null,
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
                    // Fetch entities once processing completes (initial load)
                    get().fetchEntities();
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
    deleteSelectedBlocks: (pageIndex) => set((state): Partial<AppState> => {
        const ocr = state.pageOcr[pageIndex];
        if (!ocr) return {};
        const selected = state.selectedBlocks[pageIndex] || [];
        if (!selected.length) return {};
        const blocks = ocr.blocks || [];
        // Filter out selected blocks
        const keepMap = new Set(selected);
        const newBlocks = blocks.filter((_: any, idx: number) => !keepMap.has(idx));
        // Re-map indices for ocrBlockState and selection
        const indexMap: Record<number, number> = {};
        let newIdx = 0;
        blocks.forEach((_b: any, i: number) => { if (!keepMap.has(i)) { indexMap[i] = newIdx++; } });
        const oldMeta = state.ocrBlockState[pageIndex] || {};
        const newMeta: Record<number, { status: 'unverified' | 'accepted' | 'flagged' | 'noise' }> = {};
        Object.entries(oldMeta).forEach(([k, v]) => {
            const oi = parseInt(k, 10);
            if (keepMap.has(oi)) return;
            newMeta[indexMap[oi]] = v;
        });
        const newOcr = { ...ocr, blocks: newBlocks };
        return {
            pageOcr: { ...state.pageOcr, [pageIndex]: newOcr },
            ocrBlockState: { ...state.ocrBlockState, [pageIndex]: newMeta },
            selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [] }
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
            createdAt: Date.now(),
            note_type: 'general'
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
    updateNoteType: (id, note_type) => set(state => ({
        notes: state.notes.map(n => n.id === id ? { ...n, note_type } : n)
    })),
    setPageTitle: (pageIndex, raw, fromBlocks) => set(state => {
        let text = (raw || '').replace(/\s+/g, ' ').trim();
        if (!text) return {};
        if (text.length > 120) text = text.slice(0, 117).trimEnd() + '...';
        return { pageTitles: { ...state.pageTitles, [pageIndex]: { text, fromBlocks: fromBlocks && fromBlocks.length ? fromBlocks : undefined } } };
    }),
    deriveTitleFromBlocks: (pageIndex, blockIds) => {
        const { pageOcr, setPageTitle } = get();
        const ocr = pageOcr[pageIndex];
        if (!ocr) return;
        const blocks = ocr.blocks || [];
        const combined = blockIds.map(i => blocks[i]?.text || '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (combined) setPageTitle(pageIndex, combined, blockIds);
    },
    fetchEntities: async () => {
        const { projectId, addToast } = get();
        if (!projectId) return;
        set({ entitiesStatus: 'loading' });
        try {
            const r = await fetch(`/api/projects/${projectId}/entities`);
            if (!r.ok) throw new Error('Failed');
            const data = await r.json();
            set({ entities: data, entitiesStatus: 'idle' });
        } catch (e) {
            console.error(e);
            set({ entitiesStatus: 'error' });
            addToast({ kind: 'error', message: 'Failed to load entities' });
        }
    },
    startEntityCreation: (type) => {
        // Deselect any selected entity when starting a new drawing
        set({ creatingEntity: { type, startX: -1, startY: -1 }, selectedEntityId: null });
    },
    startDefinitionCreation: (type, parentId, meta) => set({ creatingEntity: { type, startX: -1, startY: -1, parentId, meta } }),
    cancelEntityCreation: () => set({ creatingEntity: null }),
    finalizeEntityCreation: async (x1, y1, x2, y2) => {
        const { creatingEntity, projectId, currentPageIndex, addToast, fetchEntities, setSelectedEntityId } = get() as any;
        if (!creatingEntity || !projectId) return;
        const sheetNumber = currentPageIndex + 1; // 1-based
        try {
            const payload: any = {
                entity_type: creatingEntity.type,
                source_sheet_number: sheetNumber,
                bounding_box: [x1, y1, x2, y2]
            };
            if (creatingEntity.type === 'symbol_definition') {
                const m = creatingEntity.meta || {};
                payload.name = m.name || '';
                payload.description = m.description || null;
                payload.visual_pattern_description = m.visual_pattern_description || null;
                payload.scope = m.scope === 'project' ? 'project' : 'sheet';
                payload.defined_in_id = creatingEntity.parentId;
            } else if (creatingEntity.type === 'component_definition') {
                const m = creatingEntity.meta || {};
                payload.name = m.name || '';
                payload.description = m.description || null;
                payload.specifications = m.specifications || null;
                payload.scope = m.scope === 'project' ? 'project' : 'sheet';
                payload.defined_in_id = creatingEntity.parentId;
            }
            const resp = await fetch(`/api/projects/${projectId}/entities`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                let msg = 'Create failed';
                try { const j = await resp.json(); msg = j.detail || msg; } catch { }
                throw new Error(msg);
            }
            const created = await resp.json();
            await fetchEntities();
            setSelectedEntityId(created?.id || null);
            addToast({ kind: 'success', message: `${creatingEntity.type} created` });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e.message || 'Create failed' });
        } finally {
            set({ creatingEntity: null });
        }
    },
    setSelectedEntityId: (id) => set({ selectedEntityId: id }),
    updateEntityBBox: async (id, bbox) => {
        const { projectId, addToast, fetchEntities } = get();
        if (!projectId) return;
        try {
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bounding_box: bbox }) });
            await fetchEntities();
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Update failed' });
        }
    },
    updateEntityMeta: async (id, data) => {
        const { projectId, addToast, fetchEntities } = get();
        if (!projectId) return;
        try {
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            await fetchEntities();
            addToast({ kind: 'success', message: 'Updated' });
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Update failed' });
        }
    },
    deleteEntity: async (id) => {
        const { projectId, addToast, fetchEntities, selectedEntityId, setSelectedEntityId } = get();
        if (!projectId) return;
        try {
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'DELETE' });
            if (selectedEntityId === id) setSelectedEntityId(null);
            await fetchEntities();
            addToast({ kind: 'success', message: 'Entity deleted' });
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Delete failed' });
        }
    },
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
