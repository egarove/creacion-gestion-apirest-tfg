import type { Api, Endpoint } from '../types';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function getAllApis(): Promise<Api[]> {
  const res = await fetch('/get-all-apis');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Api[]>;
}

export async function toggleApi(name: string, status: string): Promise<void> {
  const action = status === 'running' ? 'stop' : 'start';
  const res = await fetch(`/${name}/${action}`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function restoreApi(name: string): Promise<void> {
  const res = await fetch(`/${name}/restore`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteApi(name: string): Promise<void> {
  const res = await fetch(`/${name}/delete`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export async function getLogs(name: string): Promise<string> {
  try {
    const res = await fetch(`/${name}/logs?tail=80`);
    const data = await res.json() as { logs?: string };
    return data.logs || 'Sin logs disponibles';
  } catch (e) {
    return 'Error al cargar logs: ' + errMsg(e);
  }
}

export async function addEndpoint(apiName: string, ep: Endpoint): Promise<void> {
  const res = await fetch(`/${apiName}/create-end-point`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ep),
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = t;
    try { msg = (JSON.parse(t) as { detail?: string }).detail || t; } catch { /* noop */ }
    throw new Error(msg);
  }
}

export interface CreateApiBody {
  api_name: string;
  language: string;
  db: string;
  usr: string;
  paswd: string;
  columns: string[];
  endpoints: Endpoint[];
  generar_ui: boolean;
}

export async function createApi(body: CreateApiBody): Promise<{ puerto: number }> {
  const res = await fetch('/crear-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = (JSON.parse(text) as { detail?: string }).detail || text; } catch { /* noop */ }
    throw new Error(msg);
  }
  return JSON.parse(text) as { puerto: number };
}
