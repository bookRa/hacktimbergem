import { forwardRef, ButtonHTMLAttributes, CSSProperties } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type ButtonVariant = 'solid' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md';

type TGButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const sizeMap: Record<ButtonSize, { padding: string; fontSize: string }> = {
  sm: { padding: '4px 10px', fontSize: 'var(--tg-font-xs)' },
  md: { padding: '6px 14px', fontSize: 'var(--tg-font-sm)' },
};

export const TGButton = forwardRef<HTMLButtonElement, TGButtonProps>(function TGButton(
  { className, style, variant = 'solid', size = 'md', disabled, ...rest },
  ref
) {
  const sizeStyles = sizeMap[size];
  const baseStyle: CSSProperties = {
    borderRadius: 'var(--tg-radius-sm)',
    border: '1px solid transparent',
    backgroundColor: 'var(--tg-accent)',
    color: 'var(--tg-accent-contrast)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontSize: sizeStyles.fontSize,
    padding: sizeStyles.padding,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    justifyContent: 'center',
    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
  };

  if (variant === 'ghost') {
    baseStyle.backgroundColor = 'transparent';
    baseStyle.border = '1px solid transparent';
    baseStyle.color = 'var(--tg-muted)';
  } else if (variant === 'outline') {
    baseStyle.backgroundColor = 'var(--tg-panel)';
    baseStyle.border = '1px solid var(--tg-border)';
    baseStyle.color = 'var(--tg-text)';
  }

  return (
    <button
      ref={ref}
      className={cx('tg-ui2', className)}
      style={{
        ...baseStyle,
        ...style,
      }}
      disabled={disabled}
      {...rest}
    />
  );
});
