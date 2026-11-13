import { useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({ title, eyebrow, seal, children, notice, onClose, onBack, backLabel, restoreFocus, className = '' }: { title: string; eyebrow: string; seal?: string; children: ReactNode; notice?: ReactNode; onClose: () => void; onBack?: () => void; backLabel?: string; restoreFocus?: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLElement | null>(null);
  const escapeRef = useRef(onBack ?? onClose); escapeRef.current = onBack ?? onClose;
  const restoreRef = useRef(restoreFocus); restoreRef.current = restoreFocus;
  useLayoutEffect(() => { before.current = document.activeElement as HTMLElement | null; }, []);
  useLayoutEffect(() => { ref.current?.focus({ preventScroll: true }); }, [title]);
  useEffect(() => {
    const element = ref.current;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) escapeRef.current(); return; }
      if (event.key !== 'Tab' || !element) return;
      const focusable = Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), a[href], [tabindex="0"]'))
        .filter(node => node.getClientRects().length && !node.closest('[inert]') && getComputedStyle(node).visibility !== 'hidden');
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable.at(-1)!;
      const outside = !element.contains(document.activeElement);
      if (event.shiftKey && (outside || document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (outside || document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown, true);
    return () => {
      window.removeEventListener('keydown', keydown, true);
      queueMicrotask(() => {
        if (document.querySelector('[role="dialog"]')) return;
        if (restoreRef.current) restoreRef.current();
        else if (before.current?.isConnected) before.current.focus({ preventScroll: true });
      });
    };
  }, []);
  return <div className="modal-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-frame">
      <span className="scroll-rod scroll-rod--top" aria-hidden="true" />
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="modal-header"><div className="modal-heading"><span className="modal-seal" aria-hidden="true">{seal ?? title.slice(0, 1)}</span><div>{onBack ? <button className="modal-back" onClick={onBack}><ChevronLeft size={14} aria-hidden="true" />{backLabel ?? '返回'}</button> : <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div></div><button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><X size={22} strokeWidth={1.3} /></button></header>
        {notice}
        {children}
      </div>
      <span className="scroll-rod scroll-rod--bottom" aria-hidden="true" />
    </div>
  </div>;
}
