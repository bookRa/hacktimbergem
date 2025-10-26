import { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search,
  Triangle, 
  Square, 
  Calendar, 
  StickyNote, 
  Home, 
  Component, 
  Copy,
  Shapes,
  Box
} from 'lucide-react';

export type ContextPickerPlacement = 'top' | 'bottom' | 'left' | 'right';
export type ContextPickerContext = 'empty' | 'selection';

interface ContextPickerProps {
  open?: boolean;
  placement?: ContextPickerPlacement;
  context?: ContextPickerContext;
  x?: number;
  y?: number;
  onSelect?: (entityType: string) => void;
  onClose?: () => void;
}

const entityTypes = [
  { type: 'Drawing', icon: Triangle, description: 'Architectural drawing or plan' },
  { type: 'Legend', icon: Square, description: 'Symbol legend or key' },
  { type: 'Schedule', icon: Calendar, description: 'Schedule or table' },
  { type: 'Note', icon: StickyNote, description: 'Text note or annotation' },
  { type: 'Space', icon: Home, description: 'Room or space boundary' },
  { type: 'Symbol Instance', icon: Component, description: 'Instance of a symbol' },
  { type: 'Component Instance', icon: Copy, description: 'Instance of a component' },
  { type: 'Symbol Definition', icon: Shapes, description: 'Symbol definition' },
  { type: 'Component Definition', icon: Box, description: 'Component definition' },
  { type: 'Scope', icon: Component, description: 'Work scope or trade' },
];

export function ContextPicker({
  open = false,
  placement = 'bottom',
  context = 'empty',
  x = 0,
  y = 0,
  onSelect,
  onClose
}: ContextPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!open) return null;

  const filteredTypes = entityTypes.filter(item =>
    item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Picker */}
      <Card 
        className="absolute z-50 p-4 w-80 shadow-xl border"
        style={{
          left: x,
          top: y,
          backgroundColor: 'var(--timbergem-panel-elevated)',
          borderColor: 'var(--timbergem-border)',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" 
              style={{ color: 'var(--timbergem-muted)' }} 
            />
            <Input 
              placeholder="Search entity types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              style={{
                backgroundColor: 'var(--timbergem-panel)',
                borderColor: 'var(--timbergem-border)',
                color: 'var(--timbergem-text)'
              }}
            />
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-1">
              {filteredTypes.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    className="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-[var(--timbergem-panel)] transition-colors"
                    onClick={() => {
                      onSelect?.(item.type);
                      onClose?.();
                    }}
                  >
                    <Icon 
                      className="h-5 w-5 flex-shrink-0" 
                      style={{ color: 'var(--timbergem-accent)' }}
                    />
                    <div className="flex-1">
                      <div className="body" style={{ color: 'var(--timbergem-text)' }}>
                        {item.type}
                      </div>
                      <div 
                        className="caption" 
                        style={{ color: 'var(--timbergem-muted)' }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </Card>
    </>
  );
}