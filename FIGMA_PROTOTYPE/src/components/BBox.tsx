import { useState } from 'react';
import { cn } from './ui/utils';

export type BBoxVariant = 'normal' | 'hover' | 'selected' | 'incomplete';

interface BBoxProps {
  variant?: BBoxVariant;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function BBox({
  variant = 'normal',
  x,
  y,
  width,
  height,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave
}: BBoxProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'hover':
        return {
          border: '2px solid var(--timbergem-hover)',
          boxShadow: '0 0 8px var(--timbergem-hover)',
          backgroundColor: 'transparent'
        };
      case 'selected':
        return {
          border: '2px solid var(--timbergem-selection)',
          boxShadow: '0 0 0 2px var(--timbergem-selection) inset',
          backgroundColor: 'transparent'
        };
      case 'incomplete':
        return {
          border: '2px dashed var(--timbergem-warn)',
          backgroundColor: 'transparent'
        };
      default: // normal
        return {
          border: '2px solid var(--timbergem-border)',
          backgroundColor: 'transparent'
        };
    }
  };

  return (
    <div
      className="absolute cursor-pointer transition-all duration-150"
      style={{
        left: x,
        top: y,
        width,
        height,
        ...getVariantStyles()
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}