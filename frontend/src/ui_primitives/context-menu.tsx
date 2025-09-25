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
} from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import '../ui_v2/theme/tokens.css';
import { TGPortal } from './portal';
import { cx } from '../ui_v2/utils/classNames';

type Position = { x: number; y: number } | null;

type ContextMenuContextValue = {
  open: boolean;
  position: Position;
  setOpen: (open: boolean) => void;
  setPosition: (pos: Position) => void;
};

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

type TGContextMenuProps = PropsWithChildren<{}>;

export function TGContextMenu({ children }: TGContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>(null);

  const value = useMemo<ContextMenuContextValue>(
    () => ({ open, position, setOpen, setPosition }),
    [open, position]
  );

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

type TGContextMenuTriggerProps = PropsWithChildren<{}>;

export function TGContextMenuTrigger({ children }: TGContextMenuTriggerProps) {
  const context = useContextMenu();
  const child = Array.isArray(children) ? children[0] : children;
  if (!child || typeof child !== 'object') {
    return null;
  }
  const element = child as ReactElement;

  return cloneElement(element, {
    onContextMenu: (event: ReactMouseEvent) => {
      event.preventDefault();
      context.setPosition({ x: event.clientX, y: event.clientY });
      context.setOpen(true);
      element.props?.onContextMenu?.(event);
    },
  });
}

type TGContextMenuContentProps = PropsWithChildren<{ className?: string; style?: CSSProperties }>;

export function TGContextMenuContent({ children, className, style }: TGContextMenuContentProps) {
  const context = useContextMenu();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => context.setOpen(false), [context]);

  useEffect(() => {
    if (!context.open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [close, context.open]);

  if (!context.open || !context.position) return null;

  return (
    <TGPortal>
      <div
        ref={containerRef}
        className={cx('tg-ui2', className)}
        style={{
          position: 'fixed',
          top: context.position.y,
          left: context.position.x,
          backgroundColor: 'var(--tg-panel-elevated)',
          border: '1px solid var(--tg-border)',
          borderRadius: 'var(--tg-radius-md)',
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
          padding: '4px 0',
          minWidth: '180px',
          ...style,
        }}
      >
        {children}
      </div>
    </TGPortal>
  );
}

type TGContextMenuItemProps = PropsWithChildren<{
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}>;

export function TGContextMenuItem({ children, onSelect, className, style }: TGContextMenuItemProps) {
  const context = useContextMenu();
  const handleClick = () => {
    onSelect?.();
    context.setOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cx('tg-ui2', className)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        padding: '6px 12px',
        fontSize: 'var(--tg-font-sm)',
        color: 'var(--tg-text)',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function useContextMenu(): ContextMenuContextValue {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('TGContextMenu components must be used inside <TGContextMenu>');
  }
  return context;
}
