import { useLayoutEffect, useRef } from 'react';

/** Keep the bottom bar anchored to the screen, never riding above the virtual keyboard. */
export function useMobileNavViewport() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shell = element.closest<HTMLElement>('.shell');
    const viewport = window.visualViewport;
    let frame = 0;
    let baselineBottom = window.innerHeight;
    let keyboardWasVisible = false;
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

      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.matches(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]',
      );
      // iOS Safari moves fixed footers up with the visual viewport when its keyboard opens.
      // Keep the layout-viewport bottom from before focus, compensating only for the keyboard.
      if (!editing && !keyboardWasVisible) baselineBottom = window.innerHeight;
      const obscured = Math.max(0, baselineBottom - visibleBottom);
      // Histerese: o teclado pode encolher abaixo de 130px antes de fechar.
      // Continuar compensando enquanto houver obstrução; zerar apenas ao voltar a zero.
      const keyboardVisible = (obscured >= 130 && (editing || keyboardWasVisible)) || (keyboardWasVisible && obscured > 0);
      keyboardWasVisible = keyboardVisible;
      set(element, '--arl-mobile-keyboard-offset', keyboardVisible ? obscured : 0);
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
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
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
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      element.style.removeProperty('--arl-mobile-keyboard-offset');
      shell?.style.removeProperty('--arl-mobile-nav-clearance');
    };
  }, []);
  return ref;
}
