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
    note: { stroke: '#ec4899', fill: 'rgba(236,72,153,0.18)' }
};

export const EntitiesOverlay: React.FC<Props> = ({ pageIndex, scale, wrapperRef }) => {
    const { entities, creatingEntity, finalizeEntityCreation, cancelEntityCreation, currentPageIndex, setRightPanelTab, selectedEntityId, setSelectedEntityId, updateEntityBBox, pageOcr, pagesMeta, toggleSelectBlock } = useProjectStore(s => ({
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
        toggleSelectBlock: (s as any).toggleSelectBlock
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
    const pendingOcrClickRef = useRef<{ startX: number; startY: number; blockIndex: number; additive: boolean } | null>(null);

    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && creatingEntity) { cancelEntityCreation(); setDraft(null); } };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [creatingEntity, cancelEntityCreation]);

    if (pageIndex !== currentPageIndex) return null;

    const pageEntities = entities.filter((e: any) => e.source_sheet_number === pageIndex + 1);

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
        dbg('pointerdown raster coords', { x, y, scale, pageIndex });
        if (creatingEntity) {
            dragRef.current = { sx: x, sy: y };
            setDraft({ x1: x, y1: y, x2: x, y2: y });
            return;
        }
        // selection / edit
        // iterate topmost first (last draw) so reverse order
        for (let i = pageEntities.length - 1; i >= 0; i--) {
            const ent = pageEntities[i];
            const { x1, y1, x2, y2 } = ent.bounding_box;
            // Expand test by tolerance converted to PDF space
            const tol = TOL_PX / scale;
            if (x >= (x1 - tol) && x <= (x2 + tol) && y >= (y1 - tol) && y <= (y2 + tol)) {
                const handle = hitHandle(x, y, ent.bounding_box);
                // If clicking inside entity (not on handle) and not currently a drag, select & open editor
                setSelectedEntityId(ent.id);
                setRightPanelTab('entities');
                dbg('entity hit', { id: ent.id, handle: handle || 'move' });
                if (handle) {
                    editRef.current = { mode: 'resize', entityId: ent.id, origin: { ...ent.bounding_box }, start: { x, y }, handle } as any;
                } else {
                    editRef.current = { mode: 'move', entityId: ent.id, origin: { ...ent.bounding_box }, start: { x, y } } as any;
                }
                e.preventDefault();
                return;
            }
        }
        // Missed all entities: attempt to detect OCR block under the pointer (convert bbox to raster)
        const ocr = (pageOcr as any)?.[pageIndex];
        const meta = (pagesMeta as any)?.[pageIndex];
        if (ocr && meta) {
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
        if (editRef.current) {
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
        if (!creatingEntity && selectedEntityId) {
            const ent = pageEntities.find(e2 => e2.id === selectedEntityId);
            if (ent) {
                const { x1, y1, x2, y2 } = ent.bounding_box;
                const tol = TOL_PX / scale;
                if (x >= (x1 - tol) && x <= (x2 + tol) && y >= (y1 - tol) && y <= (y2 + tol)) {
                    const h = hitHandle(x, y, ent.bounding_box);
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
        if (editRef.current) {
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
                {pageEntities.map((e: any) => {
                    const c = TYPE_COLORS[e.entity_type] || { stroke: '#64748b', fill: 'rgba(100,116,139,0.15)' };
                    const live = editingBoxes[e.id] || e.bounding_box;
                    const { x1, y1, x2, y2 } = live;
                    const w = (x2 - x1) * scale; const h = (y2 - y1) * scale;
                    const selected = selectedEntityId === e.id;
                    return (
                        <g key={e.id}>
                            <rect
                                x={x1 * scale}
                                y={y1 * scale}
                                width={w}
                                height={h}
                                stroke={selected ? c.stroke : 'rgba(148,163,184,0.6)'}
                                strokeWidth={selected ? 2 : 0.75}
                                fill={c.fill}
                                style={{ cursor: selected ? 'move' : 'pointer' }}
                            />
                            {selected && !creatingEntity ? renderHandles(x1, y1, x2, y2, scale) : null}
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
