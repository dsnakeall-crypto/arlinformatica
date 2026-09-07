import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react';
import OrderDetailReact from './order-detail-react';
import UnifiedOrderEditor from './order-editor-unified';

type Props = { id: number; back: () => void };

const DETACHED_ORDER_ARTIFACTS = [
  '.arl-od-modal',
  '.arl-status-modal',
  '.arl-photo-choice',
  '.arl-camera-modal',
  '.arl-final-share-host',
  '.arl-od-sharebar',
  '.arl-order-quick-actions',
  '.arl-order-opened-modal',
].join(', ');

function cleanupDetachedOrderArtifacts() {
  document.querySelectorAll<HTMLElement>(DETACHED_ORDER_ARTIFACTS).forEach((node) => {
    if (node.closest('[data-arl-order-detail-react="1"]')) return;
    node.remove();
  });
}

export default function OrderDetailPage(props: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);

  useEffect(() => {
    setEditorOpen(false);
    cleanupDetachedOrderArtifacts();
    return cleanupDetachedOrderArtifacts;
  }, [props.id]);

  const interceptEditor = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button.arl-od-btn');
    if (!button || !button.textContent?.includes('Editar OS')) return;
    event.preventDefault();
    event.stopPropagation();
    setEditorOpen(true);
  };

  return <div data-arl-unified-order-editor-host="1" onClickCapture={interceptEditor}>
    <OrderDetailReact key={`${props.id}-${detailRevision}`} {...props}/>
    {editorOpen && <UnifiedOrderEditor orderId={props.id} onClose={() => setEditorOpen(false)} onSaved={() => { setEditorOpen(false); setDetailRevision((current) => current + 1); }}/>} 
  </div>;
}
