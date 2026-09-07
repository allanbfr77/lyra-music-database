import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongBackButton from '@/components/SongBackButton';
import ChordView from '@/components/ChordView';
import SongCacheFallback from '@/components/SongCacheFallback';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { availableInstruments, normalizeKey } from '@/lib/chords';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

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

async function LyricsSongContent({ slug }: { slug: string }) {
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  const instruments = availableInstruments(song, song.overrides);
  const defaultInstrument = instruments.includes('teclado') ? 'teclado' : 'violao';
  const { overrides, ...publicSong } = song;

  return (
    <ChordView
      song={publicSong}
      keys={publishedKeys(song)}
      overrides={overrides.map((o) => ({ key: o.key, chords: o.chords, instrumento: o.instrumento }))}
      initialKey={normalizeKey(song.base_key)}
      instrumento={defaultInstrument}
      initialTab="letra"
    />
  );
}

export default async function LyricsPage({ params }: Params) {
  const { slug } = await params;

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
        <Suspense fallback={<SongCacheFallback slug={slug} initialTab="letra" />}>
          <LyricsSongContent slug={slug} />
        </Suspense>
      </main>
    </>
  );
}
