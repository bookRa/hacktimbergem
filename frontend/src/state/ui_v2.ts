import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import type { OCRBlock } from '../ui_v2/overlays/OCRPicker';

export type Selection = {
  type: 'Drawing' | 'Legend' | 'Schedule' | 'Note' | 'Space' | 'SymbolDef' | 'CompDef' | 'SymbolInst' | 'CompInst' | 'Scope';
  id: string;
  sheetId?: string;
};

type ContextMenuState = {
  open: boolean;
  at: { x: number; y: number } | null;
  target?: Selection;
};

type InlineFormState = {
  open: boolean;
  type: 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef' | null;
  entityId?: string;
  at?: { x: number; y: number } | null;
  pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] } | null;
  initialValues?: Record<string, any> | null;
  mode?: 'create' | 'edit';
  minimized?: boolean;
};

type DrawingState = {
  active: boolean;
  entityType?: 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef' | null;
};

type OCRPickerState = {
  open: boolean;
  pageIndex?: number;
  onSelect?: (block: OCRBlock) => void;
};

type OCRSelectionMode = {
  active: boolean;
  selectedBlocks: Array<{ pageIndex: number; blockIndex: number; text: string; bbox: [number, number, number, number] }>;
  targetField: 'recognizedText' | 'name' | 'description';
  formContext?: {
    type: 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef';
    at?: { x: number; y: number };
    pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] };
    initialValues?: Record<string, any>;
    mode?: 'create' | 'edit';
    entityId?: string;
  };
};

type LinkingState = {
  active: boolean;
  source?: Selection;
  pending: Selection[];
};

type FiltersState = {
  needsAttention: boolean;
  text: string;
};

type UIActions = {
  setMode: (mode: Mode) => void;
  openContext: (payload: { at: { x: number; y: number }; target?: Selection; pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] } }) => void;
  closeContext: () => void;
  openForm: (payload: {
    type: 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef';
    entityId?: string;
    at?: { x: number; y: number };
    pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] };
    initialValues?: Record<string, any> | null;
    mode?: 'create' | 'edit';
  }) => void;
  closeForm: () => void;
  minimizeForm: () => void;
  restoreForm: () => void;
  startDrawing: (entityType: 'Drawing' | 'Legend' | 'Schedule' | 'SymbolInst' | 'CompInst' | 'Scope' | 'Note' | 'SymbolDef' | 'CompDef') => void;
  cancelDrawing: () => void;
  openOCRPicker: (pageIndex: number, onSelect: (block: OCRBlock) => void) => void;
  closeOCRPicker: () => void;
  startOCRSelection: (targetField: 'recognizedText' | 'name' | 'description', formContext: OCRSelectionMode['formContext']) => void;
  toggleOCRBlock: (pageIndex: number, blockIndex: number, text: string, bbox: [number, number, number, number]) => void;
  applyOCRSelection: () => { text: string; formContext: OCRSelectionMode['formContext'] } | null;
  cancelOCRSelection: () => void;
  startLinking: (source: Selection, initialPending?: Selection[]) => void;
  addPending: (selection: Selection) => void;
  finishLinking: () => { source?: Selection; pending: Selection[] };
  cancelLinking: () => void;
  setHover: (selection: Selection | undefined) => void;
  setSelection: (selection: Selection[]) => void;
  setFilters: (updater: Partial<FiltersState>) => void;
};

export type Mode = 'select' | 'draw' | 'stamp' | 'link';

export type UIState = {
  mode: Mode;
  contextMenu: ContextMenuState;
  inlineForm: InlineFormState;
  drawing: DrawingState;
  ocrPicker: OCRPickerState;
  ocrSelectionMode: OCRSelectionMode;
  linking: LinkingState;
  hover?: Selection;
  selection: Selection[];
  filters: FiltersState;
} & UIActions;

const initialState: Omit<UIState, keyof UIActions> = {
  mode: 'select',
  contextMenu: { open: false, at: null, target: undefined },
  inlineForm: { open: false, type: null, at: null, pendingBBox: null, entityId: undefined, initialValues: null, mode: 'create', minimized: false },
  drawing: { active: false, entityType: null },
  ocrPicker: { open: false },
  ocrSelectionMode: { active: false, selectedBlocks: [], targetField: 'recognizedText' },
  linking: { active: false, source: undefined, pending: [] },
  hover: undefined,
  selection: [],
  filters: { needsAttention: false, text: '' },
};

