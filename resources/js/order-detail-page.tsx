import { useCallback, useEffect, useRef, useState } from 'react';
import OrderDetailReact from './order-detail-react';
import UnifiedOrderEditor from './order-editor-unified';
import { appConfirm } from './app-native-dialog';

type Props = { authenticatedRole: string; onCountersChanged?: () => void; initialAction?: 'edit' | 'reopen'; id: number; back: () => void; readOnly?: boolean; onDirtyChange?: (dirty: boolean) => void; onOpenClientHistory?: (clientId: number) => void };

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
  const navigationApproved = useRef(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [editorDirty, setEditorDirty] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);
  const hasUnsavedChanges = editorDirty || detailDirty;

  useEffect(() => {
    setEditorOpen(props.initialAction === 'edit' && !props.readOnly);
    setEditorDirty(false);
    setDetailDirty(false);
    cleanupDetachedOrderArtifacts();
    return cleanupDetachedOrderArtifacts;
  }, [props.id, props.initialAction, props.readOnly]);

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
      const button = target instanceof Element ? target.closest<HTMLButtonElement>('aside button') : null;
      if (!button) return;
      if (navigationApproved.current) { navigationApproved.current = false; return; }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void appConfirm(UNSAVED_MESSAGE).then((allowed) => {
        if (!allowed || !button.isConnected) return;
        navigationApproved.current = true;
        setEditorDirty(false);
        setDetailDirty(false);
        props.onDirtyChange?.(false);
        button.click();
      });
    };
    document.addEventListener('click', guardSidebarNavigation, true);
    return () => document.removeEventListener('click', guardSidebarNavigation, true);
  }, [hasUnsavedChanges]);

  const guardBack = async () => {
    if (hasUnsavedChanges && !(await appConfirm(UNSAVED_MESSAGE))) return;
    setEditorDirty(false);
    setDetailDirty(false);
    props.onDirtyChange?.(false);
    props.back();
  };

  const openEditor = useCallback(async () => {
    if (detailDirty && !(await appConfirm(UNSAVED_MESSAGE))) return;
    if (detailDirty) setDetailRevision((current) => current + 1);
    setDetailDirty(false);
    setEditorOpen(true);
  }, [detailDirty]);

  return <div data-arl-unified-order-editor-host="1">
    {!props.readOnly && editorOpen && <UnifiedOrderEditor
      orderId={props.id}
      onDirtyChange={setEditorDirty}
      onClose={() => { setEditorDirty(false); setEditorOpen(false); }}
      onSaved={() => {
        setEditorDirty(false);
        setEditorOpen(false);
        setDetailRevision((current) => current + 1);
      }}
    />}
    <OrderDetailReact
      authenticatedRole={props.authenticatedRole}
      onCountersChanged={props.onCountersChanged}
      key={`${props.id}-${detailRevision}`}
      id={props.id}
      reopenOnLoad={props.initialAction === 'reopen'}
      back={guardBack}
      readOnly={props.readOnly}
      onEdit={openEditor}
      onDirtyChange={setDetailDirty}
      onOpenClientHistory={props.onOpenClientHistory}
    />
  </div>;
}
