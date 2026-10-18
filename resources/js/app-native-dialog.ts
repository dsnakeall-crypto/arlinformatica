/**
 * Diálogos nativos da interface ARL: sem window.alert/confirm/prompt.
 * Promises permitem aguardar a decisão antes de operações destrutivas.
 * Conteúdo sempre texto, nunca HTML arbitrário.
 */
type Kind = "alert" | "confirm" | "prompt";
type Answer = string | boolean | null;
let lastDialog: Promise<unknown> = Promise.resolve();

function show(kind: Kind, message: string, title: string, original = ""): Promise<Answer> {
  if (typeof document === "undefined") return Promise.resolve(kind === "alert" ? true : kind === "confirm" ? false : null);
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement("div");
  overlay.className = "arl-app-dialog-overlay";
  const card = document.createElement("section");
  card.className = "arl-app-dialog-card";
  card.setAttribute("role", kind === "alert" ? "alertdialog" : "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "arl-app-dialog-heading");
  card.tabIndex = -1;
  const eyebrow = document.createElement("span");
  eyebrow.className = "arl-app-dialog-eyebrow";
  eyebrow.textContent = "ARL INFORMÁTICA";
  const head = document.createElement("h2");
  head.id = "arl-app-dialog-heading";
  head.textContent = title;
  const body = document.createElement("p");
  body.className = "arl-app-dialog-body";
  body.textContent = message;
  card.append(eyebrow, head, body);
  let input: HTMLInputElement | undefined;
  if (kind === "prompt") {
    input = document.createElement("input");
    input.type = /senha|password/i.test(message + title) ? "password" : "text";
    input.className = "arl-app-dialog-input";
    input.autocomplete = "off";
    input.value = original;
    input.setAttribute("aria-label", title);
    card.append(input);
  }
  const actions = document.createElement("div");
  actions.className = "arl-app-dialog-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "arl-app-dialog-cancel";
  cancel.textContent = "Cancelar";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "arl-app-dialog-confirm";
  accept.textContent = kind === "alert" ? "Entendi" : kind === "prompt" ? "Confirmar" : "Sim, confirmar";
  if (kind !== "alert") actions.append(cancel);
  actions.append(accept);
  card.append(actions);
  overlay.append(card);

  return new Promise<Answer>((resolve) => {
    let done = false;
    const previousOverflow = document.body.style.overflow;
    const finish = (value: Answer) => {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", keydown, true);
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({preventScroll:true});
      resolve(value);
    };
    const dismiss = () => finish(kind === "alert" ? true : kind === "confirm" ? false : null);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); dismiss(); return; }
      if (event.key === "Enter" && document.activeElement === input) {
        event.preventDefault(); event.stopImmediatePropagation(); finish(input?.value ?? null);
      }
      if (event.key === "Tab") {
        const controls = [input, kind === "alert" ? undefined : cancel, accept].filter(
          (node): node is HTMLInputElement | HTMLButtonElement => Boolean(node && node.getClientRects().length)
        );
        if (!controls.length) return;
        const pos = controls.indexOf(document.activeElement as HTMLInputElement | HTMLButtonElement);
        if (event.shiftKey && (pos <= 0)) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && pos === controls.length - 1) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    overlay.addEventListener("mousedown", event => { if (event.target === overlay) dismiss(); });
    cancel.addEventListener("click", dismiss);
    accept.addEventListener("click", () => finish(kind === "prompt" ? input?.value ?? null : true));
    document.body.append(overlay);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", keydown, true);
    (input ?? (kind === "alert" ? accept : cancel)).focus();
  });
}
function queue(kind: Kind, message: string, title: string, initial = "") {
  const promise = lastDialog.catch(() => undefined).then(() => show(kind, message, title, initial));
  lastDialog = promise.then(() => undefined, () => undefined);
  return promise;
}
export async function appConfirm(message: string, title = "Confirmar ação"): Promise<boolean> {
  return (await queue("confirm", message, title)) === true;
}
export async function appAlert(message: string, title = "Atenção"): Promise<void> {
  await queue("alert", message, title);
}
export async function appPrompt(message: string, defaultValue = "", title = "Informe os dados"): Promise<string | null> {
  const value = await queue("prompt", message, title, defaultValue);
  return typeof value === "string" ? value : null;
}
