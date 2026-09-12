import { useLayoutEffect, useRef, type ChangeEventHandler } from 'react';

export default function TermTextEditor({ value, onChange }: {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    const resize = () => {
      area.style.height = 'auto';
      area.style.height = `${Math.max(220, area.scrollHeight + 2)}px`;
    };
    resize();
    let width = area.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = area.getBoundingClientRect().width;
      if (nextWidth !== width) { width = nextWidth; resize(); }
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [value]);

  return <textarea ref={ref} data-arl-document-editor="true" name="term_text"
    style={{ minHeight: 220 }} value={value} onChange={onChange}/>;
}
