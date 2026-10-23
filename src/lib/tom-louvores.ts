/**
 * Lê os cultos públicos do Tom Louvores (louvores.invbotafogo.com.br)
 * e devolve a playlist de cada um. A chave anon está no JavaScript
 * público do próprio site; ela só é usada para ler a tabela `cultos`.
 */

export const TOM_LOUVORES_URL = 'https://louvores.invbotafogo.com.br/';

const CONFIG_URL = 'https://louvores.invbotafogo.com.br/js/config.js';

export type RemoteLouvor = {
  nome: string;
  tom: string;
  ofertorio: boolean;
  pos: boolean;
  ceia: boolean;
};

export type RemoteCulto = {
  id: string;
  tipo: string;
  data: string;
  nome: string | null;
  cancelado: boolean;
  ministrante: string;
  atualizadoEm: string | null;
  louvores: RemoteLouvor[];
};

export type RemoteLoad =
  | { ok: true; cultos: RemoteCulto[] }
  | { ok: false; error: string };

export function cultoKey(tipo: string, data: string): string {
  return `${tipo}@${data}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function readConfigField(source: string, field: string): string | null {
  const match = source.match(new RegExp(`${field}\\s*:\\s*"([^"]+)"`));
  return match?.[1] ?? null;
}

function supabaseOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('O Tom Louvores não informou um endereço válido.');
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    throw new Error('O Tom Louvores não apontou para o banco público esperado.');
  }
  return url.origin;
}

function anonKey(value: string): string {
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) {
    throw new Error('Não foi possível ler o acesso público do Tom Louvores.');
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseLouvor(value: unknown): RemoteLouvor | null {
  const row = asRecord(value);
  if (!row) return null;
  const nome = typeof row.nome === 'string' ? row.nome.trim() : '';
  if (!nome) return null;
  return {
    nome,
    tom: typeof row.tom === 'string' ? row.tom.trim() : '',
    ofertorio: row.ofertorio === true,
    pos: row.pos === true,
    ceia: row.ceia === true,
  };
}

function parseLouvores(raw: unknown): { items: RemoteLouvor[]; ministrante: string } {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      value = [];
    }
  }

  let list: unknown[] = [];
  let ministrante = '';
  if (Array.isArray(value)) {
    list = value;
  } else {
    const wrapped = asRecord(value);
    if (wrapped) {
      list = Array.isArray(wrapped.itens) ? wrapped.itens : [];
      ministrante = typeof wrapped.ministrante === 'string' ? wrapped.ministrante.trim() : '';
    }
  }

  return {
    items: list.flatMap((entry) => {
      const item = parseLouvor(entry);
      return item ? [item] : [];
    }),
    ministrante,
  };
}

function rowDate(row: Record<string, unknown>, rawLouvores: unknown): string | null {
  if (typeof row.data === 'string' && isIsoDate(row.data.slice(0, 10))) return row.data.slice(0, 10);

  let value = rawLouvores;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  const list = Array.isArray(value)
    ? value
    : Array.isArray(asRecord(value)?.itens)
      ? (asRecord(value)?.itens as unknown[])
      : [];
  const dates = list
    .map((entry) => {
      const item = asRecord(entry);
      return typeof item?.data === 'string' ? item.data.slice(0, 10) : '';
    })
    .filter(isIsoDate)
    .sort();
  return dates.at(-1) ?? null;
}

/** Mesma montagem do site: a chave é `tipo@data` e a linha mais nova prevalece. */
export function parseCultoRows(rows: unknown): RemoteCulto[] {
  if (!Array.isArray(rows)) return [];

  const ordered = [...rows].sort((a, b) => {
    const left = asRecord(a);
    const right = asRecord(b);
    return String(left?.atualizado_em ?? '').localeCompare(String(right?.atualizado_em ?? ''));
  });

  const byKey = new Map<string, RemoteCulto>();
  for (const entry of ordered) {
    const row = asRecord(entry);
    if (!row || typeof row.tipo !== 'string' || !row.tipo.trim()) continue;
    const data = rowDate(row, row.louvores);
    if (!data) continue;
    const { items, ministrante } = parseLouvores(row.louvores);
    const tipo = row.tipo.trim();
    byKey.set(cultoKey(tipo, data), {
      id: typeof row.id === 'string' ? row.id : cultoKey(tipo, data),
      tipo,
      data,
      nome: typeof row.nome === 'string' && row.nome.trim() ? row.nome.trim() : null,
      cancelado: row.cancelado === true,
      ministrante,
      atualizadoEm: typeof row.atualizado_em === 'string' ? row.atualizado_em : null,
      louvores: items,
    });
  }

  return [...byKey.values()];
}

async function fetchRemoteCultos(): Promise<RemoteCulto[]> {
  const configResponse = await fetch(CONFIG_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!configResponse.ok) {
    throw new Error('Não foi possível abrir o Tom Louvores.');
  }
  const config = await configResponse.text();
  const origin = supabaseOrigin(readConfigField(config, 'SUPABASE_URL') ?? '');
  const key = anonKey(readConfigField(config, 'SUPABASE_KEY') ?? '');

  const endpoint = new URL('/rest/v1/cultos', origin);
  endpoint.searchParams.set('select', 'id,tipo,data,nome,hora,cancelado,louvores,atualizado_em');
  endpoint.searchParams.set('order', 'atualizado_em.asc');
  endpoint.searchParams.set('limit', '1000');

  const response = await fetch(endpoint, {
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`O Tom Louvores respondeu com erro ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new Error('A lista de cultos do Tom Louvores veio em um formato inesperado.');
  }
  if (!Array.isArray(payload)) {
    throw new Error('A lista de cultos do Tom Louvores veio em um formato inesperado.');
  }
  return parseCultoRows(payload);
}

export async function loadRemoteCultos(): Promise<RemoteLoad> {
  try {
    return { ok: true, cultos: await fetchRemoteCultos() };
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : 'Não foi possível ler as playlists do Tom Louvores.';
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { ok: false, error: 'O Tom Louvores demorou para responder.' };
    }
    return { ok: false, error: message };
  }
}
