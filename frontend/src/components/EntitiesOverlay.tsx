import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/store';
import { pdfToCanvas } from '../utils/coords';

declare global { interface Window { __TG_DEBUG_OCR_CLICK?: boolean; } }
const dbg = (...args: any[]) => { if (window.__TG_DEBUG_OCR_CLICK) console.log('[OCRClick]', ...args); };

interface Props { pageIndex: number; scale: number; wrapperRef: React.RefObject<HTMLDivElement>; }

// Basic color mapping per entity type
const TYPE_COLORS: Record<string, { stroke: string; fill: string; }> = {
    drawing: { stroke: '#2563eb', fill: 'rgba(37,99,235,0.15)' },
    legend: { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)' },
    schedule: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)' },
    note: { stroke: '#ec4899', fill: 'rgba(236,72,153,0.18)' },
    symbol_definition: { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.18)' },
    component_definition: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.18)' },
    symbol_instance: { stroke: '#f59e0b', fill: 'rgba(242, 242, 6, 0.22)' },
    component_instance: { stroke: '#fb923c', fill: 'rgba(245, 172, 0, 0.31)' }
};

// Z-order: ensure legends/schedules are beneath their definitions so overlapping remains interactable
const TYPE_Z_ORDER: Record<string, number> = {
    legend: 0,
    schedule: 0,
    drawing: 1,
    note: 1,
    symbol_definition: 2,
    component_definition: 2,
    symbol_instance: 3,
    component_instance: 3
};

