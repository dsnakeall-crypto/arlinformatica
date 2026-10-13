import { useLayoutEffect, useRef } from 'react';

/** Fixed coordinates belong to the layout viewport; keep the bar in its visible part. */
export function useMobileNavViewport() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shell = element.closest<HTMLElement>('.shell');
    const viewport = window.visualViewport;
    let frame = 0;
    const set = (target: HTMLElement, name: string, value: number) => {
      const css = value + 'px';
      if (target.style.getPropertyValue(name) !== css) target.style.setProperty(name, css);
    };
    const update = () => {
      frame = 0;
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const visibleBottom = (viewport?.offsetTop ?? 0) + visibleHeight;
      const height = element.getBoundingClientRect().height;
      if (visibleHeight <= 0 || height <= 0 || !Number.isFinite(visibleBottom)) return;
      set(element, '--arl-mobile-visible-bottom', visibleBottom);
      set(element, '--arl-mobile-nav-height', height);
      if (shell) set(shell, '--arl-mobile-nav-clearance', height + 12);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('pageshow', schedule);
      document.removeEventListener('visibilitychange', schedule);
      shell?.style.removeProperty('--arl-mobile-nav-clearance');
    };
  }, []);
  return ref;
}
