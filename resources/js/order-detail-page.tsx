import { MouseEvent as ReactMouseEvent, SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import OrderDetailReact from './order-detail-react';
import UnifiedOrderEditor from './order-editor-unified';

type Props = { id: number; back: () => void };
type DirtySource = 'editor' | 'final-report' | 'services';

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

async function persistFinalReport(orderId: number, value: string) {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  const response = await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-TOKEN': token } : {}),
    },
    body: JSON.stringify({ final_report: value.trim() || null }),
  });
  const body = await response.json().catch(() => ({ message: 'Resposta inválida do servidor.' }));
  if (!response.ok) throw new Error(body.message || 'Não foi possível salvar o Laudo Final.');
}

export default function OrderDetailPage(props: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [dirtySources, setDirtySources] = useState<Set<DirtySource>>(() => new Set());
  const hostRef = useRef<HTMLDivElement>(null);
  const finalizationBypass = useRef(false);

  const setDirty = useCallback((source: DirtySource, dirty: boolean) => {
    setDirtySources((current) => {
      const hasSource = current.has(source);
      if (hasSource === dirty) return current;
      const next = new Set(current);
      dirty ? next.add(source) : next.delete(source);
      return next;
    });
  }, []);
  const setEditorDirty = useCallback((dirty: boolean) => setDirty('editor', dirty), [setDirty]);
  const hasUnsavedChanges = dirtySources.size > 0;

  useEffect(() => {
    setEditorOpen(false);
    setDirtySources(new Set());
    cleanupDetachedOrderArtifacts();
    return cleanupDetachedOrderArtifacts;
  }, [props.id]);

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
    const guardInternalNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const navigation = target?.closest('aside nav button, .notification-center > button');
      if (!navigation) return;
      if (window.confirm(UNSAVED_MESSAGE)) {
        setDirtySources(new Set());
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', guardInternalNavigation, true);
    return () => document.removeEventListener('click', guardInternalNavigation, true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new MutationObserver(() => {
      const reportMessage = host.querySelector('.arl-od-report-actions small')?.textContent?.trim();
      if (reportMessage === 'Salvo.') setDirty('final-report', false);

      const serviceMessage = host.querySelector('.arl-od-services .arl-od-foot span')?.textContent?.trim();
      if (serviceMessage === 'Serviços salvos.' || serviceMessage === 'Serviços já estão salvos.') setDirty('services', false);

      if (host.querySelector('[aria-label="FINALIZAÇÃO DA OS"]')) setDirty('services', false);
      if (host.querySelector('.completion')) {
        setDirty('final-report', false);
        setDirty('services', false);
      }
    });
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [props.id, setDirty]);

  const guardBack = () => {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_MESSAGE)) return;
    setDirtySources(new Set());
    props.back();
  };

  const trackPendingInput = (event: SyntheticEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.matches('.arl-od-report textarea') || (target.tagName === 'TEXTAREA' && target.closest('.arl-finalization'))) {
      setDirty('final-report', true);
    }
    if (target.tagName === 'INPUT' && target.closest('.arl-od-services')) {
      setDirty('services', true);
    }
  };

  const interceptActions = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    const editorButton = target.closest<HTMLButtonElement>('button.arl-od-btn');
    if (editorButton?.textContent?.includes('Editar OS')) {
      event.preventDefault();
      event.stopPropagation();
      setEditorOpen(true);
      return;
    }

    const serviceButton = target.closest<HTMLButtonElement>('.arl-od-services button');
    if (serviceButton && (serviceButton.textContent?.includes('Adicionar serviço') || serviceButton.getAttribute('aria-label')?.startsWith('Remover '))) {
      setDirty('services', true);
    }

    const finalizeButton = target.closest<HTMLButtonElement>('#finalization-action, [data-arl-finalize="1"]');
    if (!finalizeButton || !dirtySources.has('final-report')) return;
    if (finalizationBypass.current) {
      finalizationBypass.current = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const report = hostRef.current?.querySelector<HTMLTextAreaElement>('.arl-od-report textarea')?.value ?? '';
    void persistFinalReport(props.id, report)
      .then(() => {
        setDirty('final-report', false);
        finalizationBypass.current = true;
        finalizeButton.click();
      })
      .catch((reason: Error) => window.alert(reason.message));
  };

  return <div
    ref={hostRef}
    data-arl-unified-order-editor-host="1"
    onClickCapture={interceptActions}
    onInputCapture={trackPendingInput}
  >
    <OrderDetailReact key={`${props.id}-${detailRevision}`} id={props.id} back={guardBack}/>
    {editorOpen && <UnifiedOrderEditor
      orderId={props.id}
      onDirtyChange={setEditorDirty}
      onClose={() => { setDirty('editor', false); setEditorOpen(false); }}
      onSaved={() => {
        setDirty('editor', false);
        setEditorOpen(false);
        setDetailRevision((current) => current + 1);
      }}
    />}
  </div>;
}
