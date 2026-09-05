import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongBackButton from '@/components/SongBackButton';
import ChordView from '@/components/ChordView';
import { currentUserCanAccessSlides } from '@/lib/auth';
import { availableInstruments, normalizeKey } from '@/lib/chords';
import { isPlaylistQuery } from '@/lib/playlist';
import { slidesPath } from '@/lib/slides';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { loadUserSongSlides } from '@/lib/user-slides';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ pl?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) return { title: 'Música não encontrada' };

  return {
    title: `${song.title} — Slides`,
    robots: { index: false, follow: false },
    alternates: { canonical: slidesPath(song.slug) },
  };
}

export default async function SlidesPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const inPlaylist = isPlaylistQuery((await searchParams).pl);
  const allowed = await currentUserCanAccessSlides();
  if (!allowed) {
    redirect(`/login?next=${encodeURIComponent(`${slidesPath(slug)}${inPlaylist ? '?pl=1' : ''}`)}`);
  }

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  const instruments = availableInstruments(song, song.overrides);
  const defaultInstrument = instruments.includes('teclado') ? 'teclado' : 'violao';
  const slideCopy = await loadUserSongSlides(song.id);
  const { overrides, ...publicSong } = song;

  return (
    <>
      <SiteHeader
        left={
          <Suspense>
            <SongBackButton />
          </Suspense>
        }
      />
      <main className="shell">
        <ChordView
          song={publicSong}
          keys={publishedKeys(song)}
          overrides={overrides.map((o) => ({ key: o.key, chords: o.chords, instrumento: o.instrumento }))}
          initialKey={normalizeKey(song.base_key)}
          instrumento={defaultInstrument}
          initialTab="slides"
          inPlaylist={inPlaylist}
          canAccessSlides
          userSlides={slideCopy.slides}
          slideSourceLyrics={slideCopy.sourceLyrics}
          publishedSlides={slideCopy.publishedSlides}
          publishedAt={slideCopy.publishedAt}
        />
      </main>
    </>
  );
}
