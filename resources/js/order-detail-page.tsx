import { useEffect } from 'react';
import OrderDetailReact from './order-detail-react';

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
  useEffect(() => {
    cleanupDetachedOrderArtifacts();
    return cleanupDetachedOrderArtifacts;
  }, [props.id]);

  return <OrderDetailReact {...props}/>;
}
