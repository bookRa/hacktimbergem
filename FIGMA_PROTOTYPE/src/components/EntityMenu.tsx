import { Card } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Edit, 
  Settings, 
  Link, 
  Copy, 
  Trash2 
} from 'lucide-react';

export type EntityKind = 
  | 'Drawing' 
  | 'Legend' 
  | 'Schedule' 
  | 'Note' 
  | 'Space' 
  | 'SymbolDef' 
  | 'CompDef' 
  | 'SymbolInst' 
  | 'CompInst' 
  | 'Scope';

interface EntityMenuProps {
  open?: boolean;
  kind?: EntityKind;
  x?: number;
  y?: number;
  onAction?: (action: string) => void;
  onClose?: () => void;
}

export function EntityMenu({
  open = false,
  kind = 'SymbolInst',
  x = 0,
  y = 0,
  onAction,
  onClose
}: EntityMenuProps) {
  if (!open) return null;

  const getActionsForKind = (kind: EntityKind) => {
    const baseActions = [
      { id: 'edit-bbox', label: 'Edit bounding box', icon: Edit },
      { id: 'edit-properties', label: 'Edit properties', icon: Settings },
    ];

    // Add kind-specific actions
    const kindSpecificActions = [];
    
    if (['SymbolInst', 'CompInst', 'Scope'].includes(kind)) {
      kindSpecificActions.push({ id: 'link', label: 'Link…', icon: Link });
    }

    const endActions = [
      { id: 'duplicate', label: 'Duplicate', icon: Copy },
      { id: 'delete', label: 'Delete', icon: Trash2 },
    ];

    return [...baseActions, ...kindSpecificActions, ...endActions];
  };

  const actions = getActionsForKind(kind);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <Card 
        className="absolute z-50 p-1 w-48 border"
        style={{
          left: x,
          top: y,
          backgroundColor: 'var(--timbergem-panel-elevated)',
          borderColor: 'var(--timbergem-border)',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="space-y-1">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isDestructive = action.id === 'delete';
            const needsSeparator = index === actions.length - 2; // Before delete
            
            return (
              <div key={action.id}>
                {needsSeparator && <Separator className="my-1" />}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 px-2"
                  style={{
                    color: isDestructive ? 'var(--timbergem-warn)' : 'var(--timbergem-text)'
                  }}
                  onClick={() => {
                    onAction?.(action.id);
                    onClose?.();
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}