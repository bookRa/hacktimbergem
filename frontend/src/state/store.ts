import { create } from 'zustand';
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist';

export interface PageViewportMeta {
    width: number; height: number; scaleX: number; scaleY: number;
}

interface ProjectState {
    pdfDoc: PDFDocumentProxy | null;
    pages: number[]; // page indices placeholder
    currentPageIndex: number;
    pageViewportMeta: Record<number, PageViewportMeta>;
    loadPdf: (file: File) => Promise<void>;
    setCurrentPageIndex: (i: number) => void;
    setPageViewportMeta: (i: number, meta: PageViewportMeta) => void;
}

export type ProjectStore = ProjectState;

export const useProjectStore = create<ProjectState>((set, get): ProjectState => ({
    pdfDoc: null,
    pages: [],
    currentPageIndex: 0,
    pageViewportMeta: {},
    loadPdf: async (file: File) => {
        const arrayBuf = await file.arrayBuffer();
        const loadingTask = getDocument({ data: arrayBuf });
        const pdfDoc = await loadingTask.promise;
        set({ pdfDoc, pages: Array.from({ length: pdfDoc.numPages }, (_, i) => i) });
    },
    setCurrentPageIndex: (i: number) => set({ currentPageIndex: i }),
    setPageViewportMeta: (i: number, meta: PageViewportMeta) => set(state => ({ pageViewportMeta: { ...state.pageViewportMeta, [i]: meta } }))
}));
