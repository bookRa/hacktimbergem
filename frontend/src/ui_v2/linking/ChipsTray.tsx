import '../theme/tokens.css';
import { TGButton } from '../../ui_primitives/button';
import { cx } from '../utils/classNames';

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

const iconSize = 14;

const LinkIcon = () => (
  <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M6.5 9.5 9.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path
      d="M5.5 12c-1.38 0-2.5-1.12-2.5-2.5S4.12 7 5.5 7h1.2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M10.5 4c1.38 0 2.5 1.12 2.5 2.5S11.88 9 10.5 9H9.3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export function ChipsTray({ open = false, chips = [], onRemoveChip, onFinish, onCancel }: ChipsTrayProps) {
  if (!open) return null;

  return (
    <div
      data-ui2-overlay-ignore
      className={cx('tg-ui2')}
      style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
    >
      <div
        className="tg-ui2"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          borderRadius: 'var(--tg-radius-lg)',
          border: '1px solid var(--tg-border)',
          backgroundColor: 'var(--tg-panel-elevated)',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', color: 'var(--tg-accent)' }}>
            <LinkIcon />
          </span>
          <span style={{ color: 'var(--tg-text)', fontSize: 'var(--tg-font-sm)', fontWeight: 500 }}>Linking mode</span>
        </div>

        {chips.length > 0 ? (
          <>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--tg-border)' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className="tg-ui2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: 'var(--tg-radius-sm)',
                    border: '1px solid var(--tg-border)',
                    backgroundColor: 'var(--tg-panel)',
                    fontSize: 'var(--tg-font-xs)',
                    color: 'var(--tg-text)',
                  }}
                >
                  <span>{chip.label}</span>
                  <span style={{ color: 'var(--tg-muted)' }}>({chip.type})</span>
                  <button
                    type="button"
                    onClick={() => onRemoveChip?.(chip.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      color: 'var(--tg-muted)',
                    }}
                    aria-label={`Remove ${chip.label}`}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--tg-border)' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <TGButton variant="ghost" size="sm" onClick={onCancel} style={{ color: 'var(--tg-muted)' }}>
            Cancel
          </TGButton>
          <TGButton size="sm" onClick={onFinish} disabled={chips.length === 0}>
            Finish ({chips.length})
          </TGButton>
        </div>
      </div>
    </div>
  );
}
