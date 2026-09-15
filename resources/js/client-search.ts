import { reactOwnedSelector } from './react-ownership';
import './order-detail-editor';
export {};

type ClientHit = {
    id: number;
    name: string;
    phone: string;
    document: string;
    city?: string;
    state?: string;
};

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
const digits = (value: string) => value.replace(/\D/g, '');
const maskPhone = (value: string) => digits(value).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
const formatDocument = (value: string) => {
    const n = digits(value).slice(0, 14);
    return n.length <= 11
        ? n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        : n.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

async function searchClients(term: string, signal: AbortSignal): Promise<ClientHit[]> {
    const response = await fetch(`/api/clients?q=${encodeURIComponent(term)}&per_page=100`, {
        credentials: 'same-origin',
        signal,
        headers: {
            Accept: 'application/json',
            ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}),
        },
    });
    const body = await response.json().catch(() => ({ data: [] }));
    if (!response.ok) throw new Error(body.message || 'Não foi possível pesquisar clientes.');
    return Array.isArray(body.data) ? body.data : [];
}

function renderResults(results: HTMLElement, clients: ClientHit[], input: HTMLInputElement, select: HTMLSelectElement) {
    results.replaceChildren();
    if (!clients.length) {
        const empty = document.createElement('span');
        empty.textContent = 'Nenhum cliente encontrado.';
        results.append(empty);
        return;
    }

    clients.forEach((client) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.id = String(client.id);

        const name = document.createElement('b');
        name.textContent = client.name;
        const details = document.createElement('small');
        const location = client.city ? ` · ${client.city}${client.state ? `/${client.state}` : ''}` : '';
        details.textContent = `${maskPhone(client.phone)} · ${formatDocument(client.document)}${location}`;

        button.append(name, details);
        button.addEventListener('click', () => {
            (window as Window & { __arlSelectedClient?: ClientHit | null }).__arlSelectedClient = client;
            input.value = client.name;
            select.value = String(client.id);
            select.dispatchEvent(new Event('change', { bubbles: true }));
            results.replaceChildren();
        });
        results.append(button);
    });
}

function installStrongClientSearch(input: HTMLInputElement) {
    if(input.closest(reactOwnedSelector)) return;
    if (input.dataset.arlStrongSearch === '1') return;

    const wrapper = input.closest<HTMLElement>('.arl-client-search');
    const section = input.closest<HTMLElement>('section');
    const select = section?.querySelector<HTMLSelectElement>('select.arl-hidden-select');
    const results = wrapper?.querySelector<HTMLElement>('.arl-client-results');
    const state = wrapper?.querySelector<HTMLElement>('.arl-client-search-state');
    if (!wrapper || !section || !select || !results || !state) return;

    input.dataset.arlStrongSearch = '1';
    let timer = 0;
    let requestNumber = 0;
    let controller: AbortController | null = null;

    input.addEventListener('input', (event) => {
        // Intercepta a busca antiga, que ignorava termos com apenas um caractere.
        event.stopImmediatePropagation();
        window.clearTimeout(timer);
        controller?.abort();

        const term = input.value.trim();
        if (!term) {
            results.replaceChildren();
            state.textContent = '';
            return;
        }

        const currentRequest = ++requestNumber;
        timer = window.setTimeout(async () => {
            controller = new AbortController();
            state.textContent = '…';
            try {
                const clients = await searchClients(term, controller.signal);
                if (currentRequest !== requestNumber) return;
                renderResults(results, clients, input, select);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                if (currentRequest !== requestNumber) return;
                results.replaceChildren();
                const message = document.createElement('span');
                message.textContent = 'Não foi possível pesquisar.';
                results.append(message);
            } finally {
                if (currentRequest === requestNumber) state.textContent = '';
            }
        }, 90);
    }, { capture: true });
}

function installAll() {
    document.querySelectorAll<HTMLInputElement>('.arl-client-search input[type="search"]').forEach(installStrongClientSearch);
}

const observer = new MutationObserver(() => window.requestAnimationFrame(installAll));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', installAll);
installAll();
