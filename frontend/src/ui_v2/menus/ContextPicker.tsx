import { useMemo, useState } from 'react';
import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGInput } from '../../ui_primitives/input';
import { TGScrollArea } from '../../ui_primitives/scroll-area';
import { cx } from '../utils/classNames';

type EntityDescriptor = {
  type: string;
  label: string;
  description: string;
  icon: () => JSX.Element;
};

const iconSize = 14;

const SearchIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="13" y1="13" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TriangleIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 2.2 14 13.8H2L8 2.2Z" />
  </svg>
);

const SquareIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4" />
  </svg>
);

const CalendarIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.2" />
    <rect x="2.5" y="5.5" width="11" height="1.2" fill="var(--tg-border)" />
    <rect x="5" y="2" width="1.2" height="3" />
    <rect x="10" y="2" width="1.2" height="3" />
  </svg>
);

const NoteIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="3" y="2.5" width="10" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M4.8 5.4h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4.8 8h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4.8 10.6h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const HomeIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 2.5 14.5 7v7.5H10.5V10H5.5v4.5H1.5V7L8 2.5Z" />
  </svg>
);

const ComponentIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" />
    <rect x="5.5" y="5.5" width="5" height="5" fill="var(--tg-panel-elevated)" rx="1.2" />
  </svg>
);

const CopyIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="4.2" y="4.2" width="8.2" height="8.2" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
    <rect x="2.2" y="2.2" width="8.2" height="8.2" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const ShapesIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <circle cx="6" cy="6" r="3.2" />
    <rect x="8.6" y="8.4" width="5" height="5" rx="1.2" />
  </svg>
);

const BoxIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3 4.2 8 2l5 2.2v7.4L8 13.8l-5-2.2V4.2Z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 2v11.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const entityTypes: EntityDescriptor[] = [
  { type: 'Drawing', label: 'Drawing', description: 'Architectural drawing or plan', icon: TriangleIcon },
  { type: 'Legend', label: 'Legend', description: 'Symbol legend or key', icon: SquareIcon },
  { type: 'Schedule', label: 'Schedule', description: 'Schedule or table', icon: CalendarIcon },
  { type: 'Note', label: 'Note', description: 'Text note or annotation', icon: NoteIcon },
  { type: 'Space', label: 'Space', description: 'Room or space boundary', icon: HomeIcon },
  { type: 'Symbol Instance', label: 'Symbol Instance', description: 'Instance of a symbol', icon: ComponentIcon },
  { type: 'Component Instance', label: 'Component Instance', description: 'Instance of a component', icon: CopyIcon },
  { type: 'Symbol Definition', label: 'Symbol Definition', description: 'Symbol definition', icon: ShapesIcon },
  { type: 'Component Definition', label: 'Component Definition', description: 'Component definition', icon: BoxIcon },
  { type: 'Scope', label: 'Scope', description: 'Work scope or trade', icon: ComponentIcon },
];

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

export function ContextPicker({
  open = false,
  placement = 'bottom',
  context = 'empty',
  x = 0,
  y = 0,
  onSelect,
  onClose,
}: ContextPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTypes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entityTypes;
    return entityTypes.filter((item) =>
      item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  if (!open) return null;

  return (
    <>
      <div className="tg-ui2" style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />

      <TGCard
        data-ui2-overlay-ignore
        className={cx('tg-ui2')}
        style={{
          position: 'absolute',
          zIndex: 50,
          padding: '16px',
          width: '320px',
          left: x,
          top: y,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          borderColor: 'var(--tg-border)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--tg-muted)',
                display: 'inline-flex',
              }}
            >
              <SearchIcon />
            </span>
            <TGInput
              placeholder="Search entity types..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{
                paddingLeft: '32px',
                backgroundColor: 'var(--tg-panel)',
                borderColor: 'var(--tg-border)',
              }}
            />
          </div>

          <TGScrollArea style={{ maxHeight: '260px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredTypes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    className="tg-ui2"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: 'var(--tg-radius-sm)',
                      border: '1px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      onSelect?.(item.type);
                      onClose?.();
                    }}
                    onMouseEnter={(event) => {
                      (event.currentTarget.style.backgroundColor = 'var(--tg-panel)');
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ color: 'var(--tg-accent)', display: 'inline-flex' }}>
                      <Icon />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--tg-text)', fontSize: 'var(--tg-font-sm)', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <span style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </TGScrollArea>
        </div>
      </TGCard>
    </>
  );
}
