import { siteUrl } from '@/lib/env';
import { lyricsToSlides } from '@/lib/slides';
import { getSongById } from '@/lib/songs';
import { createPublicClient } from '@/lib/supabase/public';
import type { Song } from '@/lib/types';

export type LyraSlideVersion = {
  id: string;
  kind: 'original' | 'user' | 'custom';
  song_id: string | null;
  song_slug: string | null;
  song_title: string | null;
  title: string;
  author: string | null;
  lyrics: string | null;
  slides: string[];
  published_at: string | null;
};

type PublishedSongRow = {
  user_id: string;
  song_id?: string;
  published_slides: unknown;
  published_source_lyrics: unknown;
  published_author: unknown;
  published_at: unknown;
};

type PublishedCustomRow = {
  id: string;
  published_title: unknown;
  published_source_lyrics: unknown;
  published_slides: unknown;
  published_author: unknown;
  published_at: unknown;
};

function asSlides(value: unknown): string[] {
  return Array.isArray(value) ? value.map((slide) => String(slide).replace(/\r\n/g, '\n')) : [];
}

function versionApiUrl(id: string) {
  return `${siteUrl()}/api/v1/slide-versions/${encodeURIComponent(id)}`;
}

function originalVersion(song: Pick<Song, 'id' | 'slug' | 'title' | 'lyrics'>): LyraSlideVersion {
  return {
    id: `original:${song.id}`,
    kind: 'original',
    song_id: song.id,
    song_slug: song.slug,
    song_title: song.title,
    title: `${song.title} — Original`,
    author: null,
    lyrics: song.lyrics,
    slides: lyricsToSlides(song.lyrics),
    published_at: null,
  };
}

async function publishedSongRows(songId?: string) {
  const supabase = createPublicClient();
  const rpc = await supabase.rpc('list_published_song_slides', { p_song_id: songId ?? null });
  if (!rpc.error) return (rpc.data ?? []) as PublishedSongRow[];

  const columns = 'user_id, song_id, published_slides, published_source_lyrics, published_author, published_at';
  let view = supabase.from('lyra_published_song_slides').select(columns);
  if (songId) view = view.eq('song_id', songId);
  const fromView = await view.order('published_at', { ascending: true });
  if (!fromView.error) return (fromView.data ?? []) as PublishedSongRow[];

  let table = supabase.from('user_song_slides').select(columns).eq('published', true);
  if (songId) table = table.eq('song_id', songId);
  const fromTable = await table.order('published_at', { ascending: true });
  if (fromTable.error) return [];
  return (fromTable.data ?? []) as PublishedSongRow[];
}

function mapUserRow(
  song: Pick<Song, 'id' | 'slug' | 'title'>,
  row: {
    user_id: string;
    published_slides: unknown;
    published_source_lyrics: unknown;
    published_author: unknown;
    published_at: unknown;
  }
): LyraSlideVersion | null {
  const slides = asSlides(row.published_slides);
  if (slides.length === 0) return null;
  const author = typeof row.published_author === 'string' && row.published_author.trim() ? row.published_author : 'USUÁRIO';
  return {
    id: `user:${song.id}:${row.user_id}`,
    kind: 'user',
    song_id: song.id,
    song_slug: song.slug,
    song_title: song.title,
    title: `${song.title} — Versão editada por ${author}`,
    author,
    lyrics: typeof row.published_source_lyrics === 'string' ? row.published_source_lyrics : null,
    slides,
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
  };
}

/** Versões já enviadas ao Lyra para uma música do catálogo. */
export async function listPublishedSongVersions(song: Song): Promise<LyraSlideVersion[]> {
  const original = originalVersion(song);

  try {
    const data = await publishedSongRows(song.id);
    const versions = data
      .map((row: PublishedSongRow) => mapUserRow(song, row))
      .filter((row): row is LyraSlideVersion => Boolean(row));
    return [original, ...versions];
  } catch {
    return [original];
  }
}

/** Medleys / músicas em branco já enviados ao Lyra. */
export async function listPublishedCustomVersions(): Promise<LyraSlideVersion[]> {
  try {
    const supabase = createPublicClient();
    const columns = 'id, published_title, published_source_lyrics, published_slides, published_author, published_at';

    const rpc = await supabase.rpc('list_published_custom_slides');
    const fromView = rpc.error
      ? await supabase.from('lyra_published_custom_slides').select(columns).order('published_at', { ascending: true })
      : null;

    const fallback = rpc.error
      ? fromView && !fromView.error
        ? fromView.data
        : (
            await supabase
              .from('user_custom_slides')
              .select(columns)
              .eq('published', true)
              .order('published_at', { ascending: true })
          ).data
      : rpc.data;

    const data = (fallback ?? []) as PublishedCustomRow[];

    const versions: LyraSlideVersion[] = [];
    for (const row of data) {
      const slides = asSlides(row.published_slides);
      if (slides.length === 0) continue;
      const author = typeof row.published_author === 'string' && row.published_author.trim() ? row.published_author : 'USUÁRIO';
      const title = typeof row.published_title === 'string' && row.published_title.trim() ? row.published_title : 'Música em branco';
      versions.push({
        id: `custom:${row.id}`,
        kind: 'custom',
        song_id: null,
        song_slug: null,
        song_title: null,
        title: `${title} — Versão de ${author}`,
        author,
        lyrics: typeof row.published_source_lyrics === 'string' ? row.published_source_lyrics : null,
        slides,
        published_at: typeof row.published_at === 'string' ? row.published_at : null,
      });
    }
    return versions;
  } catch {
    return [];
  }
}

export async function getPublishedVersionById(id: string): Promise<LyraSlideVersion | null> {
  const decoded = decodeURIComponent(id);

  if (decoded.startsWith('original:')) {
    const song = await getSongById(decoded.slice('original:'.length));
    return song ? originalVersion(song) : null;
  }

  if (decoded.startsWith('custom:')) {
    const customId = decoded.slice('custom:'.length);
    const versions = await listPublishedCustomVersions();
    return versions.find((version) => version.id === `custom:${customId}`) ?? null;
  }

  if (decoded.startsWith('user:')) {
    const rest = decoded.slice('user:'.length);
    const sep = rest.lastIndexOf(':');
    if (sep <= 0) return null;
    const songId = rest.slice(0, sep);
    const userId = rest.slice(sep + 1);
    const song = await getSongById(songId);
    if (!song) return null;
    const versions = await listPublishedSongVersions(song);
    return versions.find((version) => version.id === `user:${songId}:${userId}`) ?? null;
  }

  return null;
}

export function mapVersionSummary(version: LyraSlideVersion) {
  return {
    id: version.id,
    kind: version.kind,
    title: version.title,
    author: version.author,
    published_at: version.published_at,
    api_url: versionApiUrl(version.id),
  };
}

export function mapVersionDetail(version: LyraSlideVersion) {
  return {
    format: 'lyra.slide_version.v1',
    ...mapVersionSummary(version),
    song_id: version.song_id,
    song_slug: version.song_slug,
    song_title: version.song_title,
    lyrics: version.lyrics,
    slides: version.slides,
  };
}
