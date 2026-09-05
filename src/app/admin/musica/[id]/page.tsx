import { notFound } from 'next/navigation';
import SongEditor, { type EditorInitial } from '@/components/SongEditor';
import { createClient } from '@/lib/supabase/server';
import { SONG_COLUMNS } from '@/lib/songs';
import type { KeyOverride, Song } from '@/lib/types';

export const dynamic = 'force-dynamic';

const OVERRIDE_FULL = 'song_key_overrides(key, chords, instrumento)';
const OVERRIDE_LEGACY = 'song_key_overrides(key, chords)';

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let columns = SONG_COLUMNS;
  let extra = OVERRIDE_FULL;
  let data: unknown = null;
  let error: { message: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase.from('songs').select(`${columns}, ${extra}`).eq('id', id).maybeSingle();
    data = result.data;
    error = result.error;
    if (!error) break;
    if (error.message.includes('slides') && columns.includes('slides')) {
      columns = columns.replace(', slides', '');
      continue;
    }
    if (error.message.includes('youtube_url') && columns.includes('youtube_url')) {
      columns = columns.replace(', youtube_url', '');
      continue;
    }
    if (error.message.includes('chords_guitar') && columns.includes('chords_guitar')) {
      columns = columns.replace(', chords_guitar', '');
      continue;
    }
    if (error.message.includes('instrumento') && extra.includes('instrumento')) {
      extra = OVERRIDE_LEGACY;
      continue;
    }
    break;
  }

  if (error || !data) notFound();

  const song = data as Song & { song_key_overrides: Pick<KeyOverride, 'key' | 'chords' | 'instrumento'>[] };

  const initial: EditorInitial = {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    lyrics: song.lyrics,
    chords: song.chords,
    chords_guitar: song.chords_guitar ?? '',
    base_key: song.base_key,
    available_keys: song.available_keys ?? [],
    capo: song.capo ?? 0,
    tempo_bpm: song.tempo_bpm,
    time_signature: song.time_signature,
    source_url: song.source_url,
    youtube_url: song.youtube_url ?? null,
    notes: song.notes,
    published: song.published,
    overrides: (song.song_key_overrides ?? []).map((o) => ({
      key: o.key,
      chords: o.chords,
      instrumento: o.instrumento === 'violao' ? 'violao' : 'teclado',
    })),
  };

  return <SongEditor initial={initial} />;
}
