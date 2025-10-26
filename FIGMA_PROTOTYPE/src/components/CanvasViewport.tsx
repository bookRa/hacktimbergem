import { useState, useRef } from 'react';

interface CanvasViewportProps {
  children?: React.ReactNode;
}

export function CanvasViewport({ children }: CanvasViewportProps) {
  const [showGrid, setShowGrid] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={viewportRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--timbergem-bg)' }}
    >
      {/* Rulers */}
      <div 
        className="absolute top-0 left-0 right-0 h-5 flex items-end border-b"
        style={{ 
          backgroundColor: 'var(--timbergem-panel)',
          borderColor: 'var(--timbergem-border)'
        }}
      >
        {/* Horizontal ruler ticks */}
        {Array.from({ length: 20 }, (_, i) => (
          <div 
            key={i}
            className="h-2 w-px"
            style={{ 
              backgroundColor: 'var(--timbergem-border)',
              marginLeft: i === 0 ? '0' : '71px'
            }}
          />
        ))}
      </div>

      <div 
        className="absolute top-0 bottom-0 left-0 w-5 flex flex-col justify-end border-r"
        style={{ 
          backgroundColor: 'var(--timbergem-panel)',
          borderColor: 'var(--timbergem-border)'
        }}
      >
        {/* Vertical ruler ticks */}
        {Array.from({ length: 15 }, (_, i) => (
          <div 
            key={i}
            className="w-2 h-px"
            style={{ 
              backgroundColor: 'var(--timbergem-border)',
              marginBottom: i === 0 ? '0' : '59px'
            }}
          />
        ))}
      </div>

      {/* Canvas Content Area */}
      <div 
        className="absolute inset-0 ml-5 mt-5"
        style={{
          backgroundImage: showGrid 
            ? `radial-gradient(circle, var(--timbergem-border) 1px, transparent 1px)`
            : 'none',
          backgroundSize: '20px 20px',
          backgroundPosition: '10px 10px'
        }}
      >
        {/* Canvas Overlays Container */}
        <div className="relative w-full h-full">
          {children}
        </div>
      </div>

      {/* Corner ruler intersection */}
      <div 
        className="absolute top-0 left-0 w-5 h-5 border-r border-b"
        style={{ 
          backgroundColor: 'var(--timbergem-panel)',
          borderColor: 'var(--timbergem-border)'
        }}
      />
    </div>
  );
}