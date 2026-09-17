import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { allKeysFor, normalizeKey } from '@/lib/chords';
import type { Instrumento, KeyOverride, SearchHit, Song } from '@/lib/types';

export { availableInstruments, chartForKey, cifraPath } from '@/lib/chords';

export const SONG_COLUMNS =
  'id, slug, title, artist, lyrics, slides, chords, chords_guitar, base_key, available_keys, capo, tempo_bpm, time_signature, language, source_url, youtube_url, notes, published, chords_reviewed, created_at, updated_at';

const OVERRIDE_COLUMNS = 'id, song_id, key, chords, instrumento, created_at, updated_at';
const OVERRIDE_COLUMNS_LEGACY = 'id, song_id, key, chords, created_at, updated_at';

export type SongWithOverrides = Song & { overrides: KeyOverride[] };

/** Os 12 tons cromáticos na modalidade do tom base — sem restrição por available_keys. */
export function publishedKeys(song: Pick<Song, 'base_key' | 'available_keys'>): string[] {
  return allKeysFor(normalizeKey(song.base_key));
}

/** Lista cromática completa para UI ao vivo (mesmo critério de publishedKeys). */
export function chromaticKeys(baseKey: string): string[] {
  return allKeysFor(normalizeKey(baseKey));
}

function overrideInstrumento(value: string | null | undefined): Instrumento {
  return value === 'violao' ? 'violao' : 'teclado';
}

function normalizeSongRow(
  data: Song & { song_key_overrides: (KeyOverride & { instrumento?: string })[] }
): SongWithOverrides {
  const { song_key_overrides, ...song } = data;
  const overrides: KeyOverride[] = (song_key_overrides ?? []).map((o) => ({
    ...o,
    instrumento: overrideInstrumento(o.instrumento),
  }));
  return {
    ...song,
    chords_guitar: song.chords_guitar ?? '',
    youtube_url: song.youtube_url ?? null,
    slides: Array.isArray(song.slides) ? song.slides : [],
    overrides,
  };
}

function dropMissingColumn(
  columns: string,
  extra: string,
  message: string
): { columns: string; extra: string; changed: boolean } {
  if (message.includes('slides') && columns.includes('slides')) {
    return { columns: columns.replace(', slides', ''), extra, changed: true };
  }
  if (message.includes('youtube_url') && columns.includes('youtube_url')) {
    return { columns: columns.replace(', youtube_url', ''), extra, changed: true };
  }
  if (message.includes('chords_guitar') && columns.includes('chords_guitar')) {
    return { columns: columns.replace(', chords_guitar', ''), extra, changed: true };
  }
  if (message.includes('chords_reviewed') && columns.includes('chords_reviewed')) {
    return { columns: columns.replace(', chords_reviewed', ''), extra, changed: true };
  }
  if (message.includes('instrumento') && extra.includes('instrumento')) {
    return { columns, extra: extra.replace(OVERRIDE_COLUMNS, OVERRIDE_COLUMNS_LEGACY), changed: true };
  }
  return { columns, extra, changed: false };
}

export const getSongBySlug = cache(async function getSongBySlug(slug: string): Promise<SongWithOverrides | null> {
  const supabase = createPublicClient();
  let columns = SONG_COLUMNS;
  let extra = OVERRIDE_COLUMNS;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('songs')
      .select(`${columns}, song_key_overrides(${extra})`)
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      return normalizeSongRow(data as unknown as Song & { song_key_overrides: KeyOverride[] });
    }
    if (!error) return null;

    const next = dropMissingColumn(columns, extra, error.message);
    if (!next.changed) return null;
    columns = next.columns;
    extra = next.extra;
  }

  return null;
});

export const getSongById = cache(async function getSongById(id: string): Promise<SongWithOverrides | null> {
  if (!id) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('songs')
    .select(`${SONG_COLUMNS}, song_key_overrides(${OVERRIDE_COLUMNS})`)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeSongRow(data as unknown as Song & { song_key_overrides: KeyOverride[] });
});

/** Evita que %, _ ou , no termo quebrem o filtro ilike do PostgREST. */
function escapeIlike(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/,/g, ' ');
}

