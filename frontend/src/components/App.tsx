import React from 'react';
import { UploadArea } from './UploadArea';
import { LeftNavigator } from './LeftNavigator';
import { PdfCanvas } from './PdfCanvas';
import { ZoomControls } from './ZoomControls';
import { CanvasToolbar } from './CanvasToolbar';
import { RightPanel } from './RightPanel';
import { useProjectStore, ProjectStore } from '../state/store';
import { StatusBanner } from './StatusBanner';
import { ToastContainer } from './ToastContainer';

export const App: React.FC = () => {
    const pdfDoc = useProjectStore((s: ProjectStore) => s.pdfDoc);
    const { initProjectById, projectId } = useProjectStore((s: any) => ({ initProjectById: s.initProjectById, projectId: s.projectId }));
    React.useEffect(() => {
        // Restore project ONLY via URL hash (#p=projectId). Root without hash should show Upload.
        const tryInit = async () => {
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            const match = hash && hash.match(/#p=([a-f0-9]+)/i);
            const pid = match?.[1] || null;
            if (pid && !projectId) {
                await initProjectById(pid);
            }
        };
        // Defer until next tick to allow store listeners to mount
        const id = setTimeout(tryInit, 0);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);
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
    const COLLAPSED_RAIL = 36;
    return (
        <div className="app-shell">
            <StatusBanner />
            <ToastContainer />
            {!pdfDoc && <UploadArea />}
            {pdfDoc && (
                <div className="three-pane" style={{ gridTemplateColumns: `${leftPanel.collapsed ? COLLAPSED_RAIL : leftPanel.widthPx}px 1fr ${rightPanel.collapsed ? COLLAPSED_RAIL : rightPanel.widthPx}px` }}>
                    <div className="left-pane-wrapper">
                        {leftPanel.collapsed ? (
                            <div className="collapsed-rail left">
                                <button className="expand-btn left" onClick={toggleLeftCollapsed}>{'»'}</button>
                            </div>
                        ) : (
                            <>
                                <LeftNavigator />
                                <button className="collapse-btn left" onClick={toggleLeftCollapsed}>{'«'}</button>
                            </>
                        )}
                    </div>
                    <div className="center-pane">
                        {!leftPanel.collapsed && <div className="split-handle left" onMouseDown={onDragLeft} />}
                        <ZoomControls />
                        <CanvasToolbar />
                        <PdfCanvas />
                        {!rightPanel.collapsed && <div className="split-handle right" onMouseDown={onDragRight} />}
                    </div>
                    <div className="right-pane-wrapper">
                        {rightPanel.collapsed ? (
                            <div className="collapsed-rail right">
                                <button className="expand-btn right" onClick={toggleRightCollapsed}>{'«'}</button>
                            </div>
                        ) : (
                            <>
                                <RightPanel />
                                <button className="collapse-btn right" onClick={toggleRightCollapsed}>{'»'}</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
