import { notFound } from 'next/navigation';
import SongEditor, { type EditorInitial } from '@/components/SongEditor';
import { createClient } from '@/lib/supabase/server';
import { SONG_COLUMNS } from '@/lib/songs';
import type { KeyOverride, Song } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const extra = 'song_key_overrides(key, chords)';
  let { data, error } = await supabase.from('songs').select(`${SONG_COLUMNS}, ${extra}`).eq('id', id).maybeSingle();
  if (error && error.message.includes('youtube_url')) {
    const legacy = SONG_COLUMNS.replace(', youtube_url', '');
    ({ data, error } = await supabase.from('songs').select(`${legacy}, ${extra}`).eq('id', id).maybeSingle());
  }

  if (error || !data) notFound();

  const song = data as Song & { song_key_overrides: Pick<KeyOverride, 'key' | 'chords'>[] };

  const initial: EditorInitial = {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    lyrics: song.lyrics,
    chords: song.chords,
    base_key: song.base_key,
    available_keys: song.available_keys ?? [],
    capo: song.capo ?? 0,
    tempo_bpm: song.tempo_bpm,
    time_signature: song.time_signature,
    source_url: song.source_url,
    youtube_url: song.youtube_url ?? null,
    notes: song.notes,
    published: song.published,
    overrides: song.song_key_overrides ?? [],
  };

  return <SongEditor initial={initial} />;
}
