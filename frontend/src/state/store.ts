import { createWithEqualityFn } from 'zustand/traditional';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';
import { canvasToPdf } from '../utils/coords';
import type { Concept } from '../api/concepts';
import { fetchConcepts as apiFetchConcepts, createConcept as apiCreateConcept, patchConcept as apiPatchConcept, deleteConcept as apiDeleteConcept } from '../api/concepts';
import type { Relationship, RelationshipType } from '../api/links';
import { fetchLinks as apiFetchLinks, createLink as apiCreateLink, deleteLink as apiDeleteLink } from '../api/links';
import type { EntityType } from '../api/entities';
import { deriveEntityFlags } from './entity_flags';

// Page raster meta at 300 DPI baseline
export interface PageRenderMeta {
    pageNumber: number;
    nativeWidth: number;   // 300 DPI raster width (px)
    nativeHeight: number;  // 300 DPI raster height (px)
    fitPageScale: number;  // computed to fit entire page (width & height)
    pageWidthPts?: number; // original PDF width in points (72dpi space)
    pageHeightPts?: number; // original PDF height in points
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
    initProjectById: (projectId: string) => Promise<void>; // initialize session from existing backend project id
    pollManifest: () => Promise<void>;
    fetchPageImage: (pageIndex: number) => Promise<void>;
    fetchPageOcr: (pageIndex: number) => Promise<void>;
    toggleOcr: () => void; // deprecated from UI; kept for Right Panel switch
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
    // UI density
    uiDensity: 'comfortable' | 'compact';
    setUiDensity: (d: 'comfortable' | 'compact') => void;
    // Conceptual nodes
    concepts: Concept[];
    conceptsStatus: 'idle' | 'loading' | 'error';
    fetchConcepts: () => Promise<void>;
    createConcept: (data: { kind: 'space'; name: string } | { kind: 'scope'; description: string; category?: string | null }) => Promise<void>;
    updateConcept: (id: string, data: Partial<{ name: string; description: string; category?: string | null }>) => Promise<void>;
    deleteConceptById: (id: string) => Promise<void>;
    // Relationships (links)
    links: Relationship[];
    linksStatus: 'idle' | 'loading' | 'error';
    fetchLinks: (filters?: { source_id?: string; target_id?: string; rel_type?: RelationshipType }) => Promise<void>;
    deleteLinkById: (id: string) => Promise<void>;
    // Linking mode
    linking: { relType: RelationshipType; anchor: { kind: 'space' | 'scope'; id: string }; selectedTargetIds: string[] } | null;
    startLinking: (relType: RelationshipType, anchor: { kind: 'space' | 'scope'; id: string }) => void;
    toggleLinkTarget: (targetId: string) => void;
    finishLinking: () => Promise<void>;
    cancelLinking: () => void;
    creatingEntity: { type: 'drawing' | 'legend' | 'schedule' | 'note' | 'symbol_definition' | 'component_definition' | 'symbol_instance' | 'component_instance'; startX: number; startY: number; parentId?: string | null; meta?: any } | null;
    startEntityCreation: (type: 'drawing' | 'legend' | 'schedule' | 'note') => void;
    startDefinitionCreation: (type: 'symbol_definition' | 'component_definition', parentId: string | null, meta: any) => void;
    startInstanceStamp: (kind: 'symbol' | 'component', definitionId: string, opts?: { sizePts?: number; recognized_text?: string }) => void;
    cancelEntityCreation: () => void;
    finalizeEntityCreation: (x1: number, y1: number, x2: number, y2: number) => Promise<void>;
    selectedEntityId: string | null;
    _explicitSelection: boolean;
    setSelectedEntityId: (id: string | null) => void;
    selectEntity: (id: string | null) => void;
    updateEntityBBox: (id: string, bbox: [number, number, number, number]) => Promise<void>;
    updateEntityMeta: (id: string, data: any) => Promise<void>;
    deleteEntity: (id: string) => Promise<void>;
    // Panel tabs
    rightPanelTab: 'blocks' | 'entities' | 'explorer';
    leftTab: 'sheets' | 'search';
    explorerTab: 'scopes' | 'symbolsInst' | 'symbolsDef' | 'componentsDef' | 'componentsInst' | 'spaces' | 'notes';
    // UI layout (Sprint 1)
    leftPanel: { widthPx: number; collapsed: boolean };
    rightPanel: { widthPx: number; collapsed: boolean };
    setLeftPanelWidth: (px: number) => void;
    setRightPanelWidth: (px: number) => void;
    toggleLeftCollapsed: () => void;
    toggleRightCollapsed: () => void;
    setLeftTab: (t: 'sheets' | 'search') => void;
    setExplorerTab: (t: 'scopes' | 'symbolsInst') => void;
    // Layer visibility (authoritative for overlays)
    layers: { ocr: boolean; drawings: boolean; legends: boolean; schedules: boolean; symbols: boolean; components: boolean; notes: boolean; scopes: boolean };
    setLayer: (k: keyof AppState['layers'], v: boolean) => void;
    // Right inspector sizing
    rightInspectorHeightPx: number;
    setRightInspectorHeight: (px: number) => void;
    // Explorer selections
    selectedScopeId: string | null;
    setSelectedScopeId: (id: string | null) => void;
    selectScope: (id: string | null) => void;
    selectedSpaceId: string | null;
    activeSheetFilter: number[] | null; // filtered sheet indexes (zero-based) or null for all
    selectSpace: (id: string | null) => void;
    hoverEntityId: string | null;
    hoverScopeId: string | null;
    setHoverEntityId: (id: string | null) => void;
    setHoverScopeId: (id: string | null) => void;
    setRightPanelTab: (tab: 'blocks' | 'entities') => void;
    // Scroll targeting for PdfCanvas
    scrollTarget: { pageIndex: number; blockIndex: number; at: number } | null;
    setScrollTarget: (pageIndex: number, blockIndex: number) => void;
    clearScrollTarget: () => void;
    // Focus specific bbox on canvas (in PDF pts)
    focusBBoxPts: { pageIndex: number; bboxPts: [number, number, number, number]; at: number } | null;
    setFocusBBox: (pageIndex: number, bboxPts: [number, number, number, number]) => void;
    clearFocusBBox: () => void;
    // Toast notifications
    toasts: { id: string; kind: 'info' | 'error' | 'success'; message: string; createdAt: number; timeoutMs?: number; }[];
    addToast: (t: { kind?: 'info' | 'error' | 'success'; message: string; timeoutMs?: number; }) => void;
    dismissToast: (id: string) => void;
    // --- Simple history (undo/redo) for core actions ---
    historyPast: any[];
    historyFuture: any[];
    pushHistory: (entry: any) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    historyIdMap: Record<string, string>; // originalId -> currentId mapping for recreated entities
    // Persisted Notes from OCR selection
    promoteSelectionToNotePersist: (pageIndex: number) => Promise<void>;
    // Scope creation mode
    scopeCreationMode: {
        active: boolean;
        type: 'canvas' | 'conceptual' | null;
    };
    addingScopeLocationTo: string | null; // Track which scope ID is getting a location added
    startScopeCreation: (type: 'canvas' | 'conceptual') => void;
    cancelScopeCreation: () => void;
    startAddingScopeLocation: (scopeId: string) => void;
    createScope: (data: { name: string; description?: string; source_sheet_number?: number; bounding_box?: number[] }) => Promise<void>;
    updateScopeLocation: (scopeId: string, sheet: number, bbox: number[]) => Promise<void>;
    removeScopeLocation: (scopeId: string) => Promise<void>;
    // OCR helpers
    getOCRBlocksInBBox: (pageIndex: number, bbox: [number, number, number, number]) => Array<{ index: number; text: string; bbox: [number, number, number, number] }>;
}

