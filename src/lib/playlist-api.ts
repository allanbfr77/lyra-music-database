import { createClient } from '@supabase/supabase-js';
import { createPublicClient } from '@/lib/supabase/public';
import { supabaseUrl } from '@/lib/env';
import { parseSection, type ManualPlaylistItem, type SongRef } from '@/lib/playlist';

/**
 * Leitura de playlists para a API (sem sessão de navegador).
 *
 * - Músicas do banco: cliente público, só as publicadas. É o mesmo conjunto de
 *   /api/v1/songs/{slug}, então todo `slug` devolvido existe lá.
 * - Músicas adicionadas à mão (`playlist_items`): a tabela é só de admin (RLS).
 *   Só dá para lê-la no servidor com SUPABASE_SERVICE_ROLE_KEY. Sem a chave,
 *   a API devolve apenas as playlists do Tom Louvores.
 */

export async function loadPublishedSongRefs(): Promise<SongRef[]> {
  const supabase = createPublicClient();
  const pageSize = 1000;
  const songs: SongRef[] = [];

  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, slug, title, artist')
      .eq('published', true)
      .order('title', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; slug: string; title: string; artist: string | null }[];
    for (const row of rows) songs.push({ id: row.id, slug: row.slug, title: row.title, artist: row.artist ?? '' });
    if (rows.length < pageSize) break;
  }

  return songs;
}

export async function loadAllManualItems(songs: SongRef[]): Promise<ManualPlaylistItem[]> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) return [];

  const supabase = createClient(supabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const byId = new Map(songs.map((song) => [song.id, song]));
  const items: ManualPlaylistItem[] = [];
  const pageSize = 1000;

  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await supabase
      .from('playlist_items')
      .select('id, culto_key, title, tom, section, song_id, created_at')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (typeof row.id !== 'string' || typeof row.culto_key !== 'string' || !title) continue;
      const songId = typeof row.song_id === 'string' ? row.song_id : null;
      const linked = songId ? byId.get(songId) : undefined;
      items.push({
        id: row.id,
        cultoKey: row.culto_key,
        title,
        tom: typeof row.tom === 'string' ? row.tom : '',
        section: parseSection(typeof row.section === 'string' ? row.section : null),
        songId,
        song: linked ? { slug: linked.slug, title: linked.title, artist: linked.artist } : null,
        createdAt: typeof row.created_at === 'string' ? row.created_at : '',
      });
    }
    if (rows.length < pageSize) break;
  }

  return items;
}
