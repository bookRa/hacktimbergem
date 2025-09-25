import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BBox, BBoxVariant } from './canvas/BBox';
import { EntityTag, EntityType as TagEntityType } from './canvas/EntityTag';
import { ContextPicker } from './menus/ContextPicker';
import { EntityMenu } from './menus/EntityMenu';
import { InlineEntityForm } from './forms/InlineEntityForm';
import { ChipsTray } from './linking/ChipsTray';
import { OCRPicker } from './overlays/OCRPicker';
import '../ui_v2/theme/tokens.css';
import { useUIV2Actions, useUIV2ContextMenu, useUIV2InlineForm, useUIV2Linking, useUIV2Selection } from '../state/ui_v2';
import { useProjectStore } from '../state/store';
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
  } = useUIV2Actions();

  const { entities, pagesMeta, pageOcr } = useProjectStore((state: any) => ({
    entities: state.entities as Entity[],
    pagesMeta: state.pagesMeta,
    pageOcr: state.pageOcr,
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
      const target = {
        id: hit.entity.id,
        type: hit.tagType,
        sheetId: String(hit.entity.source_sheet_number),
      } as const;
      openContext({ at: pointerAt, target });
    },
    [computeContextPosition, openContext, pageEntities]
  );

  const handleContextSelect = useCallback(
    async (entityType: string) => {
      const pending = pendingBBoxRef.current || inlineForm.pendingBBox;
      const openVariant = () => {
        if (!pending) return;
        let type: 'Drawing' | 'SymbolInst' | 'Scope' | null = null;
        if (entityType === 'Symbol Instance') type = 'SymbolInst';
        else if (entityType === 'Drawing') type = 'Drawing';
        else if (entityType === 'Scope') type = 'Scope';
        if (!type) return;
        openForm({ type, at: contextMenu.at ?? { x: 0, y: 0 }, pendingBBox: pending });
      };
      openVariant();
    },
    [contextMenu.at, inlineForm.pendingBBox, openForm]
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
        <BBox
          key={item.entity.id}
          variant={renderVariant(item)}
          x={item.bboxPx.x}
          y={item.bboxPx.y}
          width={item.bboxPx.width}
          height={item.bboxPx.height}
        >
          <div style={{ position: 'absolute', top: -28, left: 0 }}>
            <EntityTag type={item.tagType} id={item.entity.id.slice(0, 4).toUpperCase()} incomplete={item.isIncomplete} />
          </div>
        </BBox>
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
          }
        }}
        onClose={closeContext}
      />

      <InlineEntityForm
        open={inlineForm.open}
        variant={inlineForm.type === 'SymbolInst' ? 'SymbolInstanceForm' : inlineForm.type === 'Scope' ? 'ScopeForm' : 'DrawingForm'}
        x={inlineForm.at?.x ?? contextMenu.at?.x ?? 0}
        y={inlineForm.at?.y ?? contextMenu.at?.y ?? 0}
        onSave={(data) => {
          console.log('inline form save', data);
          closeForm();
        }}
        onCancel={closeForm}
        onCreateFromOCR={() => {
          // TODO: Wire OCR picker
        }}
      />

      <ChipsTray open={linking.active} chips={linking.pending.map((sel) => ({ id: sel.id, label: sel.id, type: sel.type }))} />

      <OCRPicker open={false} />
    </div>
  );
}
