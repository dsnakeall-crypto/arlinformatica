import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import OrderPopup from './order-popup';
import '../css/order-label.css';

// The same physical measurements are used in the preview and the isolated print document.
const labelStyles = `
.arl-equipment-label { box-sizing:border-box; width:40mm; height:20mm; padding:2mm; display:flex; flex-direction:column; align-items:center; justify-content:center; background:white; color:black; font-family:Arial,Helvetica,sans-serif; text-align:center; }
.arl-equipment-label * { box-sizing:border-box; }
.arl-equipment-label-name { width:100%; height:7.5mm; display:flex; align-items:center; justify-content:center; font-size:12pt; font-weight:700; line-height:1.05; overflow-wrap:anywhere; }
.arl-equipment-label-divider { width:100%; border-top:.2mm dashed black; margin:.6mm 0; }
.arl-equipment-label-number { width:100%; font-size:10pt; line-height:1.15; font-weight:700; white-space:nowrap; }
.arl-equipment-label-company { width:100%; margin-top:.5mm; font-size:6.5pt; line-height:1.1; }
`;
const printStyles = `@page { size:40mm 20mm; margin:0; } html,body { margin:0; padding:0; width:40mm; height:20mm; background:white; } ${labelStyles} .arl-equipment-label { break-inside:avoid; }`;

export default function OrderLabel({ clientName, orderNumber, onClose }: {
  clientName: string; orderNumber: string; onClose: () => void;
}) {
  const [name, setName] = useState(() => clientName.trim().split(/\s+/)[0].slice(0, 35) || 'Cliente');
  const [error, setError] = useState('');
  const preview = useRef<HTMLDivElement>(null);
  const nameText = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const printing = useRef(false);
  useEffect(() => () => { frame.current?.remove(); }, []);
  useLayoutEffect(() => {
    const text = nameText.current;
    const box = text?.parentElement;
    if (!text || !box) return;
    let points = 12;
    box.style.fontSize = `${points}pt`;
    while (points > 6 && (text.getBoundingClientRect().height > box.clientHeight || text.scrollWidth > box.clientWidth)) {
      points -= 0.5;
      box.style.fontSize = `${points}pt`;
    }
  }, [name]);

  const print = async () => {
    if (!name.trim()) return setError('Informe o nome para a etiqueta.');
    if (printing.current) return;
    setError('');
    printing.current = true;
    frame.current?.remove();
    const iframe = document.createElement('iframe');
    iframe.title = 'Impressão da etiqueta';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;left:0;border:0;opacity:0;pointer-events:none;';
    frame.current = iframe;
    document.body.appendChild(iframe);
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win || !preview.current) throw new Error('Impressão indisponível.');
      doc.open();
      doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiqueta</title></head><body></body></html>');
      doc.close();
      const style = doc.createElement('style');
      style.textContent = printStyles;
      doc.head.appendChild(style);
      // Clone text nodes rather than inserting customer input as HTML.
      doc.body.appendChild(preview.current.cloneNode(true));
      await doc.fonts.ready;
      if (!iframe.isConnected) return;
      win.addEventListener('afterprint', () => { printing.current = false; }, { once: true });
      win.focus();
      win.print();
    } catch {
      iframe.remove();
      printing.current = false;
      setError('Não foi possível abrir a impressão. Tente novamente.');
    }
  };

  return <OrderPopup title="Imprimir etiqueta" eyebrow={`OS #${orderNumber} · 40 × 20 mm`} description="Confira o nome antes de imprimir." icon={Printer} variant="editor" closeLabel="Fechar etiqueta" onClose={onClose}>
    <div className="arl-label-content">
      <label className="arl-label-field">Nome na etiqueta
        <input autoFocus value={name} maxLength={35} onChange={event => { setName(event.target.value); setError(''); }} />
      </label>
      <p className="arl-label-note">A edição vale só para esta etiqueta.</p>
      <style>{labelStyles}</style>
      <div className="arl-label-preview" aria-label="Prévia da etiqueta de 40 por 20 milímetros">
        <div ref={preview} className="arl-equipment-label">
          <div className="arl-equipment-label-name"><span ref={nameText} style={{ display: 'block', width: '100%' }}>{name.trim()}</span></div>
          <div className="arl-equipment-label-divider" />
          <div className="arl-equipment-label-number">OS {orderNumber}</div>
          <div className="arl-equipment-label-company">ARL Informática</div>
        </div>
      </div>
      <p className="arl-label-note">Selecione a B21S, papel 40 × 20 mm e escala 100%. Desative cabeçalhos e rodapés.</p>
      {error && <p role="alert" className="alert">{error}</p>}
    </div>
    <footer className="arl-label-actions">
      <button type="button" onClick={onClose}>Fechar</button>
      <button type="button" className="primary" disabled={!name.trim()} onClick={() => void print()}><Printer size={15} /> Imprimir</button>
    </footer>
  </OrderPopup>;
}
