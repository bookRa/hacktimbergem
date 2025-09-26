import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

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
  type: 'Drawing' | 'SymbolInst' | 'Scope' | 'Note' | null;
  entityId?: string;
  at?: { x: number; y: number } | null;
  pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] } | null;
  initialValues?: Record<string, any> | null;
  mode?: 'create' | 'edit';
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
    type: 'Drawing' | 'SymbolInst' | 'Scope' | 'Note';
    entityId?: string;
    at?: { x: number; y: number };
    pendingBBox?: { sheetId: string; bboxPdf: [number, number, number, number] };
    initialValues?: Record<string, any> | null;
    mode?: 'create' | 'edit';
  }) => void;
  closeForm: () => void;
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
  linking: LinkingState;
  hover?: Selection;
  selection: Selection[];
  filters: FiltersState;
} & UIActions;

const initialState: Omit<UIState, keyof UIActions> = {
  mode: 'select',
  contextMenu: { open: false, at: null, target: undefined },
  inlineForm: { open: false, type: null, at: null, pendingBBox: null, entityId: undefined, initialValues: null, mode: 'create' },
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
    set({ inlineForm: { open: false, type: null, at: null, entityId: undefined, pendingBBox: null, initialValues: null, mode: 'create' } });
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
export const useUIV2Mode = () => useUIV2Store((state) => state.mode);
export const useUIV2Selection = () => useUIV2Store((state) => ({ selection: state.selection, hover: state.hover }), shallow);
export const useUIV2Linking = () => useUIV2Store((state) => state.linking, shallow);
export const useUIV2Filters = () => useUIV2Store((state) => state.filters, shallow);
