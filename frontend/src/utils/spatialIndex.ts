export type Rect = { x1: number; y1: number; x2: number; y2: number };

export interface SpatialIndex {
  cellSize: number;
  grid: Map<string, string[]>; // key -> ids
  idToRect: Record<string, Rect>;
}

function key(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
}

export function buildIndex(items: Array<{ id: string; rect: Rect }>, cellSize: number = 64): SpatialIndex {
  const grid = new Map<string, string[]>();
  const idToRect: Record<string, Rect> = {};
  for (const it of items) {
    idToRect[it.id] = it.rect;
    const minCx = Math.floor(it.rect.x1 / cellSize);
    const maxCx = Math.floor((it.rect.x2 - 1) / cellSize);
    const minCy = Math.floor(it.rect.y1 / cellSize);
    const maxCy = Math.floor((it.rect.y2 - 1) / cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const k = key(cx, cy);
        let arr = grid.get(k);
        if (!arr) { arr = []; grid.set(k, arr); }
        arr.push(it.id);
      }
    }
  }
  return { cellSize, grid, idToRect };
}

export function queryRect(index: SpatialIndex, rect: Rect): string[] {
  const { cellSize, grid, idToRect } = index;
  if (!idToRect) return [];
  const minCx = Math.floor(rect.x1 / cellSize);
  const maxCx = Math.floor((rect.x2 - 1) / cellSize);
  const minCy = Math.floor(rect.y1 / cellSize);
  const maxCy = Math.floor((rect.y2 - 1) / cellSize);
  const seen = new Set<string>();
  const out: string[] = [];
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const k = key(cx, cy);
      const arr = grid.get(k);
      if (!arr) continue;
      for (const id of arr) {
        if (seen.has(id)) continue;
        seen.add(id);
        const r = idToRect[id];
        if (r && rectsIntersect(r, rect)) out.push(id);
      }
    }
  }
  return out;
}

export function queryPoint(index: SpatialIndex, x: number, y: number): string[] {
  return queryRect(index, { x1: x, y1: y, x2: x + 0.0001, y2: y + 0.0001 });
}


