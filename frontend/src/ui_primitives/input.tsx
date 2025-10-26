import { forwardRef, InputHTMLAttributes } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type TGInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TGInput = forwardRef<HTMLInputElement, TGInputProps>(function TGInput(
  { className, style, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cx('tg-ui2', className)}
      style={{
        width: '100%',
        border: '1px solid var(--tg-border)',
        borderRadius: 'var(--tg-radius-sm)',
        padding: '6px 10px',
        backgroundColor: 'var(--tg-panel)',
        color: 'var(--tg-text)',
        fontSize: 'var(--tg-font-sm)',
        boxSizing: 'border-box',
        display: 'block',
        userSelect: 'text', // Ensure text is selectable
        cursor: 'text',
        ...style,
      }}
      {...rest}
    />
  );
});
