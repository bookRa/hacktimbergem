import React from 'react';
import { UploadArea } from './UploadArea';
import { LeftNavigator } from './LeftNavigator';
import { PdfCanvas } from './PdfCanvas';
import { ZoomControls } from './ZoomControls';
import { RightPanel } from './RightPanel';
import { useProjectStore, ProjectStore } from '../state/store';
import { StatusBanner } from './StatusBanner';
import { ToastContainer } from './ToastContainer';

export const App: React.FC = () => {
    const pdfDoc = useProjectStore((s: ProjectStore) => s.pdfDoc);
    const { leftPanel, rightPanel, setLeftPanelWidth, setRightPanelWidth, toggleLeftCollapsed, toggleRightCollapsed } = useProjectStore((s: any) => ({
        leftPanel: s.leftPanel,
        rightPanel: s.rightPanel,
        setLeftPanelWidth: s.setLeftPanelWidth,
        setRightPanelWidth: s.setRightPanelWidth,
        toggleLeftCollapsed: s.toggleLeftCollapsed,
        toggleRightCollapsed: s.toggleRightCollapsed,
    }));
    const onDragLeft = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startW = leftPanel.widthPx;
        const onMove = (ev: MouseEvent) => setLeftPanelWidth(startW + (ev.clientX - startX));
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    const onDragRight = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startW = rightPanel.widthPx;
        const onMove = (ev: MouseEvent) => setRightPanelWidth(startW - (ev.clientX - startX));
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    return (
        <div className="app-shell">
            <StatusBanner />
            <ToastContainer />
            {!pdfDoc && <UploadArea />}
            {pdfDoc && (
                <div className="three-pane" style={{ gridTemplateColumns: `${leftPanel.collapsed ? 0 : leftPanel.widthPx}px 1fr ${rightPanel.collapsed ? 0 : rightPanel.widthPx}px` }}>
                    <div className="left-pane-wrapper" style={{ display: leftPanel.collapsed ? 'none' : 'block' }}>
                        <LeftNavigator />
                        <button className="collapse-btn left" onClick={toggleLeftCollapsed}>{'«'}</button>
                    </div>
                    <div className="center-pane">
                        {!leftPanel.collapsed && <div className="split-handle left" onMouseDown={onDragLeft} />}
                        <ZoomControls />
                        <PdfCanvas />
                        {!rightPanel.collapsed && <div className="split-handle right" onMouseDown={onDragRight} />}
                    </div>
                    <div className="right-pane-wrapper" style={{ display: rightPanel.collapsed ? 'none' : 'block' }}>
                        <RightPanel />
                        <button className="collapse-btn right" onClick={toggleRightCollapsed}>{'»'}</button>
                    </div>
                </div>
            )}
        </div>
    );
};
