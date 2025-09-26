import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { BBox, BBoxVariant } from './canvas/BBox';
import { EntityTag, EntityType as TagEntityType } from './canvas/EntityTag';
import { ContextPicker } from './menus/ContextPicker';
import { EntityMenu } from './menus/EntityMenu';
import { InlineEntityForm } from './forms/InlineEntityForm';
import { ChipsTray } from './linking/ChipsTray';
import { OCRPicker } from './overlays/OCRPicker';
import '../ui_v2/theme/tokens.css';
import { useUIV2Actions, useUIV2ContextMenu, useUIV2InlineForm, useUIV2Linking, useUIV2Selection } from '../state/ui_v2';
import type { Selection } from '../state/ui_v2';
import { useProjectStore } from '../state/store';
import { createEntity, patchEntity } from '../api/entities';
import { createLink as apiCreateLink } from '../api/links';
import { deriveEntityFlags } from '../state/entity_flags';
import { pdfToCanvas } from '../utils/coords';
import type { Entity } from '../api/entities';

interface OverlayLayerProps {
  pageIndex: number;
  scale: number;
  wrapperRef: React.RefObject<HTMLDivElement>;
}

type PdfBBox = [number, number, number, number];

type DisplayEntity = {
  entity: Entity;
  tagType: TagEntityType;
  bboxPx: { x: number; y: number; width: number; height: number };
  isIncomplete: boolean;
};

type ResizeHandle = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br';

const HANDLE_SIZE = 10;
const HANDLE_OFFSET = HANDLE_SIZE / 2;
const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  tl: 'nwse-resize',
  tm: 'ns-resize',
  tr: 'nesw-resize',
  ml: 'ew-resize',
  mr: 'ew-resize',
  bl: 'nesw-resize',
  bm: 'ns-resize',
  br: 'nwse-resize',
};

const MIN_HANDLE_SIZE = 8;

function computeResizeRect(
  start: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number
) {
  let { x, y, width, height } = start;

  if (handle.includes('t')) {
    const newHeight = Math.max(MIN_HANDLE_SIZE, height - deltaY);
    const appliedDelta = height - newHeight;
    height = newHeight;
    y = y + appliedDelta;
  }

  if (handle.includes('b')) {
    height = Math.max(MIN_HANDLE_SIZE, height + deltaY);
  }

  if (handle.includes('l')) {
    const newWidth = Math.max(MIN_HANDLE_SIZE, width - deltaX);
    const appliedDelta = width - newWidth;
    width = newWidth;
    x = x + appliedDelta;
  }

  if (handle.includes('r')) {
    width = Math.max(MIN_HANDLE_SIZE, width + deltaX);
  }

  return { x, y, width, height };
}

const entityTypeMap: Record<Entity['entity_type'], TagEntityType> = {
  drawing: 'Drawing',
  legend: 'Legend',
  schedule: 'Schedule',
  note: 'Note',
  scope: 'Scope',
  symbol_definition: 'SymbolDef',
  component_definition: 'CompDef',
  symbol_instance: 'SymbolInst',
  component_instance: 'CompInst',
};

const formTypeByEntity: Partial<Record<Entity['entity_type'], 'Drawing' | 'Scope' | 'Note'>> = {
  drawing: 'Drawing',
  scope: 'Scope',
  note: 'Note',
};

function isIncomplete(entity: Entity & { status?: string; validation?: any }): boolean {
  if (entity.status === 'incomplete') return true;
  const missing = entity.validation?.missing;
  if (!missing) return false;
  return Boolean(missing.drawing || missing.definition || missing.scope);
}

function pdfBoxToDisplay(
  bbox: PdfBBox,
  meta: { pageWidthPts: number; pageHeightPts: number; nativeWidth: number; nativeHeight: number },
  scale: number
) {
  const renderMeta = {
    pageWidthPts: meta.pageWidthPts,
    pageHeightPts: meta.pageHeightPts,
    rasterWidthPx: meta.nativeWidth,
    rasterHeightPx: meta.nativeHeight,
    rotation: 0 as 0,
  };
  const [cx1, cy1, cx2, cy2] = pdfToCanvas(bbox, renderMeta);
  const x = cx1 * scale;
  const y = cy1 * scale;
  const width = (cx2 - cx1) * scale;
  const height = (cy2 - cy1) * scale;
  return { x, y, width, height };
}

export function OverlayLayer({ pageIndex, scale, wrapperRef }: OverlayLayerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const draftBoxRef = useRef<HTMLDivElement | null>(null);
  const pendingDraftRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pendingBBoxRef = useRef<{ sheetId: string; bboxPdf: PdfBBox } | null>(null);
  const editSessionRef = useRef<
    | {
        id: string;
        mode: 'move' | 'resize';
        handle?: ResizeHandle;
        startPointer: { x: number; y: number };
        startRect: { x: number; y: number; width: number; height: number };
        currentRect: { x: number; y: number; width: number; height: number };
      }
    | null
  >(null);
  const editingListenersRef = useRef<{ move: (event: PointerEvent) => void; up: (event: PointerEvent | KeyboardEvent) => void } | null>(
    null
  );
  const [editingDrafts, setEditingDrafts] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const contextMenu = useUIV2ContextMenu();
  const inlineForm = useUIV2InlineForm();
  const linking = useUIV2Linking();
  const { selection, hover } = useUIV2Selection();
  const {
    openContext,
    closeContext,
    openForm,
    closeForm,
    setSelection,
    setHover,
    startLinking,
    addPending,
    finishLinking,
    cancelLinking,
  } = useUIV2Actions();

  const {
    entities,
    pagesMeta,
    pageOcr,
    projectId,
    addToast,
    fetchEntities,
    fetchLinks,
    pushHistory,
    deleteEntity,
    selectedEntityId,
    setSelectedEntityId,
    links,
    layers,
  } = useProjectStore((state: any) => ({
    entities: state.entities as Entity[],
    pagesMeta: state.pagesMeta,
    pageOcr: state.pageOcr,
    projectId: state.projectId,
    addToast: state.addToast,
    fetchEntities: state.fetchEntities,
    fetchLinks: state.fetchLinks,
    pushHistory: state.pushHistory,
    deleteEntity: state.deleteEntity,
    selectedEntityId: state.selectedEntityId,
    setSelectedEntityId: state.setSelectedEntityId,
    links: state.links,
    layers: state.layers,
  }));

  const pageEntities = useMemo<DisplayEntity[]>(() => {
    const sheetNumber = pageIndex + 1;
    const meta = pagesMeta?.[pageIndex];
    const ocr = pageOcr?.[pageIndex];
    const pageWidthPts = meta?.pageWidthPts || ocr?.width_pts;
    const pageHeightPts = meta?.pageHeightPts || ocr?.height_pts;
    if (!meta || !pageWidthPts || !pageHeightPts) return [];
    const filtered = entities.filter((ent) => {
      if (ent.source_sheet_number !== sheetNumber) return false;
      if (!layers) return true;
      switch (ent.entity_type) {
        case 'drawing':
          return layers.drawings !== false;
        case 'legend':
          return layers.legends !== false;
        case 'schedule':
          return layers.schedules !== false;
        case 'note':
          return layers.notes !== false;
        case 'symbol_definition':
        case 'symbol_instance':
          return layers.symbols !== false;
        case 'component_definition':
        case 'component_instance':
          return layers.components !== false;
        case 'scope':
          return layers.scopes !== false;
        default:
          return true;
      }
    });
    return filtered
      .map((entity) => ({
        entity,
        tagType: entityTypeMap[entity.entity_type],
        bboxPx: pdfBoxToDisplay(
          [entity.bounding_box.x1, entity.bounding_box.y1, entity.bounding_box.x2, entity.bounding_box.y2],
          { pageWidthPts, pageHeightPts, nativeWidth: meta.nativeWidth, nativeHeight: meta.nativeHeight },
          scale
        ),
        isIncomplete: isIncomplete(entity as any),
      }))
      .sort((a, b) => a.entity.created_at - b.entity.created_at);
  }, [entities, pageIndex, pageOcr, pagesMeta, scale]);

  const entityMeta = useMemo(() => {
    const map = new Map<string, Entity>();
    entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const symbolDefinitionOptions = useMemo(() => {
    return entities
      .filter((entity) => entity.entity_type === 'symbol_definition')
      .map((entity) => ({
        label: (entity as any).name || `Definition ${entity.id.slice(0, 4).toUpperCase()}`,
        value: entity.id,
      }));
  }, [entities]);

  useEffect(() => {
    if (selection.length === 1) {
      const targetId = selection[0].id;
      if (selectedEntityId !== targetId) {
        setSelectedEntityId(targetId);
      }
    } else if (selection.length === 0 && selectedEntityId) {
      setSelectedEntityId(null);
    }
  }, [selection, selectedEntityId, setSelectedEntityId]);

  useEffect(() => {
    if (!selectedEntityId) {
      if (selection.length > 0) {
        setSelection([]);
      }
      return;
    }
    const exists = selection.some((item) => item.id === selectedEntityId);
    if (!exists) {
      const entity = entityMeta.get(selectedEntityId);
      if (entity) {
        setSelection([
          {
            id: entity.id,
            type: entityTypeMap[entity.entity_type],
            sheetId: String(entity.source_sheet_number),
          },
        ]);
      }
    }
  }, [entityMeta, selectedEntityId, selection, setSelection]);

  const formatChipLabel = useCallback(
    (selection: Selection) => {
      const entity = entityMeta.get(selection.id);
      const labelCandidates = [
        (entity as any)?.title,
        (entity as any)?.name,
        (entity as any)?.text,
        (entity as any)?.description,
      ];
      const label = labelCandidates.find((value) => typeof value === 'string' && value.trim().length > 0);
      if (typeof label === 'string') {
        return label.trim();
      }
      return `${selection.type} ${selection.id.slice(0, 4).toUpperCase()}`;
    },
    [entityMeta]
  );

  const openPropertiesForm = useCallback(
    (entity: Entity) => {
      cancelEditSession();
      const formType = formTypeByEntity[entity.entity_type];
      if (!formType) {
        addToast({ kind: 'warning', message: 'Editing not yet supported for this entity type' });
        return;
      }
      const initialValues: Record<string, any> = {};
      if (entity.entity_type === 'drawing') {
        initialValues.title = (entity as any).title ?? '';
        initialValues.description = (entity as any).description ?? '';
      } else if (entity.entity_type === 'scope') {
        initialValues.name = (entity as any).name ?? '';
        initialValues.description = (entity as any).description ?? '';
      } else if (entity.entity_type === 'note') {
        initialValues.text = (entity as any).text ?? '';
      }
      const formAt = contextMenu.at ?? { x: 0, y: 0 };
      openForm({
        type: formType,
        entityId: entity.id,
        at: formAt,
        pendingBBox: undefined,
        initialValues,
        mode: 'edit',
      });
    },
    [addToast, cancelEditSession, contextMenu.at, openForm]
  );

  const duplicateEntity = useCallback(
    async (entity: Entity) => {
      if (!projectId) {
        addToast({ kind: 'error', message: 'No project loaded' });
        return;
      }
      const meta = pagesMeta?.[pageIndex];
      const ocr = pageOcr?.[pageIndex];
      const pageWidthPts = meta?.pageWidthPts || ocr?.width_pts;
      const pageHeightPts = meta?.pageHeightPts || ocr?.height_pts;
      if (!meta || !pageWidthPts || !pageHeightPts) {
        addToast({ kind: 'error', message: 'Missing page metadata for duplication' });
        return;
      }
      const SUPPORTED: Entity['entity_type'][] = ['drawing', 'scope', 'note'];
      if (!SUPPORTED.includes(entity.entity_type)) {
        addToast({ kind: 'warning', message: 'Duplicate is not yet supported for this entity type' });
        return;
      }

      const offset = Math.min(48, Math.max(16, Math.floor(pageWidthPts * 0.02)));
      const width = entity.bounding_box.x2 - entity.bounding_box.x1;
      const height = entity.bounding_box.y2 - entity.bounding_box.y1;
      let nx1 = entity.bounding_box.x1 + offset;
      let ny1 = entity.bounding_box.y1 + offset;
      let nx2 = nx1 + width;
      let ny2 = ny1 + height;
      if (nx2 > pageWidthPts) {
        const delta = nx2 - pageWidthPts;
        nx1 = Math.max(0, nx1 - delta);
        nx2 = nx1 + width;
      }
      if (ny2 > pageHeightPts) {
        const delta = ny2 - pageHeightPts;
        ny1 = Math.max(0, ny1 - delta);
        ny2 = ny1 + height;
      }

      const payload: Record<string, any> = {
        entity_type: entity.entity_type,
        source_sheet_number: entity.source_sheet_number,
        bounding_box: [nx1, ny1, nx2, ny2],
      };
      if (entity.entity_type === 'drawing') {
        payload.title = (entity as any).title ?? '';
        payload.description = (entity as any).description ?? '';
      } else if (entity.entity_type === 'scope') {
        payload.name = (entity as any).name ?? '';
        payload.description = (entity as any).description ?? '';
      } else if (entity.entity_type === 'note') {
        payload.text = (entity as any).text ?? '';
      }

      Object.assign(payload, deriveEntityFlags(entity.entity_type, payload));

      try {
        const created = await createEntity(projectId, payload as any);
        await fetchEntities();
        setSelection([
          {
            id: created.id,
            type: entityTypeMap[created.entity_type],
            sheetId: String(created.source_sheet_number),
          },
        ]);
        try {
          pushHistory({ type: 'create_entity', entity: created });
        } catch (error) {
          console.warn('history push failed', error);
        }
        addToast({ kind: 'success', message: 'Entity duplicated' });
      } catch (error: any) {
        console.error(error);
        addToast({ kind: 'error', message: error?.message || 'Failed to duplicate entity' });
      }
    },
    [addToast, fetchEntities, pageIndex, pageOcr, pagesMeta, projectId, pushHistory, setSelection]
  );

  const cancelEditSession = useCallback(() => {
    const listeners = editingListenersRef.current;
    if (listeners) {
      window.removeEventListener('pointermove', listeners.move);
      window.removeEventListener('pointerup', listeners.up);
      editingListenersRef.current = null;
    }
    const session = editSessionRef.current;
    if (session) {
      editSessionRef.current = null;
      setEditingDrafts((prev) => {
        if (!prev[session.id]) return prev;
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
    }
  }, []);

  const beginEditSession = useCallback(
    (
      entity: Entity,
      startRect: { x: number; y: number; width: number; height: number },
      mode: 'move' | 'resize',
      pointerEvent: PointerEvent,
      handle?: ResizeHandle
    ) => {
      if (!projectId) return;
      cancelEditSession();

      const session = {
        id: entity.id,
        mode,
        handle,
        startPointer: { x: pointerEvent.clientX, y: pointerEvent.clientY },
        startRect,
        currentRect: startRect,
      } as {
        id: string;
        mode: 'move' | 'resize';
        handle?: ResizeHandle;
        startPointer: { x: number; y: number };
        startRect: { x: number; y: number; width: number; height: number };
        currentRect: { x: number; y: number; width: number; height: number };
      };

      editSessionRef.current = session;
      setEditingDrafts((prev) => ({ ...prev, [session.id]: startRect }));

      const moveListener = (event: PointerEvent) => {
        event.preventDefault();
        const active = editSessionRef.current;
        if (!active) return;
        const deltaX = event.clientX - active.startPointer.x;
        const deltaY = event.clientY - active.startPointer.y;
        let nextRect: { x: number; y: number; width: number; height: number };
        if (active.mode === 'move') {
          nextRect = {
            x: active.startRect.x + deltaX,
            y: active.startRect.y + deltaY,
            width: active.startRect.width,
            height: active.startRect.height,
          };
        } else if (active.handle) {
          nextRect = computeResizeRect(active.startRect, active.handle, deltaX, deltaY);
        } else {
          nextRect = active.startRect;
        }
        active.currentRect = nextRect;
        setEditingDrafts((prev) => ({ ...prev, [active.id]: nextRect }));
      };

      const upListener = async (event: PointerEvent | KeyboardEvent) => {
        window.removeEventListener('pointermove', moveListener);
        window.removeEventListener('pointerup', upListener);
        editingListenersRef.current = null;
        const active = editSessionRef.current;
        if (!active) return;
        editSessionRef.current = null;
        setEditingDrafts((prev) => {
          if (!prev[active.id]) return prev;
          const next = { ...prev };
          delete next[active.id];
          return next;
        });

        const beforeRect = active.startRect;
        const finalRect = active.currentRect;
        const deltaTotal =
          Math.abs(finalRect.x - beforeRect.x) +
          Math.abs(finalRect.y - beforeRect.y) +
          Math.abs(finalRect.width - beforeRect.width) +
          Math.abs(finalRect.height - beforeRect.height);
        if (deltaTotal < 0.5) return;

        const meta = pagesMeta?.[pageIndex];
        const ocr = pageOcr?.[pageIndex];
        const pageWidthPts = meta?.pageWidthPts || ocr?.width_pts;
        const pageHeightPts = meta?.pageHeightPts || ocr?.height_pts;
        if (!meta || !pageWidthPts || !pageHeightPts) {
          addToast({ kind: 'error', message: 'Missing page metadata for edit' });
          return;
        }

        const toPdf = (rect: { x: number; y: number; width: number; height: number }): PdfBBox => {
          const rasterX1 = rect.x / scale;
          const rasterY1 = rect.y / scale;
          const rasterX2 = (rect.x + rect.width) / scale;
          const rasterY2 = (rect.y + rect.height) / scale;
          const pdfX1 = (rasterX1 / meta.nativeWidth) * pageWidthPts;
          const pdfY1 = (rasterY1 / meta.nativeHeight) * pageHeightPts;
          const pdfX2 = (rasterX2 / meta.nativeWidth) * pageWidthPts;
          const pdfY2 = (rasterY2 / meta.nativeHeight) * pageHeightPts;
          return [pdfX1, pdfY1, pdfX2, pdfY2];
        };

        const before = toPdf(beforeRect);
        const after = toPdf(finalRect);

        try {
          await patchEntity(projectId, active.id, { bounding_box: after });
          await fetchEntities();
          try {
            pushHistory({ type: 'edit_entity', id: active.id, before: { bounding_box: before }, after: { bounding_box: after } });
          } catch (error) {
            console.warn('history push failed', error);
          }
          addToast({ kind: 'success', message: 'Bounding box updated' });
          const updated = entityMeta.get(active.id) ?? entity;
          setSelection([
            {
              id: active.id,
              type: entityTypeMap[updated.entity_type],
              sheetId: String(updated.source_sheet_number),
            },
          ]);
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to update bounding box' });
        }
      };

      editingListenersRef.current = { move: moveListener, up: upListener };
      window.addEventListener('pointermove', moveListener);
      window.addEventListener('pointerup', upListener);
    },
    [
      addToast,
      cancelEditSession,
      entityMeta,
      fetchEntities,
      pageIndex,
      pageOcr,
      pagesMeta,
      projectId,
      pushHistory,
      scale,
      setSelection,
    ]
  );

  const cancelDraftRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const commitDraftRect = (rect: { x: number; y: number; width: number; height: number }) => {
    pendingDraftRef.current = rect;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const draftEl = draftBoxRef.current;
      const data = pendingDraftRef.current;
      if (!draftEl || !data) return;
      draftEl.style.left = `${data.x}px`;
      draftEl.style.top = `${data.y}px`;
      draftEl.style.width = `${data.width}px`;
      draftEl.style.height = `${data.height}px`;
    });
  };

  useEffect(() => () => cancelDraftRaf(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editSessionRef.current) {
        event.preventDefault();
        cancelEditSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelEditSession]);

  useEffect(() => () => cancelEditSession(), [cancelEditSession]);
  useEffect(() => () => setHover(undefined), [setHover]);

  const computeContextPosition = useCallback(
    (point: { x: number; y: number }) => {
      const overlay = overlayRef.current;
      const rect = overlay?.getBoundingClientRect();
      if (!overlay || !rect) return point;
      const PADDING = 12;
      const CARD_WIDTH = 320;
      const CARD_HEIGHT = 306;
      const maxX = Math.max(PADDING, rect.width - CARD_WIDTH - PADDING);
      const maxY = Math.max(PADDING, rect.height - CARD_HEIGHT - PADDING);
      return {
        x: Math.min(Math.max(point.x, PADDING), maxX),
        y: Math.min(Math.max(point.y, PADDING), maxY),
      };
    },
    []
  );

  const makeSelection = useCallback(
    (item: DisplayEntity) => ({
      id: item.entity.id,
      type: item.tagType,
      sheetId: String(item.entity.source_sheet_number),
    }),
    []
  );

  const handleEntityClick = useCallback(
    (event: MouseEvent<HTMLDivElement>, item: DisplayEntity) => {
      event.stopPropagation();
      if (linking.active) {
        const target = makeSelection(item);
        if (linking.source && target.id === linking.source.id) {
          return;
        }
        const exists = selection.some((sel) => sel.id === target.id);
        addPending(target);
        if (exists) {
          setSelection(selection.filter((sel) => sel.id !== target.id));
        } else {
          const base = linking.source ? [linking.source, ...linking.pending] : [...linking.pending];
          const nextMap = new Map<string, Selection>();
          [...base, target].forEach((sel) => {
            if (sel) nextMap.set(sel.id, sel);
          });
          setSelection(Array.from(nextMap.values()));
        }
        return;
      }
      const allowMulti = event.shiftKey || event.metaKey || event.ctrlKey;
      const target = makeSelection(item);
      if (!allowMulti) {
        setSelection([target]);
        return;
      }
      const exists = selection.some((sel) => sel.id === target.id);
      const next = exists ? selection.filter((sel) => sel.id !== target.id) : [...selection, target];
      setSelection(next);
    },
    [addPending, linking.active, linking.pending, linking.source, makeSelection, selection, setSelection]
  );

  const handleMouseEnter = useCallback(
    (item: DisplayEntity) => {
      setHover(makeSelection(item));
    },
    [makeSelection, setHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHover(undefined);
  }, [setHover]);

  const handleMenuAction = useCallback(
    async (action: string) => {
      const targetSelection = contextMenu.target;
      if (!targetSelection) return;
      const entity = entityMeta.get(targetSelection.id);
      if (!entity) {
        addToast({ kind: 'error', message: 'Entity not found' });
        return;
      }

      if (action === 'edit-bbox') {
        addToast({ kind: 'info', message: 'Drag the bounding box handles to adjust the selection.' });
        return;
      }

      if (action === 'edit-properties') {
        openPropertiesForm(entity);
        return;
      }

      if (action === 'duplicate') {
        await duplicateEntity(entity);
        return;
      }

      if (action === 'delete') {
        if (!projectId) {
          addToast({ kind: 'error', message: 'No project loaded' });
          return;
        }
        try {
          cancelEditSession();
          await deleteEntity(entity.id);
          setSelection(selection.filter((sel) => sel.id !== entity.id));
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to delete entity' });
        }
        return;
      }

      if (action === 'link') {
        const { target } = contextMenu;
        if (!target) return;
        if (target.type !== 'Scope') {
          addToast({ kind: 'warning', message: 'Linking is currently available for scopes only' });
          closeContext();
          return;
        }
        const existing = (links || [])
          .filter((linkObj: any) => linkObj.rel_type === 'JUSTIFIED_BY' && linkObj.source_id === entity.id)
          .map((linkObj: any) => entityMeta.get(linkObj.target_id))
          .filter((linkedEntity): linkedEntity is Entity => Boolean(linkedEntity))
          .map((linkedEntity) => ({
            id: linkedEntity.id,
            type: entityTypeMap[linkedEntity.entity_type],
            sheetId: String(linkedEntity.source_sheet_number),
          }));
        startLinking(target, existing);
        setSelection([target, ...existing]);
        closeContext();
      }
    },
    [
      addToast,
      cancelEditSession,
      closeContext,
      contextMenu,
      deleteEntity,
      duplicateEntity,
      entityMeta,
      links,
      openPropertiesForm,
      projectId,
      selection,
      setSelection,
      startLinking,
    ]
  );

  const startMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, item: DisplayEntity) => {
      if (event.button !== 0) return;
      if (linking.active) return;
      if (selection.length !== 1 || selection[0].id !== item.entity.id) return;
      const native = event.nativeEvent;
      event.preventDefault();
      event.stopPropagation();
      const startRect = editingDrafts[item.entity.id] ?? item.bboxPx;
      beginEditSession(item.entity, startRect, 'move', native);
    },
    [beginEditSession, editingDrafts, linking.active, selection]
  );

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, item: DisplayEntity, handle: ResizeHandle) => {
      if (event.button !== 0) return;
      if (linking.active) return;
      if (selection.length !== 1 || selection[0].id !== item.entity.id) return;
      const native = event.nativeEvent;
      event.preventDefault();
      event.stopPropagation();
      const startRect = editingDrafts[item.entity.id] ?? item.bboxPx;
      beginEditSession(item.entity, startRect, 'resize', native, handle);
    },
    [beginEditSession, editingDrafts, linking.active, selection]
  );

  const linkingChips = useMemo(() => {
    if (!linking.active) return [] as { id: string; label: string; type: string }[];
    const chips: { id: string; label: string; type: string }[] = [];
    if (linking.source) {
      chips.push({ id: linking.source.id, label: formatChipLabel(linking.source), type: linking.source.type });
    }
    linking.pending.forEach((sel) => {
      chips.push({ id: sel.id, label: formatChipLabel(sel), type: sel.type });
    });
    return chips;
  }, [formatChipLabel, linking.active, linking.pending, linking.source]);

  const handleRemoveChip = useCallback(
    (id: string) => {
      if (linking.source && linking.source.id === id) {
        cancelLinking();
        return;
      }
      const match = linking.pending.find((sel) => sel.id === id);
      if (match) {
        addPending(match);
      }
    },
    [addPending, cancelLinking, linking.pending, linking.source]
  );

  const handleFinishLinking = useCallback(async () => {
    if (!projectId) {
      addToast({ kind: 'error', message: 'No project loaded' });
      cancelLinking();
      return;
    }
    const { source, pending } = finishLinking();
    if (!source) {
      addToast({ kind: 'error', message: 'Select an entity to link from' });
      return;
    }
    if (!pending.length) {
      addToast({ kind: 'error', message: 'Add at least one entity to link' });
      return;
    }

    if (source.type !== 'Scope') {
      addToast({ kind: 'warning', message: 'Linking is currently available for scopes only' });
      return;
    }

    try {
      await Promise.all(
        pending.map((sel) =>
          apiCreateLink(projectId, {
            rel_type: 'JUSTIFIED_BY',
            source_id: source.id,
            target_id: sel.id,
          })
        )
      );
      await fetchLinks();
      addToast({ kind: 'success', message: 'Links created' });
      setSelection([source, ...pending]);
    } catch (error: any) {
      console.error(error);
      addToast({ kind: 'error', message: error?.message || 'Failed to create links' });
    }
  }, [addToast, cancelLinking, fetchLinks, finishLinking, projectId, setSelection]);

  const shouldIgnorePointer = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('[data-ui2-overlay-ignore]') ||
      target.closest('[data-ui2-overlay-floating]')
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldIgnorePointer(event.target)) return;
      if (contextMenu.open || inlineForm.open) {
        closeContext();
        closeForm();
        return;
      }
      if (event.button !== 0) return;
      if ((event.nativeEvent as PointerEvent).pointerType === 'touch') return;
      if (editSessionRef.current) {
        cancelEditSession();
      }
      setHover(undefined);
      const overlay = overlayRef.current;
      const rect = overlay?.getBoundingClientRect();
      if (!overlay || !rect) return;
      try {
        overlay.setPointerCapture(event.pointerId);
      } catch (_) {
        /* ignore */
      }
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      dragOriginRef.current = { x, y };
      pendingBBoxRef.current = null;
      closeContext();
      closeForm();
      setIsDrawing(true);
      commitDraftRect({ x, y, width: 0, height: 0 });
    },
    [cancelEditSession, closeContext, closeForm, contextMenu.open, inlineForm.open, shouldIgnorePointer]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (editSessionRef.current) return;
      const origin = dragOriginRef.current;
      if (!origin) return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const width = x - origin.x;
      const height = y - origin.y;
      commitDraftRect({
        x: Math.min(origin.x, x),
        y: Math.min(origin.y, y),
        width: Math.abs(width),
        height: Math.abs(height),
      });
    },
    []
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (editSessionRef.current) return;
      const origin = dragOriginRef.current;
      if (!origin) return;
      const overlay = overlayRef.current;
      const rect = overlay?.getBoundingClientRect();
      dragOriginRef.current = null;
      cancelDraftRaf();
      pendingDraftRef.current = null;
      setIsDrawing(false);
      try {
        overlay?.releasePointerCapture(event.pointerId);
      } catch (_) {
        /* ignore */
      }
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const width = x - origin.x;
      const height = y - origin.y;
      const draftRect = {
        x: Math.min(origin.x, x),
        y: Math.min(origin.y, y),
        width: Math.abs(width),
        height: Math.abs(height),
      };
      const threshold = 6;
      if (draftRect.width < threshold || draftRect.height < threshold) {
        return;
      }
      const meta = pagesMeta?.[pageIndex];
      const ocr = pageOcr?.[pageIndex];
      const pageWidthPts = meta?.pageWidthPts || ocr?.width_pts;
      const pageHeightPts = meta?.pageHeightPts || ocr?.height_pts;
      if (!meta || !pageWidthPts || !pageHeightPts) return;

      const sheetId = String(pageIndex + 1);
      const toPdf = (coord: { x: number; y: number }): [number, number] => {
        const rasterX = coord.x / scale;
        const rasterY = coord.y / scale;
        const pdfX = (rasterX / meta.nativeWidth) * pageWidthPts;
        const pdfY = (rasterY / meta.nativeHeight) * pageHeightPts;
        return [pdfX, pdfY];
      };

      const [px1, py1] = toPdf({ x: draftRect.x, y: draftRect.y });
      const [px2, py2] = toPdf({ x: draftRect.x + draftRect.width, y: draftRect.y + draftRect.height });
      const bboxPdf: PdfBBox = [Math.min(px1, px2), Math.min(py1, py2), Math.max(px1, px2), Math.max(py1, py2)];

      pendingBBoxRef.current = { sheetId, bboxPdf };
      const pointerAt = computeContextPosition({ x, y });
      openContext({ at: pointerAt, pendingBBox: { sheetId, bboxPdf } });
    },
    [computeContextPosition, openContext, pageIndex, pageOcr, pagesMeta, scale]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = pageEntities.find((item) => {
        return (
          x >= item.bboxPx.x &&
          y >= item.bboxPx.y &&
          x <= item.bboxPx.x + item.bboxPx.width &&
          y <= item.bboxPx.y + item.bboxPx.height
        );
      });
      const pointerAt = computeContextPosition({ x, y });
      if (!hit) {
        openContext({ at: pointerAt });
        return;
      }
      const target = makeSelection(hit);
      const multi = event.shiftKey || event.metaKey || event.ctrlKey;
      if (!multi) {
        setSelection([target]);
      } else {
        const exists = selection.some((sel) => sel.id === target.id);
        const next = exists ? selection.filter((sel) => sel.id !== target.id) : [...selection, target];
        setSelection(next);
      }
      openContext({ at: pointerAt, target });
    },
    [computeContextPosition, makeSelection, openContext, pageEntities, selection, setSelection]
  );

  const handleContextSelect = useCallback(
    async (entityType: string) => {
      const pending = pendingBBoxRef.current || inlineForm.pendingBBox;
      const openVariant = () => {
        if (!pending) return;
        let type: 'Drawing' | 'SymbolInst' | 'Scope' | 'Note' | null = null;
        if (entityType === 'Symbol Instance') type = 'SymbolInst';
        else if (entityType === 'Drawing') type = 'Drawing';
        else if (entityType === 'Scope') type = 'Scope';
        else if (entityType === 'Note') type = 'Note';
        if (!type) return;
        openForm({ type, at: contextMenu.at ?? { x: 0, y: 0 }, pendingBBox: pending });
      };
      openVariant();
    },
    [contextMenu.at, inlineForm.pendingBBox, openForm]
  );

  const handleFormSave = useCallback(
    async (formData: Record<string, any>) => {
      const isEditMode = inlineForm.mode === 'edit' && inlineForm.entityId;
      if (isEditMode) {
        if (!projectId) {
          closeForm();
          return;
        }
        const entity = inlineForm.entityId ? entityMeta.get(inlineForm.entityId) : null;
        if (!entity) {
          addToast({ kind: 'error', message: 'Unable to locate entity' });
          closeForm();
          return;
        }
        const patch: Record<string, any> = {};
        if (inlineForm.type === 'Drawing') {
          patch.title = formData.title ?? (entity as any).title ?? '';
          patch.description = formData.description ?? (entity as any).description ?? '';
        } else if (inlineForm.type === 'Scope') {
          patch.name = formData.name ?? (entity as any).name ?? '';
          patch.description = formData.description ?? (entity as any).description ?? '';
        } else if (inlineForm.type === 'Note') {
          patch.text = formData.text ?? (entity as any).text ?? '';
        } else {
          addToast({ kind: 'warning', message: 'Editing is not implemented for this entity type yet' });
          closeForm();
          return;
        }
        const before: Record<string, any> = {};
        Object.keys(patch).forEach((key) => {
          before[key] = (entity as any)[key];
        });
        const attrSource = { ...entity, ...patch };
        Object.assign(patch, deriveEntityFlags(entity.entity_type, attrSource));
        try {
          await patchEntity(projectId, entity.id, patch);
          await fetchEntities();
          setSelection([
            {
              id: entity.id,
              type: entityTypeMap[entity.entity_type],
              sheetId: String(entity.source_sheet_number),
            },
          ]);
          addToast({ kind: 'success', message: 'Entity updated' });
          try {
            const after = { ...patch };
            pushHistory({ type: 'edit_entity', id: entity.id, before, after });
          } catch (error) {
            console.warn('history push failed', error);
          }
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to update entity' });
        }
        closeForm();
        return;
      }

      const pending = inlineForm.pendingBBox || pendingBBoxRef.current;
      if (!pending) {
        closeForm();
        return;
      }
      if (!projectId) {
        closeForm();
        return;
      }

      const sheetNumber = Number.parseInt(pending.sheetId, 10);
      if (!Number.isFinite(sheetNumber)) {
        addToast({ kind: 'error', message: 'Missing sheet number for new entity' });
        closeForm();
        return;
      }
      if (inlineForm.type === 'Drawing') {
        const payload: any = {
          entity_type: 'drawing',
          source_sheet_number: sheetNumber,
          bounding_box: pending.bboxPdf,
          title: formData.title ?? '',
          description: formData.description ?? '',
        };
        Object.assign(payload, deriveEntityFlags('drawing', payload));
        try {
          const created = await createEntity(projectId, payload);
          await fetchEntities();
          setSelection([
            {
              id: created.id,
              type: 'Drawing',
              sheetId: pending.sheetId,
            },
          ]);
          try {
            pushHistory({ type: 'create_entity', entity: created });
          } catch (e) {
            console.warn('history push failed', e);
          }
          addToast({ kind: 'success', message: 'Drawing created' });
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to create drawing' });
        }
      } else if (inlineForm.type === 'SymbolInst') {
        const symbolDefinitionId = typeof formData.symbolDefinitionId === 'string' ? formData.symbolDefinitionId : '';
        if (!symbolDefinitionId) {
          addToast({ kind: 'error', message: 'Select a visual definition before saving' });
          return;
        }
        const payload: any = {
          entity_type: 'symbol_instance',
          source_sheet_number: sheetNumber,
          bounding_box: pending.bboxPdf,
          symbol_definition_id: symbolDefinitionId,
        };
        if (typeof formData.recognizedText === 'string' && formData.recognizedText.trim().length > 0) {
          payload.recognized_text = formData.recognizedText.trim();
        }
        Object.assign(payload, deriveEntityFlags('symbol_instance', payload));
        try {
          const created = await createEntity(projectId, payload);
          await fetchEntities();
          setSelection([
            {
              id: created.id,
              type: 'SymbolInst',
              sheetId: pending.sheetId,
            },
          ]);
          try {
            pushHistory({ type: 'create_entity', entity: created });
          } catch (e) {
            console.warn('history push failed', e);
          }
          addToast({ kind: 'success', message: 'Symbol instance created' });
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to create symbol instance' });
        }
      } else if (inlineForm.type === 'Scope') {
        const payload: any = {
          entity_type: 'scope',
          source_sheet_number: sheetNumber,
          bounding_box: pending.bboxPdf,
          name: formData.name ?? '',
          description: formData.description ?? '',
        };
        Object.assign(payload, deriveEntityFlags('scope', payload));
        try {
          const created = await createEntity(projectId, payload);
          await fetchEntities();
          setSelection([
            {
              id: created.id,
              type: 'Scope',
              sheetId: pending.sheetId,
            },
          ]);
          try {
            pushHistory({ type: 'create_entity', entity: created });
          } catch (e) {
            console.warn('history push failed', e);
          }
          addToast({ kind: 'success', message: 'Scope created' });
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to create scope' });
        }
      } else if (inlineForm.type === 'Note') {
        const payload: any = {
          entity_type: 'note',
          source_sheet_number: sheetNumber,
          bounding_box: pending.bboxPdf,
          text: formData.text ?? '',
        };
        Object.assign(payload, deriveEntityFlags('note', payload));
        try {
          const created = await createEntity(projectId, payload);
          await fetchEntities();
          setSelection([
            {
              id: created.id,
              type: 'Note',
              sheetId: pending.sheetId,
            },
          ]);
          try {
            pushHistory({ type: 'create_entity', entity: created });
          } catch (e) {
            console.warn('history push failed', e);
          }
          addToast({ kind: 'success', message: 'Note created' });
        } catch (error: any) {
          console.error(error);
          addToast({ kind: 'error', message: error?.message || 'Failed to create note' });
        }
      }

      pendingBBoxRef.current = null;
      closeForm();
      closeContext();
    },
    [
      addToast,
      closeContext,
      closeForm,
      entityMeta,
      fetchEntities,
      inlineForm.entityId,
      inlineForm.mode,
      inlineForm.pendingBBox,
      inlineForm.type,
      projectId,
      pushHistory,
      setSelection,
    ]
  );

  const renderVariant = (item: DisplayEntity): BBoxVariant => {
    const isSelected = selection.some((sel) => sel.id === item.entity.id);
    const isHovered = hover && hover.id === item.entity.id;
    if (isSelected) return 'selected';
    if (isHovered) return 'hover';
    if (item.isIncomplete) return 'incomplete';
    return 'normal';
  };

  return (
    <div
      ref={overlayRef}
      className="tg-ui2"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {pageEntities.map((item) => (
        <div key={item.entity.id} data-ui2-overlay-ignore>
          {(() => {
            const draftRect = editingDrafts[item.entity.id];
            const bbox = draftRect ?? item.bboxPx;
            const isSelected = selection.some((sel) => sel.id === item.entity.id);
            return (
              <BBox
                variant={renderVariant({ ...item, bboxPx: bbox })}
                x={bbox.x}
                y={bbox.y}
                width={bbox.width}
                height={bbox.height}
                onClick={(event) => handleEntityClick(event, item)}
                onPointerDown={(event) => startMove(event, item)}
                onMouseEnter={() => handleMouseEnter(item)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: isSelected ? 'move' : 'pointer' }}
              >
                <div style={{ position: 'absolute', top: -28, left: 0 }}>
                  <EntityTag type={item.tagType} id={item.entity.id.slice(0, 4).toUpperCase()} incomplete={item.isIncomplete} />
                </div>
                {selection.length === 1 && selection[0].id === item.entity.id ? (
                  <>
                    {(['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'] as ResizeHandle[]).map((handle) => {
                    const style: CSSProperties = {
                        position: 'absolute',
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        backgroundColor: 'var(--tg-selection)',
                        border: '2px solid #ffffff',
                        borderRadius: '50%',
                        cursor: HANDLE_CURSOR[handle],
                        pointerEvents: 'auto',
                      };
                      if (handle.includes('t')) style.top = -HANDLE_OFFSET;
                      else if (handle.includes('b')) style.bottom = -HANDLE_OFFSET;
                      else {
                        style.top = '50%';
                        style.transform = 'translateY(-50%)';
                      }

                      if (handle.includes('l')) style.left = -HANDLE_OFFSET;
                      else if (handle.includes('r')) style.right = -HANDLE_OFFSET;
                      else {
                        style.left = '50%';
                        style.transform = style.transform
                          ? `${style.transform} translateX(-50%)`
                          : 'translateX(-50%)';
                      }

                      return (
                        <div
                          key={handle}
                          onPointerDown={(event) => startResize(event, item, handle)}
                          style={style}
                        />
                      );
                    })}
                  </>
                ) : null}
              </BBox>
            );
          })()}
        </div>
      ))}

      {isDrawing ? (
        <div
          ref={draftBoxRef}
          className="tg-ui2"
          style={{
            position: 'absolute',
            border: '2px solid var(--tg-selection)',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      <ContextPicker
        open={contextMenu.open && !contextMenu.target}
        x={contextMenu.at?.x}
        y={contextMenu.at?.y}
        onSelect={handleContextSelect}
        onClose={closeContext}
      />

      <EntityMenu
        open={contextMenu.open && Boolean(contextMenu.target)}
        kind={contextMenu.target?.type ?? 'SymbolInst'}
        x={contextMenu.at?.x}
        y={contextMenu.at?.y}
        onAction={handleMenuAction}
        onClose={closeContext}
      />

      <InlineEntityForm
        open={inlineForm.open}
        variant={
          inlineForm.type === 'SymbolInst'
            ? 'SymbolInstanceForm'
            : inlineForm.type === 'Scope'
            ? 'ScopeForm'
            : inlineForm.type === 'Note'
            ? 'NoteForm'
            : 'DrawingForm'
        }
        x={inlineForm.at?.x ?? contextMenu.at?.x ?? 0}
        y={inlineForm.at?.y ?? contextMenu.at?.y ?? 0}
        onSave={handleFormSave}
        onCancel={closeForm}
        onCreateFromOCR={() => {
          // TODO: Wire OCR picker
        }}
        initialValues={inlineForm.initialValues ?? null}
        mode={inlineForm.mode ?? 'create'}
        symbolDefinitionOptions={symbolDefinitionOptions}
      />

      <ChipsTray
        open={linking.active}
        chips={linkingChips}
        onRemoveChip={handleRemoveChip}
        onFinish={handleFinishLinking}
        onCancel={cancelLinking}
      />

      <OCRPicker open={false} />
    </div>
  );
}
