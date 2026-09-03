import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { allKeysFor, normalizeKey } from '@/lib/chords';
import type { KeyOverride, SearchHit, Song } from '@/lib/types';

export { chartForKey } from '@/lib/chords';

export const SONG_COLUMNS =
  'id, slug, title, artist, lyrics, chords, base_key, available_keys, capo, tempo_bpm, time_signature, language, source_url, youtube_url, notes, published, created_at, updated_at';

export type SongWithOverrides = Song & { overrides: KeyOverride[] };

/** Tons publicados de uma música, sempre começando pelo tom base. */
export function publishedKeys(song: Pick<Song, 'base_key' | 'available_keys'>): string[] {
  const base = normalizeKey(song.base_key);
  const order = allKeysFor(base);
  const chosen = new Set([base, ...(song.available_keys ?? []).map((k) => normalizeKey(k, ''))]);
  chosen.delete('');
  return order.filter((k) => chosen.has(k));
}

export const getSongBySlug = cache(async function getSongBySlug(slug: string): Promise<SongWithOverrides | null> {
  const supabase = createPublicClient();
  const extra = 'song_key_overrides(id, song_id, key, chords, created_at, updated_at)';
  let { data, error } = await supabase.from('songs').select(`${SONG_COLUMNS}, ${extra}`).eq('slug', slug).maybeSingle();

  // Banco ainda sem a migração 003: lê o restante da música sem o YouTube.
  if (error && error.message.includes('youtube_url')) {
    const legacy = SONG_COLUMNS.replace(', youtube_url', '');
    ({ data, error } = await supabase.from('songs').select(`${legacy}, ${extra}`).eq('slug', slug).maybeSingle());
  }

  if (error || !data) return null;
  const { song_key_overrides, ...song } = data as Song & { song_key_overrides: KeyOverride[] };
  return { ...song, youtube_url: song.youtube_url ?? null, overrides: song_key_overrides ?? [] };
});

/** `weights`: A = título, B = artista, C = letra. "ABC" procura em tudo. */
export async function searchSongs(
  q: string,
  limit = 20,
  offset = 0,
  weights = 'ABC'
): Promise<SearchHit[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc('search_songs', {
    q: q ?? '',
    lim: limit,
    off: offset,
    fields: weights,
  });
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
