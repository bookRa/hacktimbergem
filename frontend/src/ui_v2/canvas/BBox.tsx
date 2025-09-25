import type { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import '../theme/tokens.css';
import { cx } from '../utils/classNames';

export type BBoxVariant = 'normal' | 'hover' | 'selected' | 'incomplete';

interface BBoxProps {
  variant?: BBoxVariant;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  className?: string;
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const variantStyles: Record<BBoxVariant, CSSProperties> = {
  normal: {
    border: '2px solid var(--tg-border)',
    backgroundColor: 'transparent',
  },
  hover: {
    border: '2px solid var(--tg-hover)',
    boxShadow: '0 0 8px var(--tg-hover)',
    backgroundColor: 'transparent',
  },
  selected: {
    border: '2px solid var(--tg-selection)',
    boxShadow: '0 0 0 2px var(--tg-selection) inset',
    backgroundColor: 'transparent',
  },
  incomplete: {
    border: '2px dashed var(--tg-warn)',
    backgroundColor: 'transparent',
  },
};

export function BBox({
  variant = 'normal',
  x,
  y,
  width,
  height,
  children,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}: BBoxProps) {
  return (
    <div
      className={cx('tg-ui2', className)}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        left: x,
        top: y,
        width,
        height,
        ...variantStyles[variant],
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