export const EntitiesOverlay: React.FC<Props> = ({ pageIndex, scale, wrapperRef }) => {
    const { entities, creatingEntity, finalizeEntityCreation, cancelEntityCreation, currentPageIndex, setRightPanelTab, selectedEntityId, setSelectedEntityId, updateEntityBBox, pageOcr, pagesMeta, toggleSelectBlock, addToast, linking, toggleLinkTarget, cancelLinking } = useProjectStore(s => ({
        entities: s.entities,
        creatingEntity: s.creatingEntity,
        finalizeEntityCreation: s.finalizeEntityCreation,
        cancelEntityCreation: s.cancelEntityCreation,
        currentPageIndex: s.currentPageIndex,
        setRightPanelTab: s.setRightPanelTab,
        selectedEntityId: s.selectedEntityId,
        setSelectedEntityId: s.setSelectedEntityId,
        updateEntityBBox: s.updateEntityBBox,
        pageOcr: (s as any).pageOcr,
        pagesMeta: (s as any).pagesMeta,
        toggleSelectBlock: (s as any).toggleSelectBlock,
        addToast: (s as any).addToast,
        linking: (s as any).linking,
        toggleLinkTarget: (s as any).toggleLinkTarget,
        cancelLinking: (s as any).cancelLinking,
    }));
    const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number; } | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const passthroughRef = useRef(false);
    useEffect(() => {
        const handleWinPointerUp = () => {
            if (passthroughRef.current && overlayRef.current) {
                const overlayEl = overlayRef.current;
                // Defer re-enabling pointer events until after the native click has been dispatched
                // to the underlying element. Using a timer avoids re-grabbing the pointerup/click.
                setTimeout(() => {
                    if (overlayRef.current === overlayEl) {
                        overlayEl.style.pointerEvents = 'auto';
                        passthroughRef.current = false;
                    }
                }, 0);
            }
        };
        window.addEventListener('pointerup', handleWinPointerUp, true);
        return () => window.removeEventListener('pointerup', handleWinPointerUp, true);
    }, []);
    const dragRef = useRef<{ sx: number; sy: number; } | null>(null);
    const editRef = useRef<{ mode: 'move' | 'resize'; entityId: string; origin: { x1: number; y1: number; x2: number; y2: number }; start: { x: number; y: number }; handle?: string } | null>(null);
    const [hoverCursor, setHoverCursor] = useState<string | null>(null);
    const [hoverDrawingId, setHoverDrawingId] = useState<string | null>(null);
    const pendingOcrClickRef = useRef<{ startX: number; startY: number; blockIndex: number; additive: boolean } | null>(null);

    useEffect(() => {
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (creatingEntity) { cancelEntityCreation(); setDraft(null); }
                else if (linking) { cancelLinking(); }
            }
        };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [creatingEntity, cancelEntityCreation, linking, cancelLinking]);

    if (pageIndex !== currentPageIndex) return null;

    const pageEntitiesRaw = entities
        .filter((e: any) => e.source_sheet_number === pageIndex + 1)
        .slice()
        .sort((a: any, b: any) => {
            const za = TYPE_Z_ORDER[a.entity_type] ?? 1;
            const zb = TYPE_Z_ORDER[b.entity_type] ?? 1;
            if (za !== zb) return za - zb; // lower z drawn first, higher z on top
            return 0;
        });
    // Convert all entity PDF-space boxes to canvas space for rendering and hit-testing
    const ocr = (pageOcr as any)?.[pageIndex];
    const meta = (pagesMeta as any)?.[pageIndex];
    const renderMeta = ocr && meta ? {
        pageWidthPts: ocr.width_pts,
        pageHeightPts: ocr.height_pts,
        rasterWidthPx: meta.nativeWidth,
        rasterHeightPx: meta.nativeHeight,
        rotation: 0 as 0
    } : null;
    const pageEntities = (renderMeta ? pageEntitiesRaw.map((e: any) => ({
        ...e,
        _canvas_box: pdfToCanvas([e.bounding_box.x1, e.bounding_box.y1, e.bounding_box.x2, e.bounding_box.y2] as any, renderMeta as any)
    })) : pageEntitiesRaw.map((e: any) => ({ ...e, _canvas_box: [e.bounding_box.x1, e.bounding_box.y1, e.bounding_box.x2, e.bounding_box.y2] }))) as any[];

    const linkingActive = !!linking;
    const isAllowedByLinking = (ent: any): boolean => {
        if (!linkingActive) return true;
        if (linking!.relType === 'JUSTIFIED_BY') return ['note', 'symbol_instance', 'component_instance'].includes(ent.entity_type);
        if (linking!.relType === 'DEPICTS') return ent.entity_type === 'drawing';
        if (linking!.relType === 'LOCATED_IN') return ['symbol_instance', 'component_instance'].includes(ent.entity_type);
        return false;
    };

    const hitHandle = (ex: number, ey: number, box: { x1: number; y1: number; x2: number; y2: number }) => {
        const size = 6 / scale;
        const hx = [box.x1, (box.x1 + box.x2) / 2, box.x2];
        const hy = [box.y1, (box.y1 + box.y2) / 2, box.y2];
        const names = ['tl', 'tm', 'tr', 'ml', 'mm', 'mr', 'bl', 'bm', 'br'];
        let idx = 0;
        for (let yi = 0; yi < 3; yi++) {
            for (let xi = 0; xi < 3; xi++) {
                const cx = hx[xi]; const cy = hy[yi];
                if (Math.abs(ex - cx) <= size && Math.abs(ey - cy) <= size) return names[idx];
                idx++;
            }
        }
        return null;
    };

    const TOL_PX = 6; // screen pixels tolerance around bbox edges for easier grabbing
    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        // Linking mode: toggle link targets on click, disable editing/selection
        if (linkingActive && !creatingEntity) {
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
                    if (!isAllowedByLinking(ent)) {
                        e.preventDefault();
                        return;
                    }
                    toggleLinkTarget(ent.id);
                    e.preventDefault();
                    return;
                }
            }
            // If no entity under pointer, ignore
        }
        // Instance stamping: click-to-place with definition-sized bbox (in PDF -> canvas)
        if (creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance')) {
            const defId = creatingEntity.meta?.definitionId as string | undefined;
            const ocr = (pageOcr as any)?.[pageIndex];
            const meta = (pagesMeta as any)?.[pageIndex];
            const scaleX = ocr && meta ? (meta.nativeWidth / ocr.width_pts) : 1;
            const scaleY = ocr && meta ? (meta.nativeHeight / ocr.height_pts) : 1;
            let w = Math.max(8, 16 / (scale || 1));
            let h = Math.max(8, 16 / (scale || 1));
            if (defId) {
                const def = (useProjectStore.getState() as any).entities.find((e: any) => e.id === defId);
                if (def && def.bounding_box) {
                    const dx = Math.max(1, def.bounding_box.x2 - def.bounding_box.x1);
                    const dy = Math.max(1, def.bounding_box.y2 - def.bounding_box.y1);
                    w = dx * scaleX;
                    h = dy * scaleY;
                }
            }
            // Prefer placing inside the drawing under pointer, clamp to fit if possible
            let target: any = null;
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                if (ent.entity_type !== 'drawing') continue;
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) { target = { bx1, by1, bx2, by2 }; break; }
            }
            let x1 = x - w / 2, y1 = y - h / 2, x2 = x + w / 2, y2 = y + h / 2;
            if (target) {
                const maxW = target.bx2 - target.bx1;
                const maxH = target.by2 - target.by1;
                if (w > maxW || h > maxH) {
                    addToast({ kind: 'error', message: 'Definition size exceeds Drawing bounds; adjust definition or use a larger drawing.' });
                    return; // refuse to arm draft; user must adjust
                }
                // Clamp to fit fully inside
                x1 = Math.min(Math.max(x - w / 2, target.bx1), target.bx2 - w);
                y1 = Math.min(Math.max(y - h / 2, target.by1), target.by2 - h);
                x2 = x1 + w; y2 = y1 + h;
            }
            setDraft({ x1, y1, x2, y2 });
            return;
        }
        // Clicking empty space: deselect entity
        if (!creatingEntity && !linkingActive) {
            // Check if hit any entity first; if not, clear selection
            let hitAny = false;
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                const tol = TOL_PX / scale;
                if (x >= (bx1 - tol) && x <= (bx2 + tol) && y >= (by1 - tol) && y <= (by2 + tol)) { hitAny = true; break; }
            }
            if (!hitAny) {
                setSelectedEntityId(null);
            }
        }
        dbg('pointerdown raster coords', { x, y, scale, pageIndex });
        if (creatingEntity) {
            dragRef.current = { sx: x, sy: y };
            setDraft({ x1: x, y1: y, x2: x, y2: y });
            return;
        }
        // selection / edit (disabled in linking mode)
        if (!linkingActive) {
            // iterate topmost first (last draw) so reverse order
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                // Expand test by tolerance converted to PDF space
                const tol = TOL_PX / scale;
                if (x >= (bx1 - tol) && x <= (bx2 + tol) && y >= (by1 - tol) && y <= (by2 + tol)) {
                    const handle = hitHandle(x, y, { x1: bx1, y1: by1, x2: bx2, y2: by2 });
                    // If clicking inside entity (not on handle) and not currently a drag, select & open editor
                    setSelectedEntityId(ent.id);
                    setRightPanelTab('entities');
                    dbg('entity hit', { id: ent.id, handle: handle || 'move' });
                    if (handle && handle !== 'mm') {
                        editRef.current = { mode: 'resize', entityId: ent.id, origin: { x1: bx1, y1: by1, x2: bx2, y2: by2 }, start: { x, y }, handle } as any;
                    } else {
                        editRef.current = { mode: 'move', entityId: ent.id, origin: { x1: bx1, y1: by1, x2: bx2, y2: by2 }, start: { x, y } } as any;
                    }
                    e.preventDefault();
                    return;
                }
            }
        }
        // Missed all entities: attempt to detect OCR block under the pointer (convert bbox to raster)
        const ocr = (pageOcr as any)?.[pageIndex];
        const meta = (pagesMeta as any)?.[pageIndex];
        // Only allow OCR block hit-testing/selection when OCR overlay is visible for UX predictability
        const showOcr = (useProjectStore.getState() as any).showOcr;
        if (showOcr && ocr && meta) {
            const renderMeta = {
                pageWidthPts: ocr.width_pts,
                pageHeightPts: ocr.height_pts,
                rasterWidthPx: meta.nativeWidth,
                rasterHeightPx: meta.nativeHeight,
                rotation: 0 as 0
            };
            const blocks = ocr.blocks || [];
            for (let i = blocks.length - 1; i >= 0; i--) {
                const [bx1, by1, bx2, by2] = blocks[i].bbox;
                const [cx1, cy1, cx2, cy2] = pdfToCanvas([bx1, by1, bx2, by2], renderMeta as any);
                if (x >= cx1 && x <= cx2 && y >= cy1 && y <= cy2) {
                    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
                    dbg('ocr mousedown hit (arming click)', { i, x, y, additive });
                    pendingOcrClickRef.current = { startX: x, startY: y, blockIndex: i, additive };
                    e.preventDefault();
                    return;
                }
            }
            dbg('no ocr hit', { x, y });
        } else {
            dbg('missing ocr/meta', { hasOcr: !!ocr, hasMeta: !!meta });
        }
        // If not clicking on OCR either, forward pointer to underlying layer for other interactions.
        if (overlayRef.current) {
            dbg('forwarding pointerdown to underlying');
            overlayRef.current.style.pointerEvents = 'none';
            passthroughRef.current = true;
            const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            if (el) {
                try {
                    const forwardedDown = new PointerEvent('pointerdown', {
                        bubbles: true,
                        cancelable: true,
                        pointerId: (e as any).pointerId,
                        clientX: e.clientX,
                        clientY: e.clientY,
                        screenX: e.screenX,
                        screenY: e.screenY,
                        buttons: e.buttons,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        altKey: e.altKey
                    });
                    el.dispatchEvent(forwardedDown);
                } catch { /* ignore */ }
            }
        }
        // Do not clear selection automatically; let underlying handlers decide.
    };
    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        // Cancel pending OCR click if moving too far (treat as drag)
        if (pendingOcrClickRef.current) {
            const dx = Math.abs(x - pendingOcrClickRef.current.startX);
            const dy = Math.abs(y - pendingOcrClickRef.current.startY);
            const thresh = 3 / scale; // 3 screen px
            if (dx > thresh || dy > thresh) {
                dbg('cancel pending OCR click due to move', { dx, dy, thresh });
                pendingOcrClickRef.current = null;
            }
        }
        if (creatingEntity && dragRef.current) {
            const { sx, sy } = dragRef.current;
            setDraft({ x1: Math.min(sx, x), y1: Math.min(sy, y), x2: Math.max(sx, x), y2: Math.max(sy, y) });
            return;
        }
        // Stamping hover highlight: track drawing under pointer
        if (creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance')) {
            let insideId: string | null = null;
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                if (ent.entity_type !== 'drawing') continue;
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) { insideId = ent.id; break; }
            }
            if (insideId !== hoverDrawingId) setHoverDrawingId(insideId);
        } else if (hoverDrawingId) {
            setHoverDrawingId(null);
        }
        if (!linkingActive && editRef.current) {
            const { mode, origin, start, handle, entityId } = editRef.current as any;
            if (mode === 'move') {
                const dx = x - start.x; const dy = y - start.y;
                setTempEdit(entityId, { x1: origin.x1 + dx, y1: origin.y1 + dy, x2: origin.x2 + dx, y2: origin.y2 + dy });
            } else if (mode === 'resize') {
                let { x1, y1, x2, y2 } = origin;
                if (handle?.includes('l')) x1 = Math.min(x, x2 - 1);
                if (handle?.includes('r')) x2 = Math.max(x, x1 + 1);
                if (handle?.includes('t')) y1 = Math.min(y, y2 - 1);
                if (handle?.includes('b')) y2 = Math.max(y, y1 + 1);
                setTempEdit(entityId, { x1, y1, x2, y2 });
            }
            e.preventDefault();
            return;
        }
        // Hover cursor logic when not editing/creating
        if (!creatingEntity && !linkingActive && selectedEntityId) {
            const ent = pageEntities.find(e2 => e2.id === selectedEntityId);
            if (ent) {
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                const tol = TOL_PX / scale;
                if (x >= (bx1 - tol) && x <= (bx2 + tol) && y >= (by1 - tol) && y <= (by2 + tol)) {
                    const h = hitHandle(x, y, { x1: bx1, y1: by1, x2: bx2, y2: by2 });
                    if (h) {
                        setHoverCursor(handleToCursor(h));
                    } else {
                        setHoverCursor('move');
                    }
                } else {
                    if (hoverCursor) setHoverCursor(null);
                }
            }
        } else if (hoverCursor) {
            setHoverCursor(null);
        }
    };
    const [editingBoxes, setEditingBoxes] = useState<Record<string, { x1: number; y1: number; x2: number; y2: number }>>({});
    const setTempEdit = (id: string, box: { x1: number; y1: number; x2: number; y2: number }) => {
        setEditingBoxes(b => ({ ...b, [id]: box }));
    };
    const commitEdit = async (id: string) => {
        const box = editingBoxes[id];
        if (box) {
            await updateEntityBBox(id, [box.x1, box.y1, box.x2, box.y2]);
            setEditingBoxes(b => { const { [id]: _, ...rest } = b; return rest; });
        }
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        // Handle armed OCR click first
        if (pendingOcrClickRef.current) {
            const { blockIndex, additive } = pendingOcrClickRef.current;
            dbg('OCR click commit', { blockIndex, additive });
            toggleSelectBlock(pageIndex, blockIndex, additive);
            setRightPanelTab('blocks');
            pendingOcrClickRef.current = null;
            // Do not return; allow entity edit end if any (shouldn't be any in this path)
        }
        if (creatingEntity && dragRef.current) {
            if (draft) {
                const minSize = 4;
                if ((draft.x2 - draft.x1) >= minSize && (draft.y2 - draft.y1) >= minSize) {
                    finalizeEntityCreation(draft.x1, draft.y1, draft.x2, draft.y2);
                    setRightPanelTab('entities');
                }
            }
            dragRef.current = null; setDraft(null); return;
        }
        // Instance stamping click (no dragRef) — commit if draft exists
        if (creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance') && draft) {
            // Guard: must be inside a drawing
            let inside = false;
            for (let i = pageEntities.length - 1; i >= 0; i--) {
                const ent = pageEntities[i];
                if (ent.entity_type !== 'drawing') continue;
                const [bx1, by1, bx2, by2] = ent._canvas_box;
                const cx = (draft.x1 + draft.x2) / 2;
                const cy = (draft.y1 + draft.y2) / 2;
                if (cx >= bx1 && cx <= bx2 && cy >= by1 && cy <= by2) { inside = true; break; }
            }
            if (!inside) {
                addToast({ kind: 'error', message: 'Place instances inside a Drawing' });
                setDraft(null);
                return;
            }
            finalizeEntityCreation(draft.x1, draft.y1, draft.x2, draft.y2);
            setRightPanelTab('entities');
            setDraft(null);
            return;
        }
        if (!linkingActive && editRef.current) {
            const id = editRef.current.entityId;
            commitEdit(id);
            editRef.current = null;
        }
    };

    return (
        <div
            ref={overlayRef}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', cursor: hoverCursor || 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                {/* Stamping mode: show drawings as guides and highlight hovered */}
                {(creatingEntity && (creatingEntity.type === 'symbol_instance' || creatingEntity.type === 'component_instance')) && pageEntities.filter((e: any) => e.entity_type === 'drawing').map((d: any) => {
                    const [x1, y1, x2, y2] = d._canvas_box;
                    const isHover = hoverDrawingId === d.id;
                    return (
                        <rect key={`guide-${d.id}`} x={x1 * scale} y={y1 * scale} width={(x2 - x1) * scale} height={(y2 - y1) * scale} fill={isHover ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.05)'} stroke={isHover ? '#3b82f6' : '#93c5fd'} strokeDasharray="6 4" strokeWidth={isHover ? 2 : 1} />
                    );
                })}
                {pageEntities.map((e: any) => {
                    const c = TYPE_COLORS[e.entity_type] || { stroke: '#64748b', fill: 'rgba(100,116,139,0.15)' };
                    const live = editingBoxes[e.id] || { x1: e._canvas_box[0], y1: e._canvas_box[1], x2: e._canvas_box[2], y2: e._canvas_box[3] };
                    const { x1, y1, x2, y2 } = live;
                    const w = (x2 - x1) * scale; const h = (y2 - y1) * scale;
                    const selected = selectedEntityId === e.id;
                    const allowed = isAllowedByLinking(e);
                    const linkSelected = linkingActive && linking!.selectedTargetIds.includes(e.id);
                    const stroke = linkingActive ? (linkSelected ? '#16a34a' : allowed ? '#64748b' : 'rgba(148,163,184,0.3)') : (selected ? c.stroke : 'rgba(148,163,184,0.6)');
                    const fill = linkingActive ? (linkSelected ? 'rgba(22,163,74,0.18)' : allowed ? 'rgba(100,116,139,0.10)' : 'rgba(30,41,59,0.10)') : c.fill;
                    return (
                        <g key={e.id}>
                            <rect
                                x={x1 * scale}
                                y={y1 * scale}
                                width={w}
                                height={h}
                                stroke={stroke}
                                strokeWidth={selected ? 2 : 0.75}
                                fill={fill}
                                style={{ cursor: linkingActive ? (allowed ? 'pointer' : 'not-allowed') : (selected ? 'move' : 'pointer') }}
                            />
                            {selected && !creatingEntity && !linkingActive ? renderHandles(x1, y1, x2, y2, scale) : null}
                        </g>
                    );
                })}
                {draft && (
                    <rect x={draft.x1 * scale} y={draft.y1 * scale} width={(draft.x2 - draft.x1) * scale} height={(draft.y2 - draft.y1) * scale} fill="rgba(107,114,128,0.18)" stroke="#374151" strokeWidth={1} strokeDasharray="4 3" />
                )}
            </svg>
        </div>
    );
};

