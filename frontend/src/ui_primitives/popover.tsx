import {
  PropsWithChildren,
  ReactElement,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from 'react';
import type { CSSProperties } from 'react';
import '../ui_v2/theme/tokens.css';
import { TGPortal } from './portal';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

type TGPopoverProps = PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function TGPopover({ open, defaultOpen, onOpenChange, children }: TGPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const isControlled = typeof open === 'boolean';
  const currentOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = useMemo<PopoverContextValue>(() => ({ open: currentOpen, setOpen }), [currentOpen, setOpen]);

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

type TGPopoverTriggerProps = PropsWithChildren<{ asChild?: boolean }>;

export function TGPopoverTrigger({ children }: TGPopoverTriggerProps) {
  const context = usePopoverContext();
  const child = Array.isArray(children) ? children[0] : children;
  if (!child || typeof child !== 'object') {
    return null;
  }
  const element = child as ReactElement;

  return cloneElement(element, {
    onClick: (event: ReactMouseEvent) => {
      element.props?.onClick?.(event);
      context.setOpen(!context.open);
    },
  });
}

type TGPopoverContentProps = PropsWithChildren<{ className?: string; style?: CSSProperties }>;

export function TGPopoverContent({ children, className, style }: TGPopoverContentProps) {
  const context = usePopoverContext();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!context.open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        context.setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        context.setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [context]);

  if (!context.open) return null;

  return (
    <TGPortal>
      <div
        ref={containerRef}
        className={className}
        style={{
          backgroundColor: 'var(--tg-panel-elevated)',
          border: '1px solid var(--tg-border)',
          borderRadius: 'var(--tg-radius-md)',
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
          ...style,
        }}
      >
        {children}
      </div>
    </TGPortal>
  );
}

function usePopoverContext(): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('TGPopover components must be used inside <TGPopover>');
  }
  return context;
}
