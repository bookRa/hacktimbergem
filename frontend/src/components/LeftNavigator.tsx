import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const LeftNavigator: React.FC = () => {
    const { pages, currentPageIndex, setCurrentPageIndex } = useProjectStore((s: ProjectStore) => ({
        pages: s.pages, currentPageIndex: s.currentPageIndex, setCurrentPageIndex: s.setCurrentPageIndex
    }));

    return (
        <aside className="left-nav">
            <h3>Sheets</h3>
            <ul>
                {pages.map((p, i) => (
                    <li key={i} className={i === currentPageIndex ? 'active' : ''}>
                        <button onClick={() => setCurrentPageIndex(i)}>Page {i + 1}</button>
                    </li>
                ))}
            </ul>
            {pages.length === 0 && <p className="placeholder">(No pages yet)</p>}
        </aside>
    );
};
