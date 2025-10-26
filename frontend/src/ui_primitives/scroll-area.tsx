import { forwardRef, HTMLAttributes } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type TGScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'vertical' | 'horizontal';
  size?: number;
};

export const TGScrollArea = forwardRef<HTMLDivElement, TGScrollAreaProps>(function TGScrollArea(
  { className, style, orientation = 'vertical', size, ...rest },
  ref
) {
  const overflowX = orientation === 'horizontal' ? 'auto' : 'hidden';
  const overflowY = orientation === 'vertical' ? 'auto' : 'hidden';

  return (
    <div
      ref={ref}
      className={cx('tg-ui2', className)}
      style={{
        overflowX,
        overflowY,
        maxHeight: orientation === 'vertical' && size ? `${size}px` : undefined,
        maxWidth: orientation === 'horizontal' && size ? `${size}px` : undefined,
        ...style,
      }}
      {...rest}
    />
  );
});
