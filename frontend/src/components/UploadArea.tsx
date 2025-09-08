import React, { useCallback } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const UploadArea: React.FC = () => {
    const { uploadAndStart } = useProjectStore((s: ProjectStore) => ({ uploadAndStart: s.uploadAndStart }));

    const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadAndStart(file);
    }, [uploadAndStart]);

    return (
        <div className="upload-container">
            <div className="upload-box">
                <h1>Timbergem</h1>
                <p>Select a multi-page PDF to begin building the knowledge graph.</p>
                <input type="file" accept="application/pdf" onChange={onChange} />
                <p className="hint">File uploads to backend for rendering & OCR. Preview loads immediately while processing continues.</p>
            </div>
        </div>
    );
};
