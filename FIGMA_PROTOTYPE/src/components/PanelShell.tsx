import { useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Mouse, 
  Pen, 
  Stamp, 
  Link, 
  Undo2, 
  Redo2, 
  Circle,
  Grid3X3,
  FileText,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { RightPanel } from './RightPanel';
import { CanvasViewport } from './CanvasViewport';
import { ThumbnailScroller } from './ThumbnailScroller';

interface PanelShellProps {
  children?: React.ReactNode;
}

export function PanelShell({ children }: PanelShellProps) {
  const [activeToolId, setActiveToolId] = useState<string>('select');
  const [zoomLevel, setZoomLevel] = useState(100);

  const tools = [
    { id: 'select', icon: Mouse, label: 'Select (V)', shortcut: 'V' },
    { id: 'draw', icon: Pen, label: 'Draw (R)', shortcut: 'R' },
    { id: 'stamp', icon: Stamp, label: 'Stamp (S)', shortcut: 'S' },
    { id: 'link', icon: Link, label: 'Link (L)', shortcut: 'L' },
  ];

  return (
    <div 
      className="w-[1440px] h-[900px] flex flex-col"
      style={{ 
        backgroundColor: 'var(--timbergem-bg)',
        color: 'var(--timbergem-text)'
      }}
    >
      {/* Top Bar */}
      <div 
        className="h-14 flex items-center px-4 border-b"
        style={{ 
          backgroundColor: 'var(--timbergem-panel)',
          borderColor: 'var(--timbergem-border)'
        }}
      >
        <div className="flex items-center gap-6">
          {/* App Title */}
          <h1 className="heading text-xl" style={{ color: 'var(--timbergem-text)' }}>
            Timbergem
          </h1>

          <Separator orientation="vertical" className="h-6" />

          {/* Tools */}
          <div className="flex items-center gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeToolId === tool.id;
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveToolId(tool.id)}
                  className="h-8 w-8 p-0"
                  title={tool.label}
                  style={{
                    backgroundColor: isActive ? 'var(--timbergem-accent)' : 'transparent',
                    color: isActive ? 'var(--timbergem-accent-contrast)' : 'var(--timbergem-text)'
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Save Status */}
        <div className="ml-auto flex items-center gap-2">
          <Circle 
            className="h-2 w-2 fill-green-500 text-green-500" 
            style={{ color: 'var(--timbergem-accent)' }}
          />
          <span className="caption" style={{ color: 'var(--timbergem-muted)' }}>
            Saved
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel */}
        <div 
          className="w-[280px] border-r flex-shrink-0"
          style={{ 
            backgroundColor: 'var(--timbergem-panel)',
            borderColor: 'var(--timbergem-border)'
          }}
        >
          <div className="p-4">
            <h3 className="label mb-4" style={{ color: 'var(--timbergem-muted)' }}>
              Pages
            </h3>
            <div className="space-y-2">
              <div 
                className="p-3 rounded cursor-pointer"
                style={{ backgroundColor: 'var(--timbergem-panel-elevated)' }}
              >
                <span className="body">Canvas Flows</span>
              </div>
              <div 
                className="p-3 rounded cursor-pointer opacity-60"
                style={{ backgroundColor: 'var(--timbergem-panel-elevated)' }}
              >
                <span className="body">Library</span>
              </div>
              <div 
                className="p-3 rounded cursor-pointer opacity-60"
                style={{ backgroundColor: 'var(--timbergem-panel-elevated)' }}
              >
                <span className="body">Notes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1">
          <CanvasViewport>{children}</CanvasViewport>
        </div>

        {/* Right Panel */}
        <RightPanel />
      </div>

      {/* Bottom Bar */}
      <div 
        className="h-14 flex items-center px-4 border-t"
        style={{ 
          backgroundColor: 'var(--timbergem-panel)',
          borderColor: 'var(--timbergem-border)'
        }}
      >
        {/* Page Thumbnails */}
        <div className="flex-1">
          <ThumbnailScroller />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="caption min-w-12 text-center" style={{ color: 'var(--timbergem-muted)' }}>
              {zoomLevel}%
            </span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}