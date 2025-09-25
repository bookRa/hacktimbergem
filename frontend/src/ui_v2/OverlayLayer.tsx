import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
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
import { createEntity } from '../api/entities';
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
    startLinking,
    addPending,
    finishLinking,
    cancelLinking,
  } = useUIV2Actions();

  const { entities, pagesMeta, pageOcr, projectId, addToast, fetchEntities, fetchLinks, pushHistory } = useProjectStore((state: any) => ({
    entities: state.entities as Entity[],
    pagesMeta: state.pagesMeta,
    pageOcr: state.pageOcr,
    projectId: state.projectId,
    addToast: state.addToast,
    fetchEntities: state.fetchEntities,
    fetchLinks: state.fetchLinks,
    pushHistory: state.pushHistory,
  }));

  const pageEntities = useMemo<DisplayEntity[]>(() => {
    const sheetNumber = pageIndex + 1;
    const meta = pagesMeta?.[pageIndex];
    const ocr = pageOcr?.[pageIndex];
    const pageWidthPts = meta?.pageWidthPts || ocr?.width_pts;
    const pageHeightPts = meta?.pageHeightPts || ocr?.height_pts;
    if (!meta || !pageWidthPts || !pageHeightPts) return [];
    const filtered = entities.filter((ent) => ent.source_sheet_number === sheetNumber);
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

  const handleEntityMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

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
      setIsDrawing(true);
      commitDraftRect({ x, y, width: 0, height: 0 });
      closeContext();
      closeForm();
    },
    [closeContext, closeForm]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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
    [closeContext, closeForm, computeContextPosition, contextMenu.open, inlineForm.open, openContext, pageIndex, pageOcr, pagesMeta, scale, shouldIgnorePointer]
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
    [addToast, closeContext, closeForm, fetchEntities, inlineForm.pendingBBox, inlineForm.type, projectId, pushHistory, setSelection]
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
          <BBox
            variant={renderVariant(item)}
            x={item.bboxPx.x}
            y={item.bboxPx.y}
            width={item.bboxPx.width}
            height={item.bboxPx.height}
            onClick={(event) => handleEntityClick(event, item)}
            onMouseDown={handleEntityMouseDown}
          >
            <div style={{ position: 'absolute', top: -28, left: 0 }}>
              <EntityTag type={item.tagType} id={item.entity.id.slice(0, 4).toUpperCase()} incomplete={item.isIncomplete} />
            </div>
          </BBox>
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
        onAction={(action) => {
          if (action === 'delete') {
            // TODO: Wire deletion
          } else if (action === 'link' && contextMenu.target) {
            const { target } = contextMenu;
            if (target.type !== 'Scope') {
              addToast({ kind: 'warning', message: 'Linking is currently available for scopes only' });
              closeContext();
              return;
            }
            startLinking(target);
            setSelection([target]);
            closeContext();
          }
        }}
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
