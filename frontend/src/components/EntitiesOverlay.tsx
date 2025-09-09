import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/store';

interface Props { pageIndex: number; scale: number; wrapperRef: React.RefObject<HTMLDivElement>; }

// Basic color mapping per entity type
const TYPE_COLORS: Record<string, { stroke: string; fill: string; } > = {
  drawing: { stroke: '#2563eb', fill: 'rgba(37,99,235,0.15)' },
  legend: { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)' },
  schedule: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)' },
  note: { stroke: '#ec4899', fill: 'rgba(236,72,153,0.18)' }
};

export const EntitiesOverlay: React.FC<Props> = ({ pageIndex, scale, wrapperRef }) => {
  const { entities, creatingEntity, startEntityCreation, finalizeEntityCreation, cancelEntityCreation, currentPageIndex, setRightPanelTab } = useProjectStore(s => ({
    entities: s.entities,
    creatingEntity: s.creatingEntity,
    startEntityCreation: s.startEntityCreation,
    finalizeEntityCreation: s.finalizeEntityCreation,
    cancelEntityCreation: s.cancelEntityCreation,
    currentPageIndex: s.currentPageIndex,
    setRightPanelTab: s.setRightPanelTab
  }));
  const [draft, setDraft] = useState<{ x1:number; y1:number; x2:number; y2:number; } | null>(null);
  const dragRef = useRef<{ sx:number; sy:number; } | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && creatingEntity) { cancelEntityCreation(); setDraft(null); } };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [creatingEntity, cancelEntityCreation]);

  if (pageIndex !== currentPageIndex) return null;

  const pageEntities = entities.filter((e: any) => e.source_sheet_number === pageIndex + 1);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!creatingEntity) return;
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    dragRef.current = { sx: x, sy: y };
    setDraft({ x1: x, y1: y, x2: x, y2: y });
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!creatingEntity || !dragRef.current || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const { sx, sy } = dragRef.current;
    setDraft({ x1: Math.min(sx,x), y1: Math.min(sy,y), x2: Math.max(sx,x), y2: Math.max(sy,y) });
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!creatingEntity || !dragRef.current || !draft) return;
    dragRef.current = null;
    const minSize = 4; // px in PDF-space
    if ((draft.x2 - draft.x1) < minSize || (draft.y2 - draft.y1) < minSize) { setDraft(null); return; }
    finalizeEntityCreation(draft.x1, draft.y1, draft.x2, draft.y2);
    setDraft(null);
    setRightPanelTab('entities');
  };

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: creatingEntity ? 'auto':'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }}>
        {pageEntities.map((e:any) => {
          const c = TYPE_COLORS[e.entity_type] || { stroke:'#64748b', fill:'rgba(100,116,139,0.15)' };
          const { x1,y1,x2,y2 } = e.bounding_box;
          const w = (x2 - x1) * scale; const h = (y2 - y1) * scale;
          return <rect key={e.id} x={x1*scale} y={y1*scale} width={w} height={h} stroke={c.stroke} strokeWidth={1} fill={c.fill} />;
        })}
        {draft && (
          <rect x={draft.x1*scale} y={draft.y1*scale} width={(draft.x2-draft.x1)*scale} height={(draft.y2-draft.y1)*scale} fill="rgba(255,255,255,0.08)" stroke="#f8fafc" strokeWidth={1} strokeDasharray="4 3" />
        )}
      </svg>
    </div>
  );
};
