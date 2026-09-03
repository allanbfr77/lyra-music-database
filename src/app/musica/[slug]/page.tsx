import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongBackButton from '@/components/SongBackButton';
import ChordView from '@/components/ChordView';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { availableInstruments, normalizeKey } from '@/lib/chords';
import { isPlaylistQuery } from '@/lib/playlist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ pl?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) return { title: 'Música não encontrada' };

  const description = song.lyrics.replace(/\s+/g, ' ').trim().slice(0, 160) || `Letra de ${song.title}.`;
  return {
    title: `${song.title} — Letra`,
    description,
    alternates: { canonical: `/musica/${song.slug}` },
    openGraph: {
      title: `${song.title} — ${song.artist}`,
      description,
      url: `/musica/${song.slug}`,
      type: 'article',
    },
  };
}

export default async function LyricsPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const inPlaylist = isPlaylistQuery((await searchParams).pl);
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  const instruments = availableInstruments(song, song.overrides);
  const defaultInstrument = instruments.includes('teclado') ? 'teclado' : 'violao';
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
          initialTab="letra"
          inPlaylist={inPlaylist}
        />
      </main>
    </>
  );
}
