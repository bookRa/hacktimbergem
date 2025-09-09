import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/store';

interface Props { pageIndex: number; scale: number; wrapperRef: React.RefObject<HTMLDivElement>; }

// Basic color mapping per entity type
const TYPE_COLORS: Record<string, { stroke: string; fill: string; }> = {
    drawing: { stroke: '#2563eb', fill: 'rgba(37,99,235,0.15)' },
    legend: { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)' },
    schedule: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)' },
    note: { stroke: '#ec4899', fill: 'rgba(236,72,153,0.18)' }
};

export const EntitiesOverlay: React.FC<Props> = ({ pageIndex, scale, wrapperRef }) => {
    const { entities, creatingEntity, finalizeEntityCreation, cancelEntityCreation, currentPageIndex, setRightPanelTab, selectedEntityId, setSelectedEntityId, updateEntityBBox } = useProjectStore(s => ({
        entities: s.entities,
        creatingEntity: s.creatingEntity,
        finalizeEntityCreation: s.finalizeEntityCreation,
        cancelEntityCreation: s.cancelEntityCreation,
        currentPageIndex: s.currentPageIndex,
        setRightPanelTab: s.setRightPanelTab,
        selectedEntityId: s.selectedEntityId,
        setSelectedEntityId: s.setSelectedEntityId,
        updateEntityBBox: s.updateEntityBBox
    }));
    const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number; } | null>(null);
    const dragRef = useRef<{ sx: number; sy: number; } | null>(null);
    const editRef = useRef<{ mode: 'move' | 'resize'; entityId: string; origin: { x1: number; y1: number; x2: number; y2: number }; start: { x: number; y: number }; handle?: string } | null>(null);
    const [hoverCursor, setHoverCursor] = useState<string | null>(null);

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
                if (handle) {
                    editRef.current = { mode: 'resize', entityId: ent.id, origin: { ...ent.bounding_box }, start: { x, y }, handle } as any;
                } else {
                    editRef.current = { mode: 'move', entityId: ent.id, origin: { ...ent.bounding_box }, start: { x, y } } as any;
                }
                e.preventDefault();
                return;
            }
        }
        // click empty clears selection
        if (selectedEntityId) setSelectedEntityId(null);
    };
    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
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