export type ProjectStore = AppState; // backward export name for existing imports

const lsNum = (k: string, def: number) => {
    try { const v = localStorage.getItem(k); return v ? Math.max(0, parseInt(v, 10)) : def; } catch { return def; }
};
const lsBool = (k: string, def: boolean) => {
    try { const v = localStorage.getItem(k); return v ? v === '1' : def; } catch { return def; }
};

export const useProjectStore = createWithEqualityFn<AppState>((set, get): AppState => ({
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
    leftTab: 'sheets',
    leftPanel: { widthPx: lsNum('ui:leftWidth', 240), collapsed: lsBool('ui:leftCollapsed', false) },
    rightPanel: { widthPx: lsNum('ui:rightWidth', 360), collapsed: lsBool('ui:rightCollapsed', false) },
    layers: { ocr: false, drawings: true, legends: true, schedules: true, symbols: true, components: true, notes: true, scopes: true },
    rightInspectorHeightPx: lsNum('ui:rightInspectorHeight', 260),
    explorerTab: 'scopes',
    scrollTarget: null,
    entities: [],
    entitiesStatus: 'idle',
    concepts: [],
    conceptsStatus: 'idle',
    links: [],
    linksStatus: 'idle',
    uiDensity: (() => { try { return (localStorage.getItem('ui:density') as any) || 'comfortable'; } catch { return 'comfortable'; } })(),
    creatingEntity: null,
    selectedEntityId: null,
    _explicitSelection: false,
    selectedSpaceId: null,
    activeSheetFilter: null,
    focusBBoxPts: null,
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
            try { localStorage.setItem('lastProjectId', resp.project_id); } catch {}
            try { if (typeof window !== 'undefined') window.location.hash = `#p=${resp.project_id}`; } catch {}
            get().pollManifest();
        } catch (e) {
            console.error(e);
            set({ manifestStatus: 'error' });
            get().addToast({ kind: 'error', message: 'Upload failed' });
        }
    },
    initProjectById: async (projectId: string) => {
        if (!projectId) return;
        set({ projectId, manifestStatus: 'polling' });
        try { localStorage.setItem('lastProjectId', projectId); } catch {}
        // Try to load original PDF from backend so pdf.js can compute pages/fit scales
        try {
            const resp = await fetch(`/api/projects/${projectId}/original.pdf`);
            if (resp.ok) {
                const blob = await resp.blob();
                const file = new File([blob], 'original.pdf', { type: 'application/pdf' });
                await (get() as any).loadPdf(file);
            }
        } catch (e) {
            console.warn('Could not fetch original.pdf for project', projectId, e);
        }
        await get().pollManifest();
        // After poll completes, ensure we have entities/concepts/links
        get().fetchEntities();
        get().fetchConcepts();
        get().fetchLinks();
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
                    // Derive total pages if not yet set
                    const pages = (get() as any).pages as number[];
                    if (!pages || pages.length === 0) {
                        const total = (data.total_pages || data.pages_total || data.page_count || (Array.isArray(data.pages) ? data.pages.length : 0) || 0) as number;
                        if (total && total > 0) {
                            set({ pages: Array.from({ length: total }, (_, i) => i) });
                        }
                    }
                    set({ manifestStatus: 'complete' });
                    get().addToast({ kind: 'success', message: 'Processing complete' });
                    // Fetch entities once processing completes (initial load)
                    // Load entities, concepts, and links
                    get().fetchEntities();
                    get().fetchConcepts();
                    get().fetchLinks();
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
    toggleOcr: () => set((state) => {
        const turningOff = state.layers.ocr === true;
        const pageIndex = state.currentPageIndex;
        const nextLayers = { ...state.layers, ocr: !state.layers.ocr } as any;
        return {
            layers: nextLayers,
            showOcr: nextLayers.ocr,
            selectedBlocks: turningOff ? { ...state.selectedBlocks, [pageIndex]: [] } : state.selectedBlocks
        } as Partial<AppState> as any;
    }),
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
    setUiDensity: (d) => set(() => { try { localStorage.setItem('ui:density', d); } catch {} return { uiDensity: d } as any; }),
    fetchConcepts: async () => {
        const { projectId, addToast } = get();
        if (!projectId) return;
        set({ conceptsStatus: 'loading' });
        try {
            const data = await apiFetchConcepts(projectId);
            set({ concepts: data, conceptsStatus: 'idle' });
        } catch (e) {
            console.error(e);
            set({ conceptsStatus: 'error' });
            addToast({ kind: 'error', message: 'Failed to load concepts' });
        }
    },
    createConcept: async (data) => {
        const { projectId, addToast, fetchConcepts } = get();
        if (!projectId) return;
        try {
            await apiCreateConcept(projectId, data as any);
            await fetchConcepts();
            addToast({ kind: 'success', message: 'Concept created' });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to create concept' });
        }
    },
    updateConcept: async (id, data) => {
        const { projectId, addToast, fetchConcepts } = get();
        if (!projectId) return;
        try {
            await apiPatchConcept(projectId, id, data);
            await fetchConcepts();
            addToast({ kind: 'success', message: 'Concept updated' });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to update concept' });
        }
    },
    deleteConceptById: async (id) => {
        const { projectId, addToast, fetchConcepts } = get();
        if (!projectId) return;
        try {
            await apiDeleteConcept(projectId, id);
            await fetchConcepts();
            addToast({ kind: 'success', message: 'Concept deleted' });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to delete concept' });
        }
    },
    fetchLinks: async (filters) => {
        const { projectId, addToast } = get();
        if (!projectId) return;
        set({ linksStatus: 'loading' });
        try {
            const data = await apiFetchLinks(projectId, filters as any);
            set({ links: data, linksStatus: 'idle' });
        } catch (e) {
            console.error(e);
            set({ linksStatus: 'error' });
            addToast({ kind: 'error', message: 'Failed to load links' });
        }
    },
    deleteLinkById: async (id) => {
        const { projectId, addToast, fetchLinks, pushHistory } = get() as any;
        if (!projectId) return;
        try {
            const linkObj = (get() as any).links.find((l: any) => l.id === id);
            await apiDeleteLink(projectId, id);
            await fetchLinks();
            addToast({ kind: 'success', message: 'Link deleted' });
            if (linkObj) try { pushHistory({ type: 'delete_links', links: [linkObj] }); } catch {}
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to delete link' });
        }
    },
    linking: null,
    startLinking: (relType, anchor) => set(state => {
        const nextLayers = { ...state.layers } as any;
        if (relType === 'DEPICTS' && !nextLayers.drawings) nextLayers.drawings = true;
        if (relType === 'LOCATED_IN') {
            if (!nextLayers.symbols) nextLayers.symbols = true;
            if (!nextLayers.components) nextLayers.components = true;
        }
        if (relType === 'JUSTIFIED_BY') {
            if (!nextLayers.symbols) nextLayers.symbols = true;
            if (!nextLayers.components) nextLayers.components = true;
            if (!nextLayers.notes) nextLayers.notes = true;
        }
        return { layers: nextLayers, linking: { relType, anchor, selectedTargetIds: [] } } as any;
    }),
    toggleLinkTarget: (targetId) => set(state => {
        const linking = state.linking;
        if (!linking) return {} as any;
        const setIds = new Set(linking.selectedTargetIds);
        if (setIds.has(targetId)) setIds.delete(targetId); else setIds.add(targetId);
        return { linking: { ...linking, selectedTargetIds: Array.from(setIds) } } as Partial<AppState> as any;
    }),
    finishLinking: async () => {
        const { projectId, linking, addToast, fetchLinks, entities, concepts, pushHistory } = get() as any;
        if (!projectId || !linking) return;
        if (!linking.selectedTargetIds.length) { addToast({ kind: 'error', message: 'No targets selected' }); return; }
        // Helper: find kind of an id from entities/concepts
        const idKind = (id: string): string | null => {
            const ent = entities.find((e: any) => e.id === id);
            if (ent) return ent.entity_type;
            const con = concepts.find((c: any) => c.id === id);
            if (con) return con.kind;
            return null;
        };
        // Validate pairs lightly on client to reduce errors, backend remains source of truth.
        const { relType, anchor } = linking as { relType: RelationshipType, anchor: { kind: 'space' | 'scope', id: string } };
        const payloads: Array<{ rel_type: RelationshipType; source_id: string; target_id: string }> = [];
        for (const tid of linking.selectedTargetIds) {
            if (relType === 'JUSTIFIED_BY') {
                // scope -> evidence entity
                if (anchor.kind !== 'scope') { addToast({ kind: 'error', message: 'JUSTIFIED_BY requires a Scope as anchor' }); return; }
                const tk = idKind(tid);
                if (!tk || !['note', 'symbol_instance', 'component_instance'].includes(tk)) { addToast({ kind: 'error', message: 'Target is not a valid evidence item' }); return; }
                payloads.push({ rel_type: 'JUSTIFIED_BY', source_id: anchor.id, target_id: tid });
            } else if (relType === 'DEPICTS') {
                // drawing -> space
                if (anchor.kind !== 'space') { addToast({ kind: 'error', message: 'DEPICTS requires a Space as anchor' }); return; }
                const sk = idKind(tid);
                if (sk !== 'drawing') { addToast({ kind: 'error', message: 'Only Drawings can depict a Space' }); return; }
                payloads.push({ rel_type: 'DEPICTS', source_id: tid, target_id: anchor.id });
            } else if (relType === 'LOCATED_IN') {
                // instance -> space
                if (anchor.kind !== 'space') { addToast({ kind: 'error', message: 'LOCATED_IN requires a Space as anchor' }); return; }
                const sk = idKind(tid);
                if (!sk || !['symbol_instance', 'component_instance'].includes(sk)) { addToast({ kind: 'error', message: 'Only instances can be located in a Space' }); return; }
                payloads.push({ rel_type: 'LOCATED_IN', source_id: tid, target_id: anchor.id });
            }
        }
        try {
            const before = new Set(((get() as any).links || []).map((l: any) => l.id));
            for (const p of payloads) {
                await apiCreateLink(projectId, p as any);
            }
            await fetchLinks();
            const after = (get() as any).links || [];
            const created = after.filter((l: any) => !before.has(l.id));
            set({ linking: null });
            addToast({ kind: 'success', message: 'Links created' });
            try { pushHistory({ type: 'create_links', links: created }); } catch {}
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to create links' });
        }
    },
    cancelLinking: () => set({ linking: null }),
    startEntityCreation: (type) => {
        // Deselect any selected entity when starting a new drawing
        set({ creatingEntity: { type, startX: -1, startY: -1 }, selectedEntityId: null });
    },
    startDefinitionCreation: (type, parentId, meta) => set({ creatingEntity: { type, startX: -1, startY: -1, parentId, meta } }),
    startInstanceStamp: (kind, definitionId, opts) => set(state => {
        const nextLayers = { ...state.layers } as any;
        if (!nextLayers.drawings) nextLayers.drawings = true;
        if (kind === 'symbol' && !nextLayers.symbols) nextLayers.symbols = true;
        if (kind === 'component' && !nextLayers.components) nextLayers.components = true;
        return { layers: nextLayers, creatingEntity: { type: kind === 'symbol' ? 'symbol_instance' : 'component_instance', startX: -1, startY: -1, meta: { definitionId, ...opts } } } as any;
    }),
    // Guard: auto-enable required layers for stamping
    // Drawings must be visible to place instances (containment feedback)
    // Enable symbols/components layer for visual feedback
    // Keep user toggles otherwise intact
    // (No-op on disable; never auto-disable)
    
    cancelEntityCreation: () => set({ creatingEntity: null }),
    finalizeEntityCreation: async (x1, y1, x2, y2) => {
        const { creatingEntity, projectId, currentPageIndex, addToast, fetchEntities, setSelectedEntityId, fetchPageOcr, pushHistory } = get() as any;
        if (!creatingEntity || !projectId) return;
        const sheetNumber = currentPageIndex + 1; // 1-based
        try {
            // Ensure we have OCR/meta available to convert canvas -> PDF
            let ocr = (get() as any).pageOcr[currentPageIndex];
            if (!ocr) { await fetchPageOcr(currentPageIndex); ocr = (get() as any).pageOcr[currentPageIndex]; }
            const pageMeta = (get() as any).pagesMeta[currentPageIndex];
            if (!ocr || !pageMeta) { throw new Error('Missing page meta for coordinate conversion'); }
            const renderMeta = {
                pageWidthPts: ocr.width_pts,
                pageHeightPts: ocr.height_pts,
                rasterWidthPx: pageMeta.nativeWidth,
                rasterHeightPx: pageMeta.nativeHeight,
                rotation: 0 as 0,
            };
            const [px1, py1, px2, py2] = canvasToPdf([x1, y1, x2, y2], renderMeta as any);
            const payload: any = {
                entity_type: creatingEntity.type,
                source_sheet_number: sheetNumber,
                bounding_box: [px1, py1, px2, py2]
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
            } else if (creatingEntity.type === 'symbol_instance') {
                payload.symbol_definition_id = creatingEntity.meta?.definitionId;
                if (creatingEntity.meta?.recognized_text) {
                    payload.recognized_text = creatingEntity.meta.recognized_text;
                }
            } else if (creatingEntity.type === 'component_instance') {
                payload.component_definition_id = creatingEntity.meta?.definitionId;
            }

            Object.assign(payload, deriveEntityFlags(creatingEntity.type as EntityType, payload, null));
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
            try { pushHistory({ type: 'create_entity', entity: created }); } catch {}
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e.message || 'Create failed' });
        } finally {
            // Keep stamping mode active for instances; only clear for other entity types
            const ce = (get() as any).creatingEntity;
            const isStamping = ce && (ce.type === 'symbol_instance' || ce.type === 'component_instance');
            if (!isStamping) {
                set({ creatingEntity: null });
            }
        }
    },
    setSelectedEntityId: (id) => set({ selectedEntityId: id }),
    selectEntity: (id) => {
        // When explicitly selecting from UI (e.g., Explorer), mark it with a flag
        // to prevent canvas sync from overriding it
        set({ selectedEntityId: id, rightPanelTab: 'entities', _explicitSelection: true } as any);
        // Clear the flag after a brief moment to allow normal sync to resume
        setTimeout(() => {
            const current = (get() as any).selectedEntityId;
            if (current === id) {
                set({ _explicitSelection: false } as any);
            }
        }, 100);
    },
    updateEntityBBox: async (id, bbox) => {
        const { projectId, addToast, fetchEntities, fetchPageOcr, pushHistory } = get() as any;
        if (!projectId) return;
        try {
            // Convert canvas -> PDF using current page meta
            const currentPageIndex = (get() as any).currentPageIndex;
            let ocr = (get() as any).pageOcr[currentPageIndex];
            if (!ocr) { await fetchPageOcr(currentPageIndex); ocr = (get() as any).pageOcr[currentPageIndex]; }
            const pageMeta = (get() as any).pagesMeta[currentPageIndex];
            if (!ocr || !pageMeta) throw new Error('Missing page meta for coordinate conversion');
            const renderMeta = {
                pageWidthPts: ocr.width_pts,
                pageHeightPts: ocr.height_pts,
                rasterWidthPx: pageMeta.nativeWidth,
                rasterHeightPx: pageMeta.nativeHeight,
                rotation: 0 as 0,
            };
            const beforeEnt = (get() as any).entities.find((e: any) => e.id === id);
            const beforeBox = beforeEnt ? [beforeEnt.bounding_box.x1, beforeEnt.bounding_box.y1, beforeEnt.bounding_box.x2, beforeEnt.bounding_box.y2] : null;
            const [px1, py1, px2, py2] = canvasToPdf(bbox as any, renderMeta as any);
            const afterBox = [px1, py1, px2, py2];
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bounding_box: afterBox }) });
            await fetchEntities();
            try { if (beforeBox) pushHistory({ type: 'edit_entity', id, before: { bounding_box: beforeBox }, after: { bounding_box: afterBox } }); } catch {}
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Update failed' });
        }
    },
    updateEntityMeta: async (id, data) => {
        const { projectId, addToast, fetchEntities, pushHistory } = get() as any;
        if (!projectId) return;
        try {
            const beforeEnt = (get() as any).entities.find((e: any) => e.id === id) || {};
            const keys = Object.keys(data || {});
            const before: any = {};
            keys.forEach(k => { if (k in beforeEnt) before[k] = (beforeEnt as any)[k]; });
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            await fetchEntities();
            addToast({ kind: 'success', message: 'Updated' });
            try { pushHistory({ type: 'edit_entity', id, before, after: data }); } catch {}
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Update failed' });
        }
    },
    deleteEntity: async (id) => {
        const { projectId, addToast, fetchEntities, selectedEntityId, setSelectedEntityId, pushHistory } = get() as any;
        if (!projectId) return;
        try {
            const ent = (get() as any).entities.find((e: any) => e.id === id);
            await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'DELETE' });
            if (selectedEntityId === id) setSelectedEntityId(null);
            await fetchEntities();
            addToast({ kind: 'success', message: 'Entity deleted' });
            if (ent) try { pushHistory({ type: 'delete_entity', entity: ent }); } catch {}
        } catch (e: any) {
            console.error(e); addToast({ kind: 'error', message: e.message || 'Delete failed' });
        }
    },
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    setLeftTab: (t) => set({ leftTab: t }),
    setExplorerTab: (t) => set({ explorerTab: t }),
    setLeftPanelWidth: (px) => set(state => {
        const width = Math.max(160, Math.min(540, Math.round(px)));
        try { localStorage.setItem('ui:leftWidth', String(width)); } catch {}
        return { leftPanel: { ...state.leftPanel, widthPx: width } } as any;
    }),
    setRightPanelWidth: (px) => set(state => {
        const width = Math.max(260, Math.min(640, Math.round(px)));
        try { localStorage.setItem('ui:rightWidth', String(width)); } catch {}
        return { rightPanel: { ...state.rightPanel, widthPx: width } } as any;
    }),
    toggleLeftCollapsed: () => set(state => {
        const next = !state.leftPanel.collapsed; try { localStorage.setItem('ui:leftCollapsed', next ? '1' : '0'); } catch {}
        return { leftPanel: { ...state.leftPanel, collapsed: next } } as any;
    }),
    toggleRightCollapsed: () => set(state => {
        const next = !state.rightPanel.collapsed; try { localStorage.setItem('ui:rightCollapsed', next ? '1' : '0'); } catch {}
        return { rightPanel: { ...state.rightPanel, collapsed: next } } as any;
    }),
    setLayer: (k, v) => set(state => {
        const next = { ...state.layers, [k]: v } as any;
        const extra: any = {};
        if (k === 'ocr') extra.showOcr = v;
        return { layers: next, ...extra } as any;
    }),
    setRightInspectorHeight: (px) => set(state => {
        const h = Math.max(160, Math.min(600, Math.round(px)));
        try { localStorage.setItem('ui:rightInspectorHeight', String(h)); } catch {}
        return { rightInspectorHeightPx: h } as any;
    }),
    selectedScopeId: null,
    setSelectedScopeId: (id) => set({ selectedScopeId: id } as any),
    selectScope: (id) => set({ selectedScopeId: id, rightPanelTab: 'explorer', explorerTab: 'scopes' } as any),
    selectSpace: (id) => {
        const st: any = get();
        const { entities, links } = st;
        if (!id) { set({ selectedSpaceId: null, activeSheetFilter: null } as any); return; }
        // Compute relevant sheets
        const depicting = links.filter((l: any) => l.rel_type === 'DEPICTS' && l.target_id === id).map((l: any) => entities.find((e: any) => e.id === l.source_id)).filter(Boolean);
        const located = links.filter((l: any) => l.rel_type === 'LOCATED_IN' && l.target_id === id).map((l: any) => entities.find((e: any) => e.id === l.source_id)).filter(Boolean);
        const sheets = new Set<number>();
        depicting.forEach((d: any) => sheets.add((d.source_sheet_number || 1) - 1));
        located.forEach((inst: any) => sheets.add((inst.source_sheet_number || 1) - 1));
        const arr = Array.from(sheets).sort((a, b) => a - b);
        // Pick a focus target: prefer a drawing from DEPICTS, else first located instance
        const focusEnt: any = depicting[0] || located[0] || null;
        set({ selectedSpaceId: id, activeSheetFilter: arr, leftTab: 'sheets' } as any);
        if (focusEnt) {
            const pageIndex = (focusEnt.source_sheet_number || 1) - 1;
            const bb = focusEnt.bounding_box;
            set({ currentPageIndex: pageIndex, focusBBoxPts: { pageIndex, bboxPts: [bb.x1, bb.y1, bb.x2, bb.y2], at: Date.now() } } as any);
        }
    },
    hoverEntityId: null,
    hoverScopeId: null,
    setHoverEntityId: (id) => set({ hoverEntityId: id } as any),
    setHoverScopeId: (id) => set({ hoverScopeId: id } as any),
    setScrollTarget: (pageIndex, blockIndex) => set({ scrollTarget: { pageIndex, blockIndex, at: Date.now() } }),
    clearScrollTarget: () => set({ scrollTarget: null }),
    setFocusBBox: (pageIndex, bboxPts) => set({ focusBBoxPts: { pageIndex, bboxPts, at: Date.now() } } as any),
    clearFocusBBox: () => set({ focusBBoxPts: null } as any),
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
    dismissToast: (id: string) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
    // --- Simple history (undo/redo) for core actions ---
    historyPast: [],
    historyFuture: [],
    pushHistory: (entry: any) => set(state => ({ historyPast: [...(state as any).historyPast, entry], historyFuture: [] } as any)),
    historyIdMap: {},
    scopeCreationMode: {
        active: false,
        type: null,
    },
    addingScopeLocationTo: null,
    promoteSelectionToNotePersist: async (pageIndex: number) => {
        const { projectId, addToast, pageOcr, selectedBlocks, fetchEntities } = get() as any;
        if (!projectId) return;
        const ocr = pageOcr[pageIndex];
        if (!ocr) return;
        const selected = (selectedBlocks[pageIndex] || []).sort((a: number, b: number) => a - b);
        if (!selected.length) { addToast({ kind: 'error', message: 'No OCR blocks selected' }); return; }
        const blocks = ocr.blocks || [];
        const chosen = selected.map((i: number) => blocks[i]).filter(Boolean);
        if (!chosen.length) return;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        const texts: string[] = [];
        chosen.forEach((b: any) => {
            const [bx1, by1, bx2, by2] = b.bbox;
            if (bx1 < x1) x1 = bx1; if (by1 < y1) y1 = by1; if (bx2 > x2) x2 = bx2; if (by2 > y2) y2 = by2;
            if (b.text) texts.push((b.text as string).trim());
        });
        const payload = { entity_type: 'note', source_sheet_number: pageIndex + 1, bounding_box: [x1, y1, x2, y2], text: texts.join('\n\n') } as any;
        try {
            const resp = await fetch(`/api/projects/${projectId}/entities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!resp.ok) {
                let msg = 'Create note failed';
                try { const j = await resp.json(); msg = j.detail || msg; } catch {}
                throw new Error(msg);
            }
            await fetchEntities();
            // Auto-accept blocks used
            const pageMeta = (get() as any).ocrBlockState[pageIndex];
            if (pageMeta) {
                const updatedMeta: Record<number, { status: 'unverified' | 'accepted' | 'flagged' | 'noise' }> = { ...pageMeta };
                selected.forEach((i: number) => { if (updatedMeta[i]) updatedMeta[i] = { status: 'accepted' }; });
                set((state) => ({ ocrBlockState: { ...state.ocrBlockState, [pageIndex]: updatedMeta }, selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [] } }) as any);
            } else {
                set((state) => ({ selectedBlocks: { ...state.selectedBlocks, [pageIndex]: [] } }) as any);
            }
            addToast({ kind: 'success', message: 'Note created' });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Create note failed' });
        }
    },
    undo: async () => {
        const st: any = get();
        const past: any[] = st.historyPast || [];
        if (!past.length) return;
        const entry = past[past.length - 1];
        set({ historyPast: past.slice(0, -1), historyFuture: [entry, ...(st.historyFuture || [])] } as any);
        const projectId = st.projectId; if (!projectId) return;
        try {
            if (entry.type === 'create_entity') {
                const alias = (get() as any).historyIdMap || {};
                const id = entry.currentId || alias[entry.entity.id] || entry.entity.id;
                // If the entity still exists, delete it; else no-op
                const e = (get() as any).entities.find((x: any) => x.id === id);
                if (e) await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'DELETE' });
                await st.fetchEntities();
            } else if (entry.type === 'edit_entity') {
                // Undo edit: apply `before` fields
                const payload = { ...(entry.before || {}) };
                const alias = (get() as any).historyIdMap || {};
                const id = entry.currentId || alias[entry.id] || entry.id;
                await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                await st.fetchEntities();
            } else if (entry.type === 'delete_entity') {
                const e = entry.entity;
                const payload: any = { entity_type: e.entity_type, source_sheet_number: e.source_sheet_number, bounding_box: [e.bounding_box.x1, e.bounding_box.y1, e.bounding_box.x2, e.bounding_box.y2] };
                if (['drawing','legend','schedule'].includes(e.entity_type)) payload.title = e.title || null;
                if (e.entity_type === 'note') payload.text = e.text || null;
                if (['symbol_definition','component_definition'].includes(e.entity_type)) {
                    payload.name = e.name || null; payload.description = e.description || null; payload.scope = e.scope || 'sheet'; payload.defined_in_id = e.defined_in_id || null;
                    if (e.entity_type === 'symbol_definition') payload.visual_pattern_description = e.visual_pattern_description || null;
                    if (e.entity_type === 'component_definition') payload.specifications = e.specifications || {};
                }
                if (e.entity_type === 'symbol_instance') payload.symbol_definition_id = e.symbol_definition_id;
                if (e.entity_type === 'component_instance') payload.component_definition_id = e.component_definition_id;
                const resp = await fetch(`/api/projects/${projectId}/entities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const recreated = await resp.json();
                entry.currentId = recreated?.id;
                const alias = (get() as any).historyIdMap || {};
                set({ historyIdMap: { ...alias, [entry.entity.id]: recreated?.id } } as any);
                await st.fetchEntities();
            } else if (entry.type === 'create_links') {
                for (const l of entry.links) {
                    // If id known delete by id; else try to find by triple
                    if (l.id) {
                        await fetch(`/api/projects/${projectId}/links/${l.id}`, { method: 'DELETE' });
                    } else {
                        const match = (get() as any).links.find((x: any) => x.rel_type === l.rel_type && x.source_id === l.source_id && x.target_id === l.target_id);
                        if (match) await fetch(`/api/projects/${projectId}/links/${match.id}`, { method: 'DELETE' });
                    }
                }
                await st.fetchLinks();
            } else if (entry.type === 'delete_links') {
                const newIds: any[] = [];
                for (const l of entry.links) {
                    const resp = await fetch(`/api/projects/${projectId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rel_type: l.rel_type, source_id: l.source_id, target_id: l.target_id }) });
                    const created = await resp.json();
                    newIds.push(created?.id);
                }
                await st.fetchLinks();
                // store current ids for redo delete (after links are fetched)
                entry.links = (get() as any).links.filter((x: any) => newIds.includes(x.id));
            }
        } catch (e) { console.error('Undo failed', e); }
    },
    redo: async () => {
        const st: any = get();
        const future: any[] = st.historyFuture || [];
        if (!future.length) return;
        const entry = future[0];
        set({ historyFuture: future.slice(1), historyPast: [ ...(st.historyPast || []), entry ] } as any);
        const projectId = st.projectId; if (!projectId) return;
        try {
            if (entry.type === 'create_entity') {
                const e = entry.entity;
                const payload: any = { entity_type: e.entity_type, source_sheet_number: e.source_sheet_number, bounding_box: [e.bounding_box.x1, e.bounding_box.y1, e.bounding_box.x2, e.bounding_box.y2] };
                if (['drawing','legend','schedule'].includes(e.entity_type)) payload.title = e.title || null;
                if (e.entity_type === 'note') payload.text = e.text || null;
                if (['symbol_definition','component_definition'].includes(e.entity_type)) {
                    payload.name = e.name || null; payload.description = e.description || null; payload.scope = e.scope || 'sheet'; payload.defined_in_id = e.defined_in_id || null;
                    if (e.entity_type === 'symbol_definition') payload.visual_pattern_description = e.visual_pattern_description || null;
                    if (e.entity_type === 'component_definition') payload.specifications = e.specifications || {};
                }
                if (e.entity_type === 'symbol_instance') payload.symbol_definition_id = e.symbol_definition_id;
                if (e.entity_type === 'component_instance') payload.component_definition_id = e.component_definition_id;
                const resp = await fetch(`/api/projects/${projectId}/entities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const created = await resp.json();
                entry.currentId = created?.id;
                const alias = (get() as any).historyIdMap || {};
                set({ historyIdMap: { ...alias, [entry.entity.id]: created?.id } } as any);
                await st.fetchEntities();
            } else if (entry.type === 'edit_entity') {
                // Redo edit: apply `after` fields again
                const payload = { ...(entry.after || {}) };
                const alias = (get() as any).historyIdMap || {};
                const id = entry.currentId || alias[entry.id] || entry.id;
                await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                await st.fetchEntities();
            } else if (entry.type === 'delete_entity') {
                const alias = (get() as any).historyIdMap || {};
                const id = entry.currentId || alias[entry.entity.id] || entry.entity.id;
                const e = (get() as any).entities.find((x: any) => x.id === id);
                if (e) await fetch(`/api/projects/${projectId}/entities/${id}`, { method: 'DELETE' });
                await st.fetchEntities();
            } else if (entry.type === 'create_links') {
                const newIds: any[] = [];
                for (const l of entry.links) {
                    const resp = await fetch(`/api/projects/${projectId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rel_type: l.rel_type, source_id: l.source_id, target_id: l.target_id }) });
                    const created = await resp.json();
                    newIds.push(created?.id);
                }
                await st.fetchLinks();
                entry.links = (get() as any).links.filter((x: any) => newIds.includes(x.id));
            } else if (entry.type === 'delete_links') {
                for (const l of entry.links) {
                    // If link id known, delete by id; else search
                    if (l.id) await fetch(`/api/projects/${projectId}/links/${l.id}`, { method: 'DELETE' });
                    else {
                        const match = (get() as any).links.find((x: any) => x.rel_type === l.rel_type && x.source_id === l.source_id && x.target_id === l.target_id);
                        if (match) await fetch(`/api/projects/${projectId}/links/${match.id}`, { method: 'DELETE' });
                    }
                }
                await st.fetchLinks();
            }
        } catch (e) { console.error('Redo failed', e); }
    },
    // Scope creation actions
    startScopeCreation: (type: 'canvas' | 'conceptual') => {
        set({ 
            scopeCreationMode: { active: true, type },
        });
        
        // If canvas type, trigger drawing mode via ui_v2
        if (type === 'canvas') {
            import('./ui_v2').then(({ useUIV2Store }) => {
                const startDrawing = useUIV2Store.getState().startDrawing;
                startDrawing('scope');
            }).catch((err) => {
                console.error('[startScopeCreation] Failed to import UI V2 store:', err);
            });
        }
        // For 'conceptual', the modal component will handle the UI
    },
    cancelScopeCreation: () => {
        set({ 
            scopeCreationMode: { active: false, type: null },
        });
    },
    startAddingScopeLocation: (scopeId: string) => {
        console.log('[startAddingScopeLocation] Starting to add location to scope:', scopeId);
        
        // Store which scope is getting a location added
        set({ addingScopeLocationTo: scopeId });
        
        // Start canvas drawing mode for scope bbox
        // Note: startDrawing is in the UI V2 store, not the project store
        // Import it dynamically to avoid circular dependency
        import('./ui_v2').then(({ useUIV2Store }) => {
            const startDrawing = useUIV2Store.getState().startDrawing;
            console.log('[startAddingScopeLocation] Starting drawing mode for scope');
            startDrawing('scope');
        }).catch((err) => {
            console.error('[startAddingScopeLocation] Failed to import UI V2 store:', err);
        });
    },
    createScope: async (data: { name: string; description?: string; source_sheet_number?: number; bounding_box?: number[] }) => {
        const { projectId, entities, addToast, fetchEntities } = get() as any;
        if (!projectId) {
            addToast({ kind: 'error', message: 'No project loaded' });
            return;
        }
        
        // Check for duplicate names
        if (data.name) {
            const duplicate = entities.find((e: any) => 
                e.entity_type === 'scope' && 
                (e.name?.toLowerCase() === data.name.toLowerCase() || 
                 e.description?.toLowerCase() === data.name.toLowerCase())
            );
            
            if (duplicate) {
                const confirmCreate = window.confirm(
                    `A scope with similar name "${duplicate.name || duplicate.description}" already exists. Create anyway?`
                );
                if (!confirmCreate) return;
            }
        }
        
        // Build payload - only include non-empty strings
        const payload: any = {
            entity_type: 'scope',
        };
        
        // Only include name/description if they have actual content
        if (data.name && data.name.trim()) {
            payload.name = data.name.trim();
        }
        if (data.description && data.description.trim()) {
            payload.description = data.description.trim();
        }
        
        // Only add spatial fields if provided (for canvas scopes)
        if (data.source_sheet_number !== undefined && data.bounding_box) {
            payload.source_sheet_number = data.source_sheet_number;
            payload.bounding_box = data.bounding_box;
        }
        
        console.log('[createScope] Sending payload:', JSON.stringify(payload, null, 2));
        
        try {
            const resp = await fetch(`/api/projects/${projectId}/entities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            if (!resp.ok) {
                let msg = 'Create scope failed';
                try { 
                    const j = await resp.json(); 
                    // Handle FastAPI validation error format (array of error objects)
                    if (Array.isArray(j.detail)) {
                        msg = j.detail.map((err: any) => err.msg).join(', ');
                    } else if (typeof j.detail === 'string') {
                        msg = j.detail;
                    }
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                }
                throw new Error(msg);
            }
            
            const created = await resp.json();
            await fetchEntities();
            
            set({ 
                scopeCreationMode: { active: false, type: null },
                selectedEntityId: created.id,
                rightPanelTab: 'entities',
            } as any);
            
            addToast({ kind: 'success', message: `Scope "${data.name}" created` });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to create scope' });
        }
    },
    updateScopeLocation: async (scopeId: string, sheet: number, bbox: number[]) => {
        const { projectId, addToast, fetchEntities } = get() as any;
        if (!projectId) return;
        
        try {
            const resp = await fetch(`/api/projects/${projectId}/entities/${scopeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_sheet_number: sheet,
                    bounding_box: bbox,
                }),
            });
            
            if (!resp.ok) {
                let msg = 'Update scope location failed';
                try { const j = await resp.json(); msg = j.detail || msg; } catch {}
                throw new Error(msg);
            }
            
            await fetchEntities();
            
            // Navigate to the sheet and select the scope to show the result
            set({
                currentPageIndex: sheet - 1, // Convert 1-based to 0-based
                selectedEntityId: scopeId,
                rightPanelTab: 'entities',
            } as any);
            
            addToast({ kind: 'success', message: 'Canvas location added to scope' });
        } catch (e: any) {
            console.error(e);
            addToast({ kind: 'error', message: e?.message || 'Failed to update scope location' });
        }
    },
    removeScopeLocation: async (scopeId: string) => {
        const { projectId, addToast, fetchEntities } = get() as any;
        if (!projectId) return;
        
        const confirmRemove = window.confirm(
            'Remove canvas location from this scope? It will become a conceptual scope (project-level).'
        );
        
        if (!confirmRemove) return;
        
        try {
            const resp = await fetch(`/api/projects/${projectId}/entities/${scopeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_sheet_number: null,
                    bounding_box: null,
                }),
            });
            
            if (!resp.ok) {
                let msg = 'Remove scope location failed';
                try { const j = await resp.json(); msg = j.detail || msg; } catch {}
                throw new Error(msg);
            }
            
            await fetchEntities();
            console.log('[removeScopeLocation] Successfully removed location and refreshed entities');
            addToast({ kind: 'success', message: 'Scope converted to conceptual (canvas location removed)' });
        } catch (e: any) {
            console.error('[removeScopeLocation] Error:', e);
            addToast({ kind: 'error', message: e?.message || 'Failed to remove scope location' });
        }
    },
    // OCR helper: Get all OCR blocks that intersect with a given bounding box
    getOCRBlocksInBBox: (pageIndex: number, bbox: [number, number, number, number]) => {
        const { pageOcr } = get() as any;
        const ocr = pageOcr[pageIndex];
        
        if (!ocr || !Array.isArray(ocr)) {
            console.log('[getOCRBlocksInBBox] No OCR data for page', pageIndex);
            return [];
        }
        
        const [x1, y1, x2, y2] = bbox;
        const blocksInBBox: Array<{ index: number; text: string; bbox: [number, number, number, number] }> = [];
        
        for (let i = 0; i < ocr.length; i++) {
            const block = ocr[i];
            if (!block.bbox || block.bbox.length !== 4) continue;
            
            const [bx1, by1, bx2, by2] = block.bbox;
            
            // Check if block intersects with note bbox
            // Two rectangles intersect if they don't NOT overlap
            const intersects = !(bx2 < x1 || bx1 > x2 || by2 < y1 || by1 > y2);
            
            if (intersects && block.text && block.text.trim()) {
                blocksInBBox.push({ 
                    index: i, 
                    text: block.text.trim(), 
                    bbox: [bx1, by1, bx2, by2] 
                });
            }
        }
        
        console.log(`[getOCRBlocksInBBox] Found ${blocksInBBox.length} OCR blocks in bbox`, { pageIndex, bbox, blocks: blocksInBBox });
        return blocksInBBox;
    },
}));