export const useUIV2Store = createWithEqualityFn<UIState>((set, get) => ({
  ...initialState,
  setMode: (mode) => {
    const { linking } = get();
    set({
      mode,
      linking: mode === 'link' ? linking : { active: false, source: undefined, pending: [] },
    });
  },
  openContext: ({ at, target, pendingBBox }) => {
    set({
      contextMenu: { open: true, at, target },
      inlineForm: { ...get().inlineForm, pendingBBox: pendingBBox ?? get().inlineForm.pendingBBox },
    });
  },
  closeContext: () => {
    set({ contextMenu: { open: false, at: null, target: undefined } });
  },
  openForm: ({ type, entityId, at, pendingBBox, initialValues = null, mode = 'create' }) => {
    set({
      inlineForm: {
        open: true,
        type,
        entityId,
        at: at ?? null,
        pendingBBox: pendingBBox ?? get().inlineForm.pendingBBox ?? null,
        initialValues,
        mode,
      },
    });
  },
  closeForm: () => {
    // Regular form close - don't restore during normal workflow
    set({ inlineForm: { open: false, type: null, at: null, entityId: undefined, pendingBBox: null, initialValues: null, mode: 'create', minimized: false } });
  },
  minimizeForm: () => {
    set((state) => ({
      inlineForm: { ...state.inlineForm, minimized: true },
    }));
  },
  restoreForm: () => {
    set((state) => ({
      inlineForm: { ...state.inlineForm, minimized: false },
    }));
  },
  startDrawing: (entityType) => {
    set({ drawing: { active: true, entityType }, mode: 'draw' });
  },
  cancelDrawing: () => {
    // Check if we're completing a definition drawing (not canceling)
    const isCompletingDefinitionDrawing = (window as any).__completingDefinitionDrawing;
    const pendingInstanceForm = (window as any).__pendingInstanceForm;
    const isNewDefinitionCreation = (window as any).__isNewDefinitionCreation;
    
    console.log('[DEBUG] cancelDrawing called', {
      isCompletingDefinitionDrawing,
      pendingInstanceForm: !!pendingInstanceForm,
      isNewDefinitionCreation
    });
    
    // If we're completing (not canceling), just exit drawing mode without restoration
    if (isCompletingDefinitionDrawing) {
      console.log('[DEBUG] cancelDrawing - completing definition, just exiting drawing mode');
      set({ drawing: { active: false, entityType: null }, mode: 'select' });
      return;
    }

    // Check if this was drawing for a new definition and user is actually canceling
    if (pendingInstanceForm && isNewDefinitionCreation) {
      console.log('[DEBUG] cancelDrawing - RESTORING instance form');
      // Restore the instance form when user cancels definition drawing
      set({
        drawing: { active: false, entityType: null },
        mode: 'select',
        inlineForm: {
          open: true,
          type: pendingInstanceForm.type,
          entityId: pendingInstanceForm.entityId,
          at: pendingInstanceForm.at,
          pendingBBox: pendingInstanceForm.pendingBBox,
          initialValues: pendingInstanceForm.initialValues,
          mode: pendingInstanceForm.mode,
        }
      });
      // Clear the flags
      delete (window as any).__pendingInstanceForm;
      delete (window as any).__isNewDefinitionCreation;
      return;
    }

    console.log('[DEBUG] cancelDrawing - regular cancel');
    // Regular drawing cancel
    set({ drawing: { active: false, entityType: null }, mode: 'select' });
  },
  openOCRPicker: (pageIndex, onSelect) => {
    set({ ocrPicker: { open: true, pageIndex, onSelect } });
  },
  closeOCRPicker: () => {
    set({ ocrPicker: { open: false } });
  },
  startOCRSelection: (targetField, formContext) => {
    set({
      ocrSelectionMode: {
        active: true,
        selectedBlocks: [],
        targetField,
        formContext,
      },
      mode: 'select',
    });
    console.log('[ui_v2] startOCRSelection → ocrSelectionMode.active = TRUE');
  },
  toggleOCRBlock: (pageIndex, blockIndex, text, bbox) => {
    set((state) => {
      const existing = state.ocrSelectionMode.selectedBlocks.findIndex(
        (b) => b.pageIndex === pageIndex && b.blockIndex === blockIndex
      );
      
      let newBlocks;
      if (existing >= 0) {
        newBlocks = state.ocrSelectionMode.selectedBlocks.filter((_, i) => i !== existing);
      } else {
        newBlocks = [...state.ocrSelectionMode.selectedBlocks, { pageIndex, blockIndex, text, bbox }];
      }
      
      return {
        ocrSelectionMode: {
          ...state.ocrSelectionMode,
          selectedBlocks: newBlocks,
        },
      };
    });
  },
  applyOCRSelection: () => {
    const state = get();
    const { selectedBlocks, formContext } = state.ocrSelectionMode;
    
    if (selectedBlocks.length === 0) {
      return null;
    }
    
    const concatenatedText = selectedBlocks.map((b) => b.text).join(' ');
    
    // Reset OCR selection mode
    set({
      ocrSelectionMode: { active: false, selectedBlocks: [], targetField: 'recognizedText' },
    });
    console.log('[ui_v2] applyOCRSelection → ocrSelectionMode.active = FALSE');
    
    return { text: concatenatedText, formContext };
  },
  cancelOCRSelection: () => {
    set({
      ocrSelectionMode: { active: false, selectedBlocks: [], targetField: 'recognizedText' },
    });
    console.log('[ui_v2] cancelOCRSelection → ocrSelectionMode.active = FALSE');
  },
  startLinking: (source, initialPending = []) => {
    set({ linking: { active: true, source, pending: initialPending }, mode: 'link' });
  },
  addPending: (selection) => {
    set((state) => {
      const exists = state.linking.pending.some((item) => item.id === selection.id && item.type === selection.type);
      const pending = exists
        ? state.linking.pending.filter((item) => !(item.id === selection.id && item.type === selection.type))
        : [...state.linking.pending, selection];
      return { linking: { ...state.linking, pending } };
    });
  },
  finishLinking: () => {
    const current = get().linking;
    set({ linking: { active: false, source: undefined, pending: [] }, mode: 'select' });
    return { source: current.source, pending: current.pending };
  },
  cancelLinking: () => {
    set({ linking: { active: false, source: undefined, pending: [] }, mode: 'select' });
  },
  setHover: (selection) => {
    set({ hover: selection ?? undefined });
  },
  setSelection: (selection) => {
    set({ selection });
  },
  setFilters: (updates) => {
    set((state) => ({ filters: { ...state.filters, ...updates } }));
  },
}), shallow);

