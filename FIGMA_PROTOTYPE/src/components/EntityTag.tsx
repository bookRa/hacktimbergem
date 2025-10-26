import { 
  Triangle, 
  Square, 
  Calendar, 
  StickyNote, 
  Home, 
  Component, 
  Copy,
  AlertTriangle,
  Shapes,
  Box
} from 'lucide-react';

export type EntityType = 
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

interface EntityTagProps {
  type: EntityType;
  id: string;
  incomplete?: boolean;
  className?: string;
}

const entityConfig = {
  Drawing: { icon: Triangle, label: 'DWG' },
  Legend: { icon: Square, label: 'LEG' },
  Schedule: { icon: Calendar, label: 'SCH' },
  Note: { icon: StickyNote, label: 'NOT' },
  Space: { icon: Home, label: 'SPC' },
  SymbolDef: { icon: Shapes, label: 'SYM' },
  CompDef: { icon: Box, label: 'CMP' },
  SymbolInst: { icon: Component, label: 'SYM' },
  CompInst: { icon: Copy, label: 'CMP' },
  Scope: { icon: Component, label: 'SCP' },
};

export function EntityTag({ type, id, incomplete = false, className }: EntityTagProps) {
  const config = entityConfig[type];
  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${className}`}
      style={{
        backgroundColor: incomplete 
          ? 'var(--timbergem-warn)' 
          : 'var(--timbergem-panel-elevated)',
        color: incomplete 
          ? 'var(--timbergem-warn-contrast)' 
          : 'var(--timbergem-text)',
        border: `1px solid ${incomplete ? 'var(--timbergem-warn)' : 'var(--timbergem-border)'}`
      }}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      <span style={{ color: incomplete ? 'var(--timbergem-warn-contrast)' : 'var(--timbergem-muted)' }}>
        {id}
      </span>
      {incomplete && (
        <AlertTriangle className="h-3 w-3" />
      )}
    </div>
  );
}