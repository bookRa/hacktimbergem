import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const RightPanel: React.FC = () => {
    const { currentPageIndex } = useProjectStore((s: ProjectStore) => ({ currentPageIndex: s.currentPageIndex }));
    return (
        <aside className="right-panel">
            <h3>Knowledge Panel (Placeholder)</h3>
            <section className="kp-section">
                <p>Page Index: {currentPageIndex}</p>
                <p>TODO: Entity lists (Drawings, Legends, Schedules, Notes)</p>
                <p>TODO: Instances & conceptual linking UI</p>
                <p>TODO: [AI] Detect buttons per section</p>
            </section>
            <section className="kp-section muted">
                <p>Design Principle: Manual-first. All actions workable without AI.</p>
            </section>
        </aside>
    );
};
