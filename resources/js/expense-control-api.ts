export async function expenseControlApi<T = any>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/expense-control' + path, {
    method, credentials: 'same-origin', signal,
    headers: { Accept: 'application/json', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '' },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.message || 'Não foi possível concluir a operação.');
  return data;
}
