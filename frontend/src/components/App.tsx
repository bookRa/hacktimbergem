import React from 'react';
import { UploadArea } from './UploadArea';
import { LeftNavigator } from './LeftNavigator';
import { PdfCanvas } from './PdfCanvas';
import { RightPanel } from './RightPanel';
import { useProjectStore, ProjectStore } from '../state/store';

export const App: React.FC = () => {
    const pdfDoc = useProjectStore((s: ProjectStore) => s.pdfDoc);
    return (
        <div className="app-shell">
            {!pdfDoc && <UploadArea />}
            {pdfDoc && (
                <div className="three-pane">
                    <LeftNavigator />
                    <PdfCanvas />
                    <RightPanel />
                </div>
            )}
        </div>
    );
};
