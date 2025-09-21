import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProjectStore, ProjectStore } from '../state/store';

export const LeftNavigator: React.FC = () => {
    const { pages, currentPageIndex, setCurrentPageIndex, pageTitles, entities, pageImages, fetchPageImage } = useProjectStore((s: ProjectStore & any) => ({
        pages: s.pages,
        currentPageIndex: s.currentPageIndex,
        setCurrentPageIndex: s.setCurrentPageIndex,
        pageTitles: s.pageTitles,
        entities: s.entities,
        pageImages: s.pageImages,
        fetchPageImage: s.fetchPageImage
    }));
    const [query, setQuery] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const rowVirtualizer = useVirtualizer({
        count: pages.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 56,
        overscan: 8
    });
    const filteredIndexes = React.useMemo(() => {
        if (!query.trim()) return pages;
        const q = query.trim().toLowerCase();
        const result: number[] = [];
        pages.forEach((_, i) => {
            const title = pageTitles[i]?.text || '';
            const label = `${i + 1}. ${title}`.toLowerCase();
            if (label.includes(q)) result.push(i);
        });
        return result;
    }, [pages, pageTitles, query]);
    // Hover preview state
    const [hover, setHover] = React.useState<{ index: number; x: number; y: number } | null>(null);
    // Prefetch visible thumbnails
    React.useEffect(() => {
        const vis = rowVirtualizer.getVirtualItems();
        vis.forEach(v => { const idx = v.index; if (!pageImages[idx]) fetchPageImage(idx); });
    }, [rowVirtualizer.getVirtualItems().map(v => v.index).join(','), pageImages]);

    // Per sheet counts (simple summary by entity_type)
    const countsFor = React.useCallback((sheetIdx: number) => {
        const sn = sheetIdx + 1;
        const c: Record<string, number> = {};
        for (const e of entities as any[]) {
            if (e.source_sheet_number !== sn) continue;
            const t = e.entity_type;
            c[t] = (c[t] || 0) + 1;
        }
        // Aggregate groups for display
        const drawings = (c['drawing'] || 0);
        const defs = (c['symbol_definition'] || 0) + (c['component_definition'] || 0);
        const inst = (c['symbol_instance'] || 0) + (c['component_instance'] || 0);
        const notes = (c['note'] || 0);
        const legends = (c['legend'] || 0);
        const schedules = (c['schedule'] || 0);
        return { drawings, defs, inst, notes, legends, schedules };
    }, [entities]);

    return (
        <aside className="left-nav" style={{ position: 'relative', paddingBottom: 40 }}>
            <h3>Sheets</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" style={{ flex: 1, background: '#f0f4f7', border: '1px solid #d5dde3', borderRadius: 6, padding: '6px 8px', font: 'inherit' }} />
                <button title="Previous" onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} style={navBtn()}>‹</button>
                <button title="Next" onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} style={navBtn()}>›</button>
            </div>
            <div ref={containerRef as any} style={{ height: 'calc(100vh - 180px)', overflow: 'auto', position: 'relative' }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); setCurrentPageIndex(Math.max(0, currentPageIndex - 1)); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1)); }
                    if (e.key === 'Enter') { e.preventDefault(); /* noop: already navigates by selection */ }
                }}
                tabIndex={0}
            >
                <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map(vi => {
                        const i = vi.index;
                        if (!filteredIndexes.includes(i)) return null; // simple filter; keeps virtualization basics
                        const title = pageTitles[i]?.text;
                        const label = title ? `${i + 1}. ${title}` : `Page ${i + 1}`;
                        const thumb = pageImages[i];
                        const sel = i === currentPageIndex;
                        const c = countsFor(i);
                        return (
                            <div key={vi.key} style={{ position: 'absolute', top: vi.start, left: 0, width: '100%', height: vi.size }}>
                                <div className={sel ? 'active' : ''} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, alignItems: 'center', padding: '6px 6px', borderRadius: 8, border: sel ? '1px solid #264f9e' : '1px solid transparent', background: sel ? '#eaf1ff' : 'transparent' }}
                                    onMouseEnter={(e) => { if (thumb) setHover({ index: i, x: e.clientX, y: e.clientY }); }}
                                    onMouseMove={(e) => { if (thumb) setHover({ index: i, x: e.clientX, y: e.clientY }); }}
                                    onMouseLeave={() => setHover(null)}
                                >
                                    <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#eef2f6', border: '1px solid #d5dde3' }}>
                                        {thumb && <img src={thumb} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <button title={label} onClick={() => setCurrentPageIndex(i)} style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</button>
                                    <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 6, marginLeft: 48 }}>
                                        <Badge label="Drawings" count={c.drawings} />
                                        <Badge label="Defs" count={c.defs} />
                                        <Badge label="Inst" count={c.inst} />
                                        <Badge label="Notes" count={c.notes} />
                                        {c.legends > 0 && <Badge label="Legends" count={c.legends} muted />}
                                        {c.schedules > 0 && <Badge label="Schedules" count={c.schedules} muted />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {hover && pageImages[hover.index] && (
                <div style={{ position: 'fixed', left: hover.x + 12, top: Math.max(12, hover.y - 120), width: 220, height: 220, background: '#fff', border: '1px solid #d5dde3', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', padding: 6, pointerEvents: 'none', zIndex: 1000 }}>
                    <img src={pageImages[hover.index]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            )}
            {pages.length === 0 && <p className="placeholder">(No pages yet)</p>}
        </aside>
    );
};

const Badge: React.FC<{ label: string; count: number; muted?: boolean }> = ({ label, count, muted }) => (
    <span style={{ fontSize: 10, border: '1px solid ' + (muted ? '#d5dde3' : '#b6c6f1'), color: muted ? '#5b6773' : '#264f9e', background: muted ? '#f3f6f9' : '#eaf1ff', padding: '2px 6px', borderRadius: 999 }}>{label}: {count}</span>
);

function navBtn(): React.CSSProperties {
    return { background: '#f0f4f7', border: '1px solid #d5dde3', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' };
}
