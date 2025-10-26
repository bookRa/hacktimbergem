import { forwardRef, HTMLAttributes } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type TGCardProps = HTMLAttributes<HTMLDivElement>;

export const TGCard = forwardRef<HTMLDivElement, TGCardProps>(function TGCard(
  { className, style, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx('tg-ui2', className)}
      style={{
        backgroundColor: 'var(--tg-panel-elevated)',
        border: '1px solid var(--tg-border)',
        borderRadius: 'var(--tg-radius-md)',
        color: 'var(--tg-text)',
        ...style,
      }}
      {...rest}
    />
  );
});
