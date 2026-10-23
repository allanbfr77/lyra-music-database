import { createClient } from '@/lib/supabase/server';
import {
  isPlaylistTableMissing,
  parseSection,
  type ManualPlaylistItem,
  type SongRef,
} from '@/lib/playlist';

function asSong(value: unknown): { slug: string; title: string; artist: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const song = row as { slug?: unknown; title?: unknown; artist?: unknown };
  if (typeof song.slug !== 'string' || typeof song.title !== 'string') return null;
  return {
    slug: song.slug,
    title: song.title,
    artist: typeof song.artist === 'string' ? song.artist : '',
  };
}

export async function loadManualItems(date: string): Promise<
  | { ok: true; items: ManualPlaylistItem[] }
  | { ok: false; missingTable: boolean; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id, culto_key, title, tom, section, song_id, song:songs(slug, title, artist)')
    .like('culto_key', `%@${date}`)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return {
      ok: false,
      missingTable: isPlaylistTableMissing(error.message),
      error: error.message,
    };
  }

  const items = (data ?? []).flatMap((row) => {
    const record = row as {
      id?: unknown;
      culto_key?: unknown;
      title?: unknown;
      tom?: unknown;
      section?: unknown;
      song_id?: unknown;
      song?: unknown;
    };
    if (typeof record.id !== 'string' || typeof record.culto_key !== 'string') return [];
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) return [];
    return [
      {
        id: record.id,
        cultoKey: record.culto_key,
        title,
        tom: typeof record.tom === 'string' ? record.tom : '',
        section: parseSection(typeof record.section === 'string' ? record.section : null),
        songId: typeof record.song_id === 'string' ? record.song_id : null,
        song: asSong(record.song),
      },
    ];
  });

  return { ok: true, items };
}

/** Apaga inclusões manuais que repetem uma música já presente no mesmo culto. */
export async function deleteManualItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from('playlist_items').delete().in('id', ids);
}

export async function loadSongRefs(): Promise<SongRef[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const songs: SongRef[] = [];

  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, slug, title, artist')
      .order('title', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; slug: string; title: string; artist: string | null }[];
    for (const row of rows) {
      songs.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        artist: row.artist ?? '',
      });
    }
    if (rows.length < pageSize) break;
  }

  return songs;
}
