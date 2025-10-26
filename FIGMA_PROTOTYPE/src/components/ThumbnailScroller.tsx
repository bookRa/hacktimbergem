import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';

export function ThumbnailScroller() {
  const [activePage, setActivePage] = useState(0);

  const pages = [
    { name: 'F1-A: Initial State', id: 'f1-a' },
    { name: 'F1-B: Context Picker', id: 'f1-b' },
    { name: 'F1-C: Symbol Form', id: 'f1-c' },
    { name: 'F1-D: Incomplete Entity', id: 'f1-d' },
    { name: 'F2-A: Scope Selected', id: 'f2-a' },
    { name: 'F2-B: Entity Menu', id: 'f2-b' },
    { name: 'F2-C: Link Mode', id: 'f2-c' },
    { name: 'F2-D: Links Created', id: 'f2-d' },
    { name: 'F3-A: Form Open', id: 'f3-a' },
    { name: 'F3-B: OCR Picker', id: 'f3-b' },
    { name: 'F3-C: OCR Selected', id: 'f3-c' },
    { name: 'F3-D: Complete Entity', id: 'f3-d' },
  ];

  return (
    <ScrollArea orientation="horizontal" className="w-full">
      <div className="flex items-center gap-2 pb-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            onClick={() => setActivePage(index)}
            className="flex-shrink-0 cursor-pointer group"
          >
            <div 
              className="w-16 h-10 rounded border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: 'var(--timbergem-panel-elevated)',
                borderColor: activePage === index 
                  ? 'var(--timbergem-accent)' 
                  : 'var(--timbergem-border)'
              }}
            >
              <span 
                className="caption font-medium"
                style={{ 
                  color: activePage === index 
                    ? 'var(--timbergem-accent)' 
                    : 'var(--timbergem-muted)' 
                }}
              >
                {index + 1}
              </span>
            </div>
            <div className="mt-1 text-center">
              <span 
                className="caption text-xs block truncate w-16"
                style={{ color: 'var(--timbergem-muted)' }}
                title={page.name}
              >
                {page.name.split(':')[0]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}