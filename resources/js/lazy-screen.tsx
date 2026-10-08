import { Component, Suspense, lazy, useEffect, useState, type ComponentType, type ReactNode } from 'react';

class LoadBoundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="state" role="alert">
      <p>Não foi possível carregar esta área. Verifique sua conexão e tente novamente.</p>
      <button type="button" onClick={this.props.retry}>Tentar carregar novamente</button>
    </div>;
    return this.props.children;
  }
}

export function lazyWhenOpen(load: () => Promise<{ default: ComponentType<any> }>) {
  const View = lazyScreen(load);
  return function DeferredDialog(props: any) {
    const [activated, setActivated] = useState(Boolean(props.open));
    useEffect(() => { if (props.open) setActivated(true); }, [props.open]);
    return props.open || activated ? <View {...props} /> : null;
  };
}

// Retry only the requested module. Never reload the entire app or discard another form.
export default function lazyScreen(load: () => Promise<{ default: ComponentType<any> }>) {
  let current = lazy(load);
  return function DeferredScreen(props: any) {
    const [attempt, setAttempt] = useState(0);
    const View = current;
    return <LoadBoundary key={attempt} retry={() => { current = lazy(load); setAttempt(n => n + 1); }}>
      <Suspense fallback={<div className="state" role="status" aria-live="polite">Carregando área…</div>}>
        <View {...props} />
      </Suspense>
    </LoadBoundary>;
  };
}
