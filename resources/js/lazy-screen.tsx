import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import '../css/loading-skeleton.css';

function LoadingSkeleton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(timer);
  }, []);
  return <section className={`arl-loading${visible ? ' arl-loading-visible' : ''}`} role="status" aria-live="polite" aria-busy="true">
    {visible && <>
      <div className="arl-loading-caption"><span className="arl-loading-emblem" aria-hidden="true"><i /><i /><i /></span><div><strong>Preparando suas informações…</strong><span>Já estamos organizando tudo para você.</span></div></div>
      <div className="arl-loading-preview" aria-hidden="true"><div className="arl-loading-title" /><div className="arl-loading-grid">{[0, 1, 2].map(n => <div className="arl-loading-tile" key={n}><i /><b /><span /></div>)}</div><div className="arl-loading-lines"><i /><i /><i /></div></div>
    </>}
  </section>;
}

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
  let loaded: ComponentType<any> | undefined;
  let pending: Promise<{ default: ComponentType<any> }> | undefined;
  function Screen({ view, error, screenProps }: { view?: ComponentType<any>; error?: unknown; screenProps: any }) {
    if (error) throw error;
    const View = view;
    return View ? <View {...screenProps} /> : <LoadingSkeleton />;
  }
  return function DeferredScreen(props: any) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ view?: ComponentType<any>; error?: unknown }>(() => ({ view: loaded }));
    useEffect(() => {
      if (loaded) { setResult({ view: loaded }); return; }
      let active = true;
      // Module imports remain demand-only and shared. Commit the resolved screen
      // directly, avoiding Suspense's extra fallback reveal delay on navigation.
      pending ??= Promise.resolve().then(load).then(module => { loaded = module.default; return module; });
      void pending.then(
        module => { if (active) setResult({ view: module.default }); },
        error => { if (active) setResult({ error }); },
      );
      return () => { active = false; };
    }, [attempt]);
    return <LoadBoundary key={attempt} retry={() => {
      loaded = undefined;
      pending = undefined;
      setResult({});
      setAttempt(n => n + 1);
    }}>
      <Screen view={result.view} error={result.error} screenProps={props} />
    </LoadBoundary>;
  };
}
