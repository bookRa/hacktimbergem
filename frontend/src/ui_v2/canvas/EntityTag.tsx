import type { ReactElement } from 'react';
import '../theme/tokens.css';
import { cx } from '../utils/classNames';

export type EntityType =
  | 'Drawing'
  | 'Legend'
  | 'Schedule'
  | 'AssemblyGroup'
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

const iconSize = 12;

const TriangleIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <path d="M6 1.2 10.8 10.8H1.2L6 1.2Z" />
  </svg>
);

const SquareIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
  </svg>
);

const CalendarIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <rect x="1.5" y="2.5" width="9" height="8" rx="1" />
    <rect x="1.5" y="4" width="9" height="1" fill="var(--tg-border)" />
    <rect x="3" y="1" width="1" height="2" />
    <rect x="8" y="1" width="1" height="2" />
  </svg>
);

const NoteIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect x="2" y="1.5" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3.5 3.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M3.5 6h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M3.5 8.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const HomeIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <path d="M6 1.5 10.5 5v5H7.5V7.2h-3V10H1.5V5L6 1.5Z" />
  </svg>
);

const ShapesIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <circle cx="4" cy="4" r="2.5" />
    <rect x="6.5" y="5.5" width="4" height="4" rx="1" />
  </svg>
);

const BoxIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M1.8 3.2 6 1.4l4.2 1.8v4.8L6 10.6 1.8 8V3.2Z" stroke="currentColor" strokeWidth="1.1" />
    <path d="M6 1.4v9.2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M1.8 3.2 6 5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M10.2 3.2 6 5" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const ComponentIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <rect x="1.5" y="1.5" width="9" height="9" rx="2" />
    <rect x="4" y="4" width="4" height="4" fill="var(--tg-panel-elevated)" rx="0.8" />
  </svg>
);

const CopyIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect x="3" y="3" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
    <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const WarningIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
    <path d="M6 1.5 11 10.5H1L6 1.5Z" />
    <rect x="5.5" y="4" width="1" height="3.5" fill="var(--tg-warn-contrast)" />
    <rect x="5.5" y="8.3" width="1" height="1" fill="var(--tg-warn-contrast)" />
  </svg>
);

const entityConfig: Record<
  EntityType,
  { icon: () => ReactElement; label: string }
> = {
  Drawing: { icon: TriangleIcon, label: 'DWG' },
  Legend: { icon: SquareIcon, label: 'LEG' },
  Schedule: { icon: CalendarIcon, label: 'SCH' },
  AssemblyGroup: { icon: BoxIcon, label: 'ASM' },
  Note: { icon: NoteIcon, label: 'NOT' },
  Space: { icon: HomeIcon, label: 'SPC' },
  SymbolDef: { icon: ShapesIcon, label: 'SYM' },
  CompDef: { icon: BoxIcon, label: 'CMP' },
  SymbolInst: { icon: ComponentIcon, label: 'SYM' },
  CompInst: { icon: CopyIcon, label: 'CMP' },
  Scope: { icon: ComponentIcon, label: 'SCP' },
};

export function EntityTag({ type, id, incomplete = false, className }: EntityTagProps) {
  const config = entityConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cx('tg-ui2', 'tg-ui2-entity-tag', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: 'var(--tg-radius-sm)',
        fontSize: 'var(--tg-font-xs)',
        fontWeight: 500,
        backgroundColor: incomplete ? 'var(--tg-warn)' : 'var(--tg-panel-elevated)',
        color: incomplete ? 'var(--tg-warn-contrast)' : 'var(--tg-text)',
        border: `1px solid ${incomplete ? 'var(--tg-warn)' : 'var(--tg-border)'}`,
      }}
    >
      <span style={{ display: 'inline-flex', color: incomplete ? 'var(--tg-warn-contrast)' : 'var(--tg-accent)' }}>
        <Icon />
      </span>
      <span>{config.label}</span>
      <span style={{ color: incomplete ? 'var(--tg-warn-contrast)' : 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>
        {id}
      </span>
      {incomplete ? (
        <span style={{ display: 'inline-flex', color: 'var(--tg-warn-contrast)' }}>
          <WarningIcon />
        </span>
      ) : null}
    </div>
  );
}
