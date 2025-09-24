import { buildIndex, queryRect, Rect } from '../spatialIndex';

describe('spatialIndex', () => {
  it('indexes and queries overlapping rects', () => {
    const items = [
      { id: 'a', rect: { x1: 0, y1: 0, x2: 10, y2: 10 } },
      { id: 'b', rect: { x1: 20, y1: 20, x2: 30, y2: 30 } },
      { id: 'c', rect: { x1: 5, y1: 5, x2: 25, y2: 25 } },
    ];
    const idx = buildIndex(items as any, 8);
    const hits1 = queryRect(idx, { x1: 1, y1: 1, x2: 2, y2: 2 });
    expect(hits1.sort()).toEqual(['a']);
    const hits2 = queryRect(idx, { x1: 6, y1: 6, x2: 7, y2: 7 });
    expect(hits2.sort()).toEqual(['a', 'c']);
    const hits3 = queryRect(idx, { x1: 21, y1: 21, x2: 22, y2: 22 });
    expect(hits3.sort()).toEqual(['b', 'c']);
  });
});


