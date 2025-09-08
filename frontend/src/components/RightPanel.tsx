import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const RightPanel: React.FC = () => {
    const { currentPageIndex, pageOcr, ocrBlockState, setBlockStatus, toggleOcr, showOcr } = useProjectStore((s: ProjectStore & any) => ({
        currentPageIndex: s.currentPageIndex,
        pageOcr: s.pageOcr,
        ocrBlockState: s.ocrBlockState,
        setBlockStatus: s.setBlockStatus,
        toggleOcr: s.toggleOcr,
        showOcr: s.showOcr
    }));
    const ocr = pageOcr[currentPageIndex];
    const blocks = ocr?.blocks || [];
    const meta = ocrBlockState[currentPageIndex] || {};
    const statusOptions: Array<{ value: any; label: string; }> = [
        { value: 'unverified', label: 'Unverified' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'flagged', label: 'Flagged' },
        { value: 'noise', label: 'Noise' }
    ];
    return (
        <aside className="right-panel">
            <h3>Knowledge Panel</h3>
            <section className="kp-section" style={{ borderBottom: '1px solid #1f2937', paddingBottom: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, opacity: .85 }}>Page {currentPageIndex + 1}</span>
                    <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showOcr} onChange={toggleOcr} /> OCR
                    </label>
                </div>
            </section>
            <section className="kp-section" style={{ maxHeight: 260, overflow: 'auto' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>OCR Blocks</div>
                {blocks.length === 0 && <p style={{ fontSize: 12, opacity: .7, margin: 0 }}>(No OCR yet)</p>}
                {blocks.slice(0, 200).map((b: any, i: number) => {
                    const status = meta[i]?.status || 'unverified';
                    return (
                        <div key={i} style={{ border: '1px solid #374151', borderRadius: 4, padding: '4px 6px', marginBottom: 6, background: '#111827' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ fontSize: 11, opacity: .6 }}>#{i} {status}</div>
                                <select
                                    value={status}
                                    onChange={e => setBlockStatus(currentPageIndex, i, e.target.value as any)}
                                    style={{ background: '#1f2937', color: '#fff', border: '1px solid #374151', fontSize: 11, borderRadius: 4 }}
                                >
                                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div style={{ fontSize: 11, lineHeight: 1.3, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                {b.text.length > 160 ? b.text.slice(0, 160) + '…' : b.text || <em style={{ opacity: .6 }}>(empty)</em>}
                            </div>
                        </div>
                    );
                })}
                {blocks.length > 200 && <div style={{ fontSize: 11, opacity: .6 }}>Showing first 200 of {blocks.length} blocks…</div>}
            </section>
            <section className="kp-section muted" style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, lineHeight: 1.4 }}>Next: multi-select, merge & promote to entities (Notes, Legends). Current step focuses on verifying block text & marking noise.</p>
            </section>
        </aside>
    );
};
