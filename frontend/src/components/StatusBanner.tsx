import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

function pct(done?: number, total?: number) {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round((done! / total) * 100));
}

export const StatusBanner: React.FC = () => {
    const { manifest, manifestStatus, toasts } = useProjectStore((s: ProjectStore) => ({
        manifest: s.manifest,
        manifestStatus: s.manifestStatus,
        toasts: (s as any).toasts || []
    }));
    if (manifestStatus === 'idle') return null;
    const status = manifest?.status ?? manifestStatus;
    const renderStage = manifest?.stages?.render;
    const ocrStage = manifest?.stages?.ocr;
    const isComplete = status === 'complete';
    const isError = status === 'error';
    // Hide banner entirely once complete; completion is communicated via toast.
    if (isComplete) return null;
    // Offset above toast stack if any
    const bottomOffset = (toasts?.length || 0) > 0 ? 96 : 16; // crude vertical spacing
    return (
        <div style={{ position: 'fixed', bottom: bottomOffset, right: 16, zIndex: 900, pointerEvents: 'none' }}>
            <div style={{ padding: '8px 14px', background: isError ? '#b3261e' : '#1f2937', color: '#fff', borderRadius: 10, fontSize: 12, width: 260, boxShadow: '0 4px 12px rgba(0,0,0,0.45)', pointerEvents: 'auto', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontWeight: 600, letterSpacing: .5, marginBottom: 6 }}>
                    {isError ? 'Processing Error' : 'Processing PDF'}
                </div>
                {!isError && (
                    <div style={{ display: 'grid', gap: 6 }}>
                        <StageProgress label="Render" done={renderStage?.done} total={renderStage?.total} />
                        <StageProgress label="OCR" done={ocrStage?.done} total={ocrStage?.total} />
                    </div>
                )}
                {isError && <div style={{ fontSize: 11, opacity: .85, lineHeight: 1.3 }}>{manifest?.error || 'Unknown error'}</div>}
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
