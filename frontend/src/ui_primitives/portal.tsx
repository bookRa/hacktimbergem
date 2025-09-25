import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

export function TGPortal({ children, container }: PropsWithChildren<{ container?: Element | DocumentFragment | null }>) {
  if (!children) return null;
  const target = container ?? document.body;
  return target ? createPortal(children, target) : null;
}
