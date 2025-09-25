import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGButton } from '../../ui_primitives/button';
import { TGScrollArea } from '../../ui_primitives/scroll-area';
import { cx } from '../utils/classNames';

export interface OCRBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface OCRPickerProps {
  open?: boolean;
  x?: number;
  y?: number;
  ocrBlocks?: OCRBlock[];
  onSelect?: (block: OCRBlock) => void;
  onClose?: () => void;
}

export function OCRPicker({ open = false, x = 0, y = 0, ocrBlocks = [], onSelect, onClose }: OCRPickerProps) {
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
          left: x,
          top: y,
          width: '500px',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          borderColor: 'var(--tg-border)',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--tg-border)' }}>
          <h3 style={{ color: 'var(--tg-text)', fontSize: 'var(--tg-font-md)', margin: 0 }}>Select OCR Text</h3>
          <p style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)', marginTop: '4px' }}>
            Choose text to create scope definition
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, borderRight: '1px solid var(--tg-border)' }}>
            <TGScrollArea style={{ height: '100%', padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ocrBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className="tg-ui2"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '12px',
                      borderRadius: 'var(--tg-radius-sm)',
                      border: '1px solid var(--tg-border)',
                      backgroundColor: 'var(--tg-panel-elevated)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      onSelect?.(block);
                      onClose?.();
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = 'var(--tg-panel)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'var(--tg-panel-elevated)';
                    }}
                  >
                    <span style={{ color: 'var(--tg-text)', fontSize: 'var(--tg-font-sm)', fontWeight: 500 }}>
                      {block.text}
                    </span>
                    <span style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>
                      Confidence: {Math.round(block.confidence * 100)}%
                    </span>
                  </button>
                ))}
                {ocrBlocks.length === 0 ? (
                  <span style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>No OCR blocks found.</span>
                ) : null}
              </div>
            </TGScrollArea>
          </div>

          <div style={{ flex: 1, padding: '16px' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                border: '1px solid var(--tg-border)',
                borderRadius: 'var(--tg-radius-md)',
                backgroundColor: 'var(--tg-panel)',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: '8px' }}>
                {ocrBlocks.map((block) => (
                  <div
                    key={block.id}
                    style={{
                      position: 'absolute',
                      left: `${block.x / 4}px`,
                      top: `${block.y / 4}px`,
                      width: `${block.width / 4}px`,
                      height: `${block.height / 4}px`,
                      border: '2px dashed var(--tg-accent)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onSelect?.(block);
                      onClose?.();
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-14px',
                        left: 0,
                        backgroundColor: 'var(--tg-accent)',
                        color: 'var(--tg-accent-contrast)',
                        fontSize: '8px',
                        padding: '2px 4px',
                        borderRadius: 'var(--tg-radius-sm)',
                      }}
                    >
                      {block.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)', marginTop: '8px', textAlign: 'center' }}>
              Click on highlighted text blocks to select
            </p>
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--tg-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <TGButton variant="ghost" onClick={onClose} style={{ color: 'var(--tg-muted)' }}>
            Cancel
          </TGButton>
        </div>
      </TGCard>
    </>
  );
}
