import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

function pct(done?: number, total?: number) {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((done! / total) * 100));
}

export const StatusBanner: React.FC = () => {
    const { manifest, manifestStatus } = useProjectStore((s: ProjectStore) => ({
        manifest: s.manifest,
        manifestStatus: s.manifestStatus
    }));
    if (manifestStatus === 'idle') return null;
    const status = manifest?.status ?? manifestStatus;
    const renderStage = manifest?.stages?.render;
    const ocrStage = manifest?.stages?.ocr;
    const isComplete = status === 'complete';
    const isError = status === 'error';
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ margin: '8px', padding: '6px 12px', background: isError ? '#b3261e' : '#1f2937', color: '#fff', borderRadius: 8, fontSize: 12, minWidth: 260, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', pointerEvents: 'auto' }}>
                <div style={{ fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>
                    {isError ? 'Processing Error' : isComplete ? 'Processing Complete' : 'Processing PDF'}
                </div>
                {!isError && !isComplete && (
                    <div style={{ display: 'grid', gap: 4 }}>
                        <StageProgress label="Render" done={renderStage?.done} total={renderStage?.total} />
                        <StageProgress label="OCR" done={ocrStage?.done} total={ocrStage?.total} />
                    </div>
                )}
                {isError && <div style={{ fontSize: 11, opacity: .85 }}>{manifest?.error || 'Unknown error'}</div>}
            </div>
        </div>
    );
};

const StageProgress: React.FC<{ label: string; done?: number; total?: number; }> = ({ label, done, total }) => {
    const percentage = pct(done, total);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{label}</span>
                <span style={{ opacity: .8 }}>{done ?? 0}/{total ?? 0} ({percentage}%)</span>
            </div>
            <div style={{ height: 4, background: '#374151', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: percentage + '%', height: '100%', background: '#3b82f6', transition: 'width .3s' }} />
            </div>
        </div>
    );
};
