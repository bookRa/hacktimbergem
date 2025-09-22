import { describe, it, expect, beforeEach, vi } from 'vitest';
declare const global: any;
import { useProjectStore } from '../../state/store';

type Ent = any;
type Lnk = any;

describe('history undo/redo core flows', () => {
  const projectId = 'proj_test';
  let backend: { entities: Ent[]; links: Lnk[]; entCounter: number; linkCounter: number };

  beforeEach(() => {
    backend = { entities: [], links: [], entCounter: 0, linkCounter: 0 };
    // reset store
    useProjectStore.setState({
      projectId,
      entities: [],
      links: [],
      historyPast: [],
      historyFuture: [],
      historyIdMap: {},
    } as any);

    // basic fetch mock with in-memory backend
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method || 'GET').toUpperCase();
      const json = async () => (init?.body ? JSON.parse(String(init.body)) : undefined);

      const entRe = /\/api\/projects\/.+\/entities(?:\/(.+))?$/;
      const linkRe = /\/api\/projects\/.+\/links(?:\/(.+))?$/;

      if (url.includes('/entities')) {
        const m = url.match(entRe);
        const id = m?.[1];
        if (method === 'GET') {
          return new Response(JSON.stringify(backend.entities), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'POST') {
          const body = await json();
          const created = { id: 'ent_' + (++backend.entCounter), ...normalizeEntity(body) };
          backend.entities.push(created);
          return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'PATCH' && id) {
          const body = await json();
          const idx = backend.entities.findIndex(e => e.id === id);
          if (idx === -1) return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
          backend.entities[idx] = { ...backend.entities[idx], ...body, bounding_box: body?.bounding_box ?? backend.entities[idx].bounding_box };
          return new Response(JSON.stringify(backend.entities[idx]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'DELETE' && id) {
          const before = backend.entities.length;
          backend.entities = backend.entities.filter(e => e.id !== id);
          if (backend.entities.length === before) return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
          return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
      if (url.includes('/links')) {
        const m = url.match(linkRe);
        const id = m?.[1];
        if (method === 'GET') {
          return new Response(JSON.stringify(backend.links), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'POST') {
          const body = await json();
          const created = { id: 'lnk_' + (++backend.linkCounter), ...body };
          backend.links.push(created);
          return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'DELETE' && id) {
          const before = backend.links.length;
          backend.links = backend.links.filter(l => l.id !== id);
          if (backend.links.length === before) return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
          return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
      // OCR/status/pages endpoints (minimal stubs)
      if (url.includes('/status')) {
        return new Response(JSON.stringify({ status: 'complete', total_pages: 1, stages: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/ocr/')) {
        return new Response(JSON.stringify({ width_pts: 612, height_pts: 792, blocks: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('.png') || url.endsWith('.pdf')) {
        return new Response(new Blob(), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;
  });

  it('undo/redo edit_entity (bbox) applies before/after to correct id', async () => {
    // seed entity
    backend.entities.push(entity('e1'));
    useProjectStore.setState({ entities: backend.entities.slice() } as any);
    // Simulate that an edit was undone previously -> entry sits in future for redo
    useProjectStore.setState(s => ({ historyFuture: [{ type: 'edit_entity', id: 'e1', before: { bounding_box: [0, 0, 10, 10] }, after: { bounding_box: [10, 10, 20, 20] } }], historyPast: (s as any).historyPast } as any));
    await useProjectStore.getState().redo(); // apply after
    expect(backend.entities.find(e => e.id === 'e1')!.bounding_box).toEqual([10, 10, 20, 20]);
    await useProjectStore.getState().undo();
    expect(backend.entities.find(e => e.id === 'e1')!.bounding_box).toEqual([0, 0, 10, 10]);
  });

  it('undo/redo delete_entity recreates from payload and deletes by current id', async () => {
    // Simulate an entity that was deleted previously (no entity currently present)
    const payload = entity('e2');
    useProjectStore.setState(s => ({ historyPast: [...(s as any).historyPast, { type: 'delete_entity', entity: payload }] } as any));
    await useProjectStore.getState().undo(); // recreate from payload
    expect(backend.entities.length).toBe(1);
    await useProjectStore.getState().redo(); // delete recreated entity
    expect(backend.entities.length).toBe(0);
  });

  it('undo/redo create_links/delete_links toggles links without duplicates', async () => {
    const scopeId = 'scope_1'; const evId = 'e3'; backend.entities.push(entity(evId));
    // Start with no links; simulate that a delete occurred (historyPast has delete_links)
    const link = { rel_type: 'JUSTIFIED_BY', source_id: scopeId, target_id: evId } as any;
    useProjectStore.setState(s => ({ historyPast: [...(s as any).historyPast, { type: 'delete_links', links: [link] } ] } as any));
    await useProjectStore.getState().undo(); // recreate link
    // Sync store.links to backend so redo can resolve ids when deleting
    await useProjectStore.getState().fetchLinks();
    expect(backend.links.length).toBe(1);
    await useProjectStore.getState().redo(); // delete created link
    expect(backend.links.length).toBe(0);
  });
});

function entity(id: string): Ent {
  return {
    id,
    entity_type: 'drawing',
    source_sheet_number: 1,
    bounding_box: { x1: 0, y1: 0, x2: 10, y2: 10 },
    title: 'D',
  };
}

function normalizeEntity(body: any) {
  const raw = body?.bounding_box;
  let bbObj: any;
  if (Array.isArray(raw)) {
    const [x1 = 0, y1 = 0, x2 = 10, y2 = 10] = raw as number[];
    bbObj = { x1, y1, x2, y2 };
  } else if (raw && typeof raw === 'object') {
    const x1 = Number.isFinite(raw.x1) ? raw.x1 : 0;
    const y1 = Number.isFinite(raw.y1) ? raw.y1 : 0;
    const x2 = Number.isFinite(raw.x2) ? raw.x2 : 10;
    const y2 = Number.isFinite(raw.y2) ? raw.y2 : 10;
    bbObj = { x1, y1, x2, y2 };
  } else {
    bbObj = { x1: 0, y1: 0, x2: 10, y2: 10 };
  }
  return { ...body, bounding_box: bbObj };
}


