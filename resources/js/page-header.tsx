import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import '../css/page-header.css';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: ReactNode;
  counter?: ReactNode;
};

/** Shared, accessible identity header for every top-level application screen. */
export default function PageHeader({ eyebrow, title, description, icon: Icon, actions, counter }: PageHeaderProps) {
  return <header className="title page-title arl-page-header" data-testid="page-header">
    <div className="arl-page-header-copy">
      <span className="arl-page-header-icon" aria-hidden="true"><Icon /></span>
      <div className="arl-page-header-text">
        <span className="arl-eyebrow">{eyebrow}</span>
        <div className="arl-page-header-title-row">
          <h1>{title}</h1>
          {counter !== undefined && <span className="arl-page-header-counter">{counter}</span>}
        </div>
        {description && <p>{description}</p>}
      </div>
    </div>
    {actions && <div className="arl-page-header-actions">{actions}</div>}
  </header>;
}
