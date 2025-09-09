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
            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
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
            style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
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
                            <rect x={x1 * scale} y={y1 * scale} width={w} height={h} stroke={selected ? '#f8fafc' : c.stroke} strokeWidth={selected ? 1.5 : 1} fill={c.fill} />
                            {selected && !creatingEntity && renderHandles(x1, y1, x2, y2)}
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

function renderHandles(x1: number, y1: number, x2: number, y2: number) {
    const points = [
        [x1, y1], [(x1 + x2) / 2, y1], [x2, y1],
        [x1, (y1 + y2) / 2], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, (y1 + y2) / 2],
        [x1, y2], [(x1 + x2) / 2, y2], [x2, y2]
    ];
    return (
        <g>
            {points.map(([px, py], i) => <rect key={i} x={px * 1 - 3} y={py * 1 - 3} width={6} height={6} fill="#f8fafc" stroke="#111827" strokeWidth={1} />)}
        </g>
    );
}
