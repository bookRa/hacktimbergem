import type { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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
  style?: CSSProperties;
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
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
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onPointerDown,
}: BBoxProps) {
  return (
    <div
      className={cx('tg-ui2', className)}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        transition: 'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
        left: x,
        top: y,
        width,
        height,
        ...variantStyles[variant],
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  );
}