/** `weights`: A = título, B = artista, C = letra. "ABC" procura em tudo. */
export async function searchSongs(
  q: string,
  limit = 20,
  offset = 0,
  weights = 'ABC'
): Promise<SearchHit[]> {
  const supabase = createPublicClient();
  const query = (q ?? '').trim();
  const fields = weights.toUpperCase().replace(/[^ABC]/g, '') || 'ABC';
  const wantsLyrics = fields.includes('C');

  // Com letra (ou catálogo vazio): RPC full-text. Título/artista usam substring abaixo.
  if (!query || wantsLyrics) {
    const { data, error } = await supabase.rpc('search_songs', {
      q: query,
      lim: limit,
      off: offset,
      fields,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as SearchHit[];
  }

  const needle = escapeIlike(query);
  const parts: string[] = [];
  if (fields.includes('A')) parts.push(`title.ilike.%${needle}%`);
  if (fields.includes('B')) parts.push(`artist.ilike.%${needle}%`);
  if (!parts.length) return [];

  const { data, error } = await supabase
    .from('songs')
    .select('id, slug, title, artist, base_key, available_keys, chords, lyrics, updated_at')
    .eq('published', true)
    .or(parts.join(','))
    .order('title', { ascending: true })
    .range(offset, offset + Math.max(limit, 0) - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    base_key: row.base_key,
    available_keys: row.available_keys ?? [],
    has_chords: Boolean(String(row.chords ?? '').trim()),
    snippet: row.lyrics ? String(row.lyrics).replace(/\s+/g, ' ').slice(0, 160) : null,
    updated_at: row.updated_at,
    rank: 0,
  }));
}

export type AdminSearchHit = SearchHit & { published: boolean; chords_reviewed: boolean };

/**
 * Busca do painel admin: mesma lógica de campos/pesos da home, mas inclui
 * rascunhos (published=false) via cliente autenticado.
 */
export async function searchAdminSongs(
  q: string,
  limit = 20,
  offset = 0,
  weights = 'ABC'
): Promise<AdminSearchHit[]> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const query = (q ?? '').trim();
  const fields = weights.toUpperCase().replace(/[^ABC]/g, '') || 'ABC';
  let columns =
    'id, slug, title, artist, base_key, available_keys, published, chords_reviewed, chords, lyrics, updated_at';

  type AdminRow = {
    id: string;
    slug: string;
    title: string;
    artist: string;
    base_key: string;
    available_keys: string[] | null;
    published: boolean;
    chords_reviewed?: boolean;
    chords: string | null;
    lyrics: string | null;
    updated_at: string;
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    let request = supabase.from('songs').select(columns);

    if (query) {
      const needle = escapeIlike(query);
      const parts: string[] = [];
      if (fields.includes('A')) parts.push(`title.ilike.%${needle}%`);
      if (fields.includes('B')) parts.push(`artist.ilike.%${needle}%`);
      if (fields.includes('C')) parts.push(`lyrics.ilike.%${needle}%`);
      if (!parts.length) return [];
      request = request.or(parts.join(','));
    }

    const { data, error } = await request
      .order('title', { ascending: true })
      .range(offset, offset + Math.max(limit, 0) - 1);

    if (error) {
      if (error.message.includes('chords_reviewed') && columns.includes('chords_reviewed')) {
        columns = columns.replace(', chords_reviewed', '');
        continue;
      }
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as AdminRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      artist: row.artist,
      base_key: row.base_key,
      available_keys: row.available_keys ?? [],
      has_chords: Boolean(String(row.chords ?? '').trim()),
      snippet: row.lyrics ? String(row.lyrics).replace(/\s+/g, ' ').slice(0, 160) : null,
      updated_at: row.updated_at,
      rank: 0,
      published: Boolean(row.published),
      // Sem coluna / null → Revisar (nunca assume Revisada por omissão).
      chords_reviewed: Boolean(row.chords_reviewed),
    }));
  }

  return [];
}

export async function listRecentSongs(limit = 30): Promise<SearchHit[]> {
  return searchSongs('', limit, 0);
}

export async function countSongs(): Promise<number> {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .eq('published', true);
  return count ?? 0;
}
