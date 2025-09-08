import React, { useCallback } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const UploadArea: React.FC = () => {
    const { loadPdf } = useProjectStore((s: ProjectStore) => ({ loadPdf: s.loadPdf }));

    const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await loadPdf(file);
    }, [loadPdf]);

    return (
        <div className="upload-container">
            <div className="upload-box">
                <h1>Timbergem</h1>
                <p>Select a multi-page PDF to begin building the knowledge graph.</p>
                <input type="file" accept="application/pdf" onChange={onChange} />
                <p className="hint">PDF never leaves the browser in this prototype. TODO: wire backend upload & processing pipeline.</p>
            </div>
        </div>
    );
};
