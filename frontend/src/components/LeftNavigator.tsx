import React from 'react';
import { useProjectStore, ProjectStore } from '../state/store';

export const LeftNavigator: React.FC = () => {
    const { pages, currentPageIndex, setCurrentPageIndex, pageTitles } = useProjectStore((s: ProjectStore & any) => ({
        pages: s.pages,
        currentPageIndex: s.currentPageIndex,
        setCurrentPageIndex: s.setCurrentPageIndex,
        pageTitles: s.pageTitles
    }));

    return (
        <aside className="left-nav">
            <h3>Sheets</h3>
            <ul>
                {pages.map((p: number, i: number) => {
                    const title = pageTitles[i]?.text;
                    const label = title ? `${i + 1}. ${title}` : `Page ${i + 1}`;
                    return (
                        <li key={i} className={i === currentPageIndex ? 'active' : ''}>
                            <button title={label} onClick={() => setCurrentPageIndex(i)} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</button>
                        </li>
                    );
                })}
            </ul>
            {pages.length === 0 && <p className="placeholder">(No pages yet)</p>}
        </aside>
    );
};
