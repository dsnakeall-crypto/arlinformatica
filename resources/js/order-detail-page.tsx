import { useCallback, useEffect, useState } from 'react';
import OrderDetailReact from './order-detail-react';
import UnifiedOrderEditor from './order-editor-unified';

type Props = { id: number; back: () => void; onDirtyChange?: (dirty: boolean) => void };

const UNSAVED_MESSAGE = 'Existem alterações não salvas. Deseja sair sem salvar?';
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
  const [editorDirty, setEditorDirty] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);
  const hasUnsavedChanges = editorDirty || detailDirty;

  useEffect(() => {
    setEditorOpen(false);
    setEditorDirty(false);
    setDetailDirty(false);
    cleanupDetachedOrderArtifacts();
    return cleanupDetachedOrderArtifacts;
  }, [props.id]);

  useEffect(() => {
    props.onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, props.onDirtyChange]);

  useEffect(() => () => props.onDirtyChange?.(false), [props.id, props.onDirtyChange]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const guardSidebarNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('aside nav button')) return;
      if (window.confirm(UNSAVED_MESSAGE)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', guardSidebarNavigation, true);
    return () => document.removeEventListener('click', guardSidebarNavigation, true);
  }, [hasUnsavedChanges]);

  const guardBack = () => {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_MESSAGE)) return;
    setEditorDirty(false);
    setDetailDirty(false);
    props.onDirtyChange?.(false);
    props.back();
  };

  const openEditor = useCallback(() => setEditorOpen(true), []);

  return <div data-arl-unified-order-editor-host="1">
    <OrderDetailReact
      key={`${props.id}-${detailRevision}`}
      id={props.id}
      back={guardBack}
      onEdit={openEditor}
      onDirtyChange={setDetailDirty}
    />
    {editorOpen && <UnifiedOrderEditor
      orderId={props.id}
      onDirtyChange={setEditorDirty}
      onClose={() => { setEditorDirty(false); setEditorOpen(false); }}
      onSaved={() => {
        setEditorDirty(false);
        setEditorOpen(false);
        setDetailRevision((current) => current + 1);
      }}
    />}
  </div>;
}
