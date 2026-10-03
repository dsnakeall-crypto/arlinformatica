import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import '../css/order-popup.css';

export default function OrderPopup({ title, eyebrow, description, icon: Icon, variant, onClose, children, closeLabel, theme }: {
  title: string; eyebrow: string; description: string; icon: LucideIcon;
  variant: 'editor' | 'budget'; onClose: () => void; children: ReactNode;
  closeLabel?: string; theme?: 'expense';
}) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dialog.current?.querySelector('[role="dialog"]')) {
        event.preventDefault(); close.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from((dialog.current?.querySelector<HTMLElement>('[role="dialog"]') ?? dialog.current)?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  return createPortal(<div className="arl-3d-overlay" data-arl-order-detail-react="1">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`arl-3d-popup arl-3d-${variant}${theme === 'expense' ? ' cg-popup-blue' : ''}`}>
      <header className="arl-3d-header">
        <span className="arl-3d-heading-icon"><Icon /></span>
        <div className="arl-3d-heading"><span className="arl-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
        <button type="button" className="arl-3d-close" aria-label={closeLabel || (variant === 'editor' ? 'Cancelar edição' : 'Fechar orçamento')} onClick={onClose}><X /></button>
      </header>
      {children}
    </section>
  </div>, document.body);
}
