import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import '../css/order-popup.css';

export default function OrderPopup({ title, eyebrow, description, icon: Icon, variant, onClose, children }: {
  title: string; eyebrow: string; description: string; icon: LucideIcon;
  variant: 'editor' | 'budget'; onClose: () => void; children: ReactNode;
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
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`arl-3d-popup arl-3d-${variant}`}>
      <header className="arl-3d-header">
        <svg className="arl-3d-chrome" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={`chrome-${variant}`} x2="0" y2="1"><stop stopColor="#09090b"/><stop offset="1" stopColor="#323238"/></linearGradient><pattern id={`dots-${variant}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#c4c4ce" opacity=".5"/></pattern></defs>
          <path d="M0 0H120L83 24H64L0 137Z" fill={`url(#chrome-${variant})`}/><path d="M0 108L73 5H112" fill="none" stroke="#ff0018" strokeWidth="3"/><path d="M0 3H73L0 91Z" fill={`url(#dots-${variant})`}/><path d="M132 0h10l-15 19h-10ZM0 127l26-25h7L0 142Z" fill="#f40015"/>
          <path d="M1200 0H1050L1129 87L1062 150H1200Z" fill={`url(#chrome-${variant})`}/><path d="M1200 0H1055l13 12h37l43 73-68 65h-18l73-71-61-67h-9l-11-12Z" fill="#ee0717"/><path d="M1196 8H1110l67 73-50 69h69Z" fill={`url(#dots-${variant})`}/>
          <g fill="none" stroke="#c4c3cd" strokeWidth="1" opacity=".7"><path d="M877 16h128l48 48h41l39 39"/><path d="M857 27h142l50 50h42l34 34"/><path d="M888 39h105l49 49h42l31 30"/><path d="M883 52h104l46 47h45l30 30"/><path d="M934 12h77l24 24h48"/></g>
          <g fill="#f00018"><circle cx="879" cy="16" r="2"/><circle cx="1005" cy="64" r="2"/><circle cx="1048" cy="77" r="2"/><circle cx="1084" cy="118" r="2"/></g>
          <path d="M18 2H1183" stroke="white" strokeWidth="2" opacity=".8"/>
        </svg>
        <span className="arl-3d-heading-icon"><Icon /></span>
        <div className="arl-3d-heading"><span className="arl-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
        <button type="button" className="arl-3d-close" aria-label={variant === 'editor' ? 'Cancelar edição' : 'Fechar orçamento'} onClick={onClose}><X /></button>
      </header>
      {children}
    </section>
  </div>, document.body);
}
