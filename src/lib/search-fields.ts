/**
 * Onde a busca procura. Os pesos A/B/C são os mesmos aplicados ao índice
 * de texto no Postgres (ver supabase/schema.sql).
 */
export const SEARCH_FIELDS = [
  { id: 'a', label: 'Artista', weight: 'B', api: 'artist' },
  { id: 'm', label: 'Música', weight: 'A', api: 'title' },
  { id: 'l', label: 'Trecho da letra', weight: 'C', api: 'lyrics' },
] as const;

export type FieldId = (typeof SEARCH_FIELDS)[number]['id'];

/** Padrão: música e artista marcados; a letra é escolha do usuário. */
export const DEFAULT_FIELD_IDS = 'am';

/** Normaliza o parâmetro da URL (ex.: "aml") numa string de ids válida. */
export function parseFieldIds(value?: string | null): string {
  if (!value) return DEFAULT_FIELD_IDS;
  const valid = SEARCH_FIELDS.map((f) => f.id) as readonly string[];
  const ids = [...new Set(value.toLowerCase().split(''))].filter((c) => valid.includes(c));
  return ids.length ? SEARCH_FIELDS.filter((f) => ids.includes(f.id)).map((f) => f.id).join('') : DEFAULT_FIELD_IDS;
}

/** "am" → "AB" (pesos aceitos pela função search_songs). */
export function fieldIdsToWeights(ids: string): string {
  const set = new Set(parseFieldIds(ids).split(''));
  return SEARCH_FIELDS.filter((f) => set.has(f.id)).map((f) => f.weight).join('') || 'ABC';
}

/** "title,lyrics" (parâmetro da API) → "ml" */
export function apiFieldsToIds(value?: string | null): string {
  if (!value) return 'aml';
  const wanted = value.toLowerCase().split(/[,\s|]+/).filter(Boolean);
  const ids = SEARCH_FIELDS.filter((f) => wanted.includes(f.api) || wanted.includes(f.id)).map((f) => f.id);
  return ids.length ? ids.join('') : 'aml';
}