export const useUIV2Actions = () => {
  return useUIV2Store((state) => ({
    setMode: state.setMode,
    openContext: state.openContext,
    closeContext: state.closeContext,
    openForm: state.openForm,
    closeForm: state.closeForm,
    minimizeForm: state.minimizeForm,
    restoreForm: state.restoreForm,
    startDrawing: state.startDrawing,
    cancelDrawing: state.cancelDrawing,
    openOCRPicker: state.openOCRPicker,
    closeOCRPicker: state.closeOCRPicker,
    startOCRSelection: state.startOCRSelection,
    toggleOCRBlock: state.toggleOCRBlock,
    applyOCRSelection: state.applyOCRSelection,
    cancelOCRSelection: state.cancelOCRSelection,
    startLinking: state.startLinking,
    addPending: state.addPending,
    finishLinking: state.finishLinking,
    cancelLinking: state.cancelLinking,
    setHover: state.setHover,
    setSelection: state.setSelection,
    setFilters: state.setFilters,
  }), shallow);
};

export const useUIV2ContextMenu = () => useUIV2Store((state) => state.contextMenu, shallow);
export const useUIV2InlineForm = () => useUIV2Store((state) => state.inlineForm, shallow);
export const useUIV2Drawing = () => useUIV2Store((state) => state.drawing, shallow);
export const useUIV2OCRPicker = () => useUIV2Store((state) => state.ocrPicker, shallow);
export const useUIV2OCRSelection = () => useUIV2Store((state) => state.ocrSelectionMode, shallow);
export const useUIV2Mode = () => useUIV2Store((state) => state.mode);
export const useUIV2Selection = () => useUIV2Store((state) => ({ selection: state.selection, hover: state.hover }), shallow);
export const useUIV2Linking = () => useUIV2Store((state) => state.linking, shallow);
export const useUIV2Filters = () => useUIV2Store((state) => state.filters, shallow);
