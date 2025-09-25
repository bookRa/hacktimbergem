import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGButton } from '../../ui_primitives/button';
import { TGSeparator } from '../../ui_primitives/separator';
import { cx } from '../utils/classNames';

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

const iconSize = 12;

const EditIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M7.6 2.1 9.9 4.4 4.1 10.2H1.8V7.9L7.6 2.1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1" />
    <path d="M6 1.5V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M6 9v1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M2.2 3.8 3.3 4.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M8.7 7.4 9.8 8.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M1.5 6H3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M9 6h1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const LinkIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M4.7 7.3 7.3 4.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path
      d="M3.5 9c-1.1 0-2-0.9-2-2 0-1.1 0.9-2 2-2h1.2"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    />
    <path
      d="M8.5 3c1.1 0 2 0.9 2 2s-0.9 2-2 2H7.3"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

const CopyIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1" />
    <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const TrashIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M3 3h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M4 3V2h4v1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M4.4 4.4v4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M7.6 4.4v4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M3.4 3.9h5.2l-0.4 5.2a1 1 0 0 1-1 .9H4.8a1 1 0 0 1-1-0.9L3.4 3.9Z" stroke="currentColor" strokeWidth="1" />
  </svg>
);

interface ActionConfig {
  id: string;
  label: string;
  icon: () => JSX.Element;
  destructive?: boolean;
}

const baseActions: ActionConfig[] = [
  { id: 'edit-bbox', label: 'Edit bounding box', icon: EditIcon },
  { id: 'edit-properties', label: 'Edit properties', icon: SettingsIcon },
];

const linkableKinds: EntityKind[] = ['SymbolInst', 'CompInst', 'Scope'];

const trailingActions: ActionConfig[] = [
  { id: 'duplicate', label: 'Duplicate', icon: CopyIcon },
  { id: 'delete', label: 'Delete', icon: TrashIcon, destructive: true },
];

export function EntityMenu({
  open = false,
  kind = 'SymbolInst',
  x = 0,
  y = 0,
  onAction,
  onClose,
}: EntityMenuProps) {
  if (!open) return null;

  const actions: ActionConfig[] = [
    ...baseActions,
    ...(linkableKinds.includes(kind) ? [{ id: 'link', label: 'Link…', icon: LinkIcon }] : []),
    ...trailingActions,
  ];

  return (
    <>
      <div className="tg-ui2" style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />

      <TGCard
        data-ui2-overlay-ignore
        className={cx('tg-ui2')}
        style={{
          position: 'absolute',
          zIndex: 50,
          left: x,
          top: y,
          padding: '4px',
          width: '192px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          borderColor: 'var(--tg-border)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            const needsSeparator = index === actions.length - 2;

            return (
              <div key={action.id}>
                {needsSeparator ? <TGSeparator style={{ margin: '4px 0' }} /> : null}
                <TGButton
                  variant="ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '8px',
                    padding: '6px 8px',
                    color: action.destructive ? 'var(--tg-warn)' : 'var(--tg-text)',
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => {
                    onAction?.(action.id);
                    onClose?.();
                  }}
                >
                  <span style={{ display: 'inline-flex' }}>
                    <Icon />
                  </span>
                  {action.label}
                </TGButton>
              </div>
            );
          })}
        </div>
      </TGCard>
    </>
  );
}
