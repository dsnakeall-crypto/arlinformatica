export function reserveOpeningWindow(enabled: boolean): Window | null {
  if (!enabled) return null;
  let target: Window | null;
  try { target = window.open('about:blank', '_blank'); } catch { return null; }
  if (target) {
    target.opener = null;
    target.document.title = 'Preparando mensagem de abertura';
    target.document.body.textContent = 'Aguarde a criação da OS. A mensagem será aberta no WhatsApp para você enviar.';
  }
  return target;
}

export function openCreatedOrderMessage(payload: { auto_open?: boolean; url?: string | null } | undefined, reserved: Window | null): string | undefined {
  if (!payload?.auto_open || !payload.url) { reserved?.close(); return; }
  const url = new URL(payload.url);
  if (url.protocol !== 'https:' || url.hostname !== 'wa.me') { reserved?.close(); return; }
  try {
    const target = reserved && !reserved.closed ? reserved : window.open('about:blank', '_blank');
    if (!target) return payload.url;
    target.opener = null;
    target.location.replace(payload.url);
  } catch { reserved?.close(); return payload.url; }
}

export function finalMessageValue(total: string, paid: boolean): string {
  return `- Valor: ${total}${paid ? ' *(PGTO Já Realizado)*' : ''}`;
}
