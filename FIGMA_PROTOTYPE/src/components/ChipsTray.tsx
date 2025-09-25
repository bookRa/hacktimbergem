import { Button } from './ui/button';
import { X, Link } from 'lucide-react';

interface ChipItem {
  id: string;
  label: string;
  type: string;
}

interface ChipsTrayProps {
  open?: boolean;
  chips?: ChipItem[];
  onRemoveChip?: (id: string) => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export function ChipsTray({
  open = false,
  chips = [],
  onRemoveChip,
  onFinish,
  onCancel
}: ChipsTrayProps) {
  if (!open) return null;

  return (
    <div 
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div 
        className="flex items-center gap-3 px-4 py-2 rounded-lg border"
        style={{
          backgroundColor: 'var(--timbergem-panel-elevated)',
          borderColor: 'var(--timbergem-border)',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Link mode indicator */}
        <div className="flex items-center gap-2">
          <Link 
            className="h-4 w-4" 
            style={{ color: 'var(--timbergem-accent)' }}
          />
          <span 
            className="caption font-medium"
            style={{ color: 'var(--timbergem-text)' }}
          >
            Linking mode
          </span>
        </div>

        {/* Chips */}
        {chips.length > 0 && (
          <>
            <div 
              className="w-px h-4"
              style={{ backgroundColor: 'var(--timbergem-border)' }}
            />
            <div className="flex gap-2">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border"
                  style={{
                    backgroundColor: 'var(--timbergem-panel)',
                    borderColor: 'var(--timbergem-border)',
                    color: 'var(--timbergem-text)'
                  }}
                >
                  <span>{chip.label}</span>
                  <span style={{ color: 'var(--timbergem-muted)' }}>
                    ({chip.type})
                  </span>
                  <button
                    className="ml-1 hover:bg-[var(--timbergem-border)] rounded p-0.5"
                    onClick={() => onRemoveChip?.(chip.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div 
          className="w-px h-4"
          style={{ backgroundColor: 'var(--timbergem-border)' }}
        />
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            style={{ color: 'var(--timbergem-muted)' }}
          >
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={onFinish}
            disabled={chips.length === 0}
            style={{
              backgroundColor: 'var(--timbergem-accent)',
              color: 'var(--timbergem-accent-contrast)'
            }}
          >
            Finish ({chips.length})
          </Button>
        </div>
      </div>
    </div>
  );
}