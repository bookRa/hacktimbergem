import { useMemo, useState } from 'react';
import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGInput } from '../../ui_primitives/input';
import { cx } from '../utils/classNames';

type EntityDescriptor = {
  type: string;
  label: string;
  description: string;
  tooltip: string;
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
  { 
    type: 'Drawing', 
    label: 'Drawing', 
    description: 'Drawing', 
    tooltip: 'Architectural drawing, plan, elevation, or section view',
    icon: TriangleIcon 
  },
  { 
    type: 'Legend', 
    label: 'Legend', 
    description: 'Legend', 
    tooltip: 'Symbol legend or key that explains drawing symbols',
    icon: SquareIcon 
  },
  { 
    type: 'Schedule', 
    label: 'Schedule', 
    description: 'Schedule', 
    tooltip: 'Schedule table (door/window/finish schedule, etc.)',
    icon: CalendarIcon 
  },
  { 
    type: 'Note', 
    label: 'Note', 
    description: 'Note', 
    tooltip: 'Text annotation, general note, or specification callout',
    icon: NoteIcon 
  },
  { 
    type: 'Space', 
    label: 'Space', 
    description: 'Space', 
    tooltip: 'Room or space boundary with area and occupancy info',
    icon: HomeIcon 
  },
  { 
    type: 'Symbol Instance', 
    label: 'Symbol', 
    description: 'Symbol', 
    tooltip: 'Instance of a symbol (door, window, fixture) placed on drawing',
    icon: ComponentIcon 
  },
  { 
    type: 'Component Instance', 
    label: 'Component', 
    description: 'Component', 
    tooltip: 'Instance of a component (equipment, furniture) placed on drawing',
    icon: CopyIcon 
  },
  { 
    type: 'Symbol Definition', 
    label: 'Symbol Def', 
    description: 'Symbol Definition', 
    tooltip: 'Symbol definition that defines keynote symbols used across drawings',
    icon: ShapesIcon 
  },
  { 
    type: 'Component Definition', 
    label: 'Component Def', 
    description: 'Component Definition', 
    tooltip: 'Component definition that defines equipment/furniture types',
    icon: BoxIcon 
  },
  { 
    type: 'Scope', 
    label: 'Scope', 
    description: 'Scope', 
    tooltip: 'Work scope or trade area (demolition, electrical, plumbing, etc.)',
    icon: ComponentIcon 
  },
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
          padding: '12px',
          width: '380px',
          left: x,
          top: y,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
          borderColor: 'var(--tg-border)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Optional Search - show only if user clicks search icon or starts typing */}
          {showSearch && (
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tg-muted)',
                  display: 'inline-flex',
                }}
              >
                <SearchIcon />
              </span>
              <TGInput
                placeholder="Filter..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
                style={{
                  paddingLeft: '28px',
                  fontSize: 'var(--tg-font-xs)',
                  height: '28px',
                  backgroundColor: 'var(--tg-panel)',
                  borderColor: 'var(--tg-border)',
                }}
              />
            </div>
          )}

          {/* 2-column grid layout */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
            }}
          >
            {filteredTypes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  className="tg-ui2"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '14px 8px',
                    borderRadius: 'var(--tg-radius-sm)',
                    border: '1px solid var(--tg-border)',
                    background: hoveredItem === item.type ? 'var(--tg-panel)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    onSelect?.(item.type);
                    onClose?.();
                  }}
                  onMouseEnter={() => setHoveredItem(item.type)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span 
                    style={{ 
                      color: 'var(--tg-accent)', 
                      display: 'inline-flex',
                      fontSize: '18px',
                    }}
                  >
                    <Icon />
                  </span>
                  <span 
                    style={{ 
                      color: 'var(--tg-text)', 
                      fontSize: 'var(--tg-font-xs)', 
                      fontWeight: 500,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip on hover */}
                  {hoveredItem === item.type && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '6px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--tg-panel-elevated)',
                        border: '1px solid var(--tg-border)',
                        borderRadius: 'var(--tg-radius-sm)',
                        color: 'var(--tg-text)',
                        fontSize: 'var(--tg-font-xs)',
                        lineHeight: 1.4,
                        whiteSpace: 'normal',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        pointerEvents: 'none',
                        maxWidth: '220px',
                        textAlign: 'center',
                      }}
                    >
                      {item.tooltip}
                      {/* Tooltip arrow */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '5px solid transparent',
                          borderRight: '5px solid transparent',
                          borderTop: '5px solid var(--tg-panel-elevated)',
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search toggle button */}
          {!showSearch && (
            <button
              type="button"
              className="tg-ui2"
              onClick={() => setShowSearch(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                borderRadius: 'var(--tg-radius-sm)',
                border: '1px solid var(--tg-border)',
                background: 'transparent',
                color: 'var(--tg-muted)',
                fontSize: 'var(--tg-font-xs)',
                cursor: 'pointer',
              }}
            >
              <SearchIcon />
              <span>Search</span>
            </button>
          )}
        </div>
      </TGCard>
    </>
  );
}
