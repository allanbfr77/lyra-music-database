import { createPublicClient } from '@/lib/supabase/public';
import { allKeysFor, normalizeKey, transposeChart } from '@/lib/chords';
import type { KeyOverride, SearchHit, Song } from '@/lib/types';

export const SONG_COLUMNS =
  'id, slug, title, artist, lyrics, chords, base_key, available_keys, capo, tempo_bpm, time_signature, language, source_url, notes, published, created_at, updated_at';

export type SongWithOverrides = Song & { overrides: KeyOverride[] };

/** Tons publicados de uma música, sempre começando pelo tom base. */
export function publishedKeys(song: Pick<Song, 'base_key' | 'available_keys'>): string[] {
  const base = normalizeKey(song.base_key);
  const order = allKeysFor(base);
  const chosen = new Set([base, ...(song.available_keys ?? []).map((k) => normalizeKey(k, ''))]);
  chosen.delete('');
  return order.filter((k) => chosen.has(k));
}

/**
 * Cifra de uma música num tom específico.
 * Usa a versão manual se existir (modo híbrido); senão transpõe a cifra base.
 */
export function chartForKey(
  song: Pick<Song, 'chords' | 'base_key'>,
  overrides: KeyOverride[],
  key: string
): { chart: string; source: 'manual' | 'auto' } {
  const target = normalizeKey(key);
  const manual = overrides.find((o) => normalizeKey(o.key) === target);
  if (manual && manual.chords.trim()) return { chart: manual.chords, source: 'manual' };
  return { chart: transposeChart(song.chords ?? '', normalizeKey(song.base_key), target), source: 'auto' };
}

export async function getSongBySlug(slug: string): Promise<SongWithOverrides | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('songs')
    .select(`${SONG_COLUMNS}, song_key_overrides(id, song_id, key, chords, created_at, updated_at)`)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  const { song_key_overrides, ...song } = data as Song & { song_key_overrides: KeyOverride[] };
  return { ...song, overrides: song_key_overrides ?? [] };
}

export async function searchSongs(q: string, limit = 20, offset = 0): Promise<SearchHit[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc('search_songs', { q: q ?? '', lim: limit, off: offset });
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchHit[];
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
