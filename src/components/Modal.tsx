import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({ title, eyebrow, seal, children, onClose, className = '' }: { title: string; eyebrow: string; seal?: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab' || !element) return;
      const focusable = Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, a[href], [tabindex="0"]'));
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable.at(-1)!;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    element?.addEventListener('keydown', keydown);
    return () => { element?.removeEventListener('keydown', keydown); before?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-frame">
      <span className="scroll-rod scroll-rod--top" aria-hidden="true" />
      <div ref={ref} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="modal-header"><div className="modal-heading"><span className="modal-seal" aria-hidden="true">{seal ?? title.slice(0, 1)}</span><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></div><button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><X size={22} strokeWidth={1.3} /></button></header>
        {children}
      </div>
      <span className="scroll-rod scroll-rod--bottom" aria-hidden="true" />
    </div>
  </div>;
}
