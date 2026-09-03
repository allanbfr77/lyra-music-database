import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongHeader from '@/components/SongHeader';
import SongControlPanel from '@/components/SongControlPanel';
import SongTabs from '@/components/SongTabs';
import Reader from '@/components/Reader';
import { getSongBySlug } from '@/lib/songs';
import { availableInstruments, chartToLyrics, keyToSlug, normalizeKey } from '@/lib/chords';

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

export default async function LyricsPage({ params }: Params) {
  const { slug } = await params;
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  const instruments = availableInstruments(song, song.overrides);
  const hasChords = instruments.length > 0;
  const defaultInstrument = instruments.includes('teclado') ? 'teclado' : 'violao';
  const lyrics = song.lyrics.trim() || (song.chords.trim() ? chartToLyrics(song.chords) : '');

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <SongHeader song={song} />
        <SongControlPanel
          shareTitle={`${song.title} — ${song.artist}`}
          tabs={
            <SongTabs
              slug={song.slug}
              active="letra"
              hasChords={hasChords}
              chordKeySlug={keyToSlug(normalizeKey(song.base_key))}
              instrumento={defaultInstrument}
            />
          }
        >
          {lyrics ? (
            <Reader mode="lyrics" text={lyrics} />
          ) : (
            <div className="empty">
              <strong>Letra ainda não cadastrada</strong>
              <span className="small">Esta música foi cadastrada sem letra.</span>
            </div>
          )}
        </SongControlPanel>
      </main>
    </>
  );
}