function renderHandles(x1: number, y1: number, x2: number, y2: number, scale: number) {
    const size = 8; // px on screen
    const half = size / 2;
    const points: Array<[number, number, string]> = [
        [x1, y1, 'nwse-resize'],
        [(x1 + x2) / 2, y1, 'ns-resize'],
        [x2, y1, 'nesw-resize'],
        [x1, (y1 + y2) / 2, 'ew-resize'],
        [(x1 + x2) / 2, (y1 + y2) / 2, 'move'],
        [x2, (y1 + y2) / 2, 'ew-resize'],
        [x1, y2, 'nesw-resize'],
        [(x1 + x2) / 2, y2, 'ns-resize'],
        [x2, y2, 'nwse-resize']
    ];
    return (
        <g>
            {points.map(([px, py, cursor], i) => (
                <rect
                    key={i}
                    x={px * scale - half}
                    y={py * scale - half}
                    width={size}
                    height={size}
                    fill="#f8fafc"
                    stroke="#111827"
                    strokeWidth={1}
                    style={{ cursor, pointerEvents: 'auto' }}
                />
            ))}
        </g>
    );
}

function handleToCursor(handle: string): string {
    switch (handle) {
        case 'tl': return 'nwse-resize';
        case 'tr': return 'nesw-resize';
        case 'bl': return 'nesw-resize';
        case 'br': return 'nwse-resize';
        case 'tm': return 'ns-resize';
        case 'bm': return 'ns-resize';
        case 'ml': return 'ew-resize';
        case 'mr': return 'ew-resize';
        case 'mm': return 'move';
        default: return 'default';
    }
}
