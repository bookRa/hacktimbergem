import { forwardRef, HTMLAttributes } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type TGSeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
};

export const TGSeparator = forwardRef<HTMLDivElement, TGSeparatorProps>(function TGSeparator(
  { className, style, orientation = 'horizontal', ...rest },
  ref
) {
  const isHorizontal = orientation === 'horizontal';
  return (
    <div
      ref={ref}
      className={cx('tg-ui2', className)}
      style={{
        backgroundColor: 'var(--tg-border)',
        height: isHorizontal ? '1px' : '100%',
        width: isHorizontal ? '100%' : '1px',
        ...style,
      }}
      {...rest}
    />
  );
});
