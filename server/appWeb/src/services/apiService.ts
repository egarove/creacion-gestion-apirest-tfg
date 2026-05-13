import type { Api, ApiSchema, Endpoint } from '../types';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Matriz estricta: GET→select, POST→insert, PUT→update, DELETE→update|delete
export const STRICT_MATRIX: Record<string, string[]> = {
  get:    ['select'],
  post:   ['insert'],
  put:    ['update'],
  delete: ['update', 'delete'],
};

export function autoLogic(method: string): string {
  const allowed = STRICT_MATRIX[method.toLowerCase()] ?? [];
  return allowed[0] ?? 'select';
}

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
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      msg = parsed.detail || parsed.error || text;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return JSON.parse(text) as { puerto: number };
}

// ── DDL / Schema ──────────────────────────────────────────
export async function getSchema(apiName: string): Promise<ApiSchema> {
  const res = await fetch(`/schema/${apiName}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ApiSchema>;
}

export async function createTable(
  apiName: string,
  name: string,
  columns: { name: string; type: string; nullable: boolean }[],
): Promise<void> {
  const res = await fetch(`/schema/${apiName}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, columns }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function dropTable(apiName: string, tableName: string): Promise<void> {
  const res = await fetch(`/schema/${apiName}/tables/${tableName}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function addColumn(
  apiName: string,
  tableName: string,
  col: { name: string; type: string },
): Promise<void> {
  const res = await fetch(`/schema/${apiName}/tables/${tableName}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(col),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function addFK(
  apiName: string,
  tableName: string,
  fk: { column: string; ref_table: string; ref_column: string },
): Promise<void> {
  const res = await fetch(`/schema/${apiName}/tables/${tableName}/fk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fk),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Endpoint execution (for Tester) ───────────────────────
export async function executeEndpoint(
  baseUrl: string,
  method: string,
  path: string,
  body: Record<string, string> | null,
): Promise<{ status: number; data: unknown }> {
  const opts: RequestInit = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    opts.body = JSON.stringify(body);
  }
  const url = baseUrl.replace(/\/$/, '') + path;
  const res = await fetch(url, opts);
  let data: unknown;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}
