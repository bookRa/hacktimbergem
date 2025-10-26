import { Button } from './ui/button';
import { AlertTriangle, ChevronRight } from 'lucide-react';

interface NeedsAttentionRowProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  name: string;
  issue: string;
  actions: string[];
  onClick?: () => void;
}

export function NeedsAttentionRow({ 
  icon: Icon, 
  name, 
  issue, 
  actions, 
  onClick 
}: NeedsAttentionRowProps) {
  return (
    <div 
      className="p-3 rounded border cursor-pointer hover:bg-[var(--timbergem-panel-elevated)] transition-colors group"
      style={{ 
        backgroundColor: 'var(--timbergem-panel-elevated)',
        borderColor: 'var(--timbergem-border)'
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <AlertTriangle 
          className="h-4 w-4 flex-shrink-0 mt-0.5" 
          style={{ color: 'var(--timbergem-warn)' }}
        />
        
        {/* Entity icon */}
        <Icon 
          className="h-4 w-4 flex-shrink-0 mt-0.5" 
          style={{ color: 'var(--timbergem-muted)' }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="body" style={{ color: 'var(--timbergem-text)' }}>
            {name}
          </div>
          <div 
            className="caption mt-1" 
            style={{ color: 'var(--timbergem-muted)' }}
          >
            {issue}
          </div>
          
          {/* Quick actions */}
          <div className="flex flex-wrap gap-1 mt-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-6 px-2 caption"
                style={{
                  borderColor: 'var(--timbergem-border)',
                  backgroundColor: 'var(--timbergem-panel-elevated)',
                  color: 'var(--timbergem-text)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle action
                }}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>

        {/* Navigate arrow */}
        <ChevronRight 
          className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ color: 'var(--timbergem-muted)' }}
        />
      </div>
    </div>
  );
}