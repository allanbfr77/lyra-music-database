import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongHeader from '@/components/SongHeader';
import SongTabs from '@/components/SongTabs';
import Reader from '@/components/Reader';
import { getSongBySlug } from '@/lib/songs';
import { chartToLyrics, keyToSlug, normalizeKey } from '@/lib/chords';

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

  const hasChords = song.chords.trim().length > 0;
  const lyrics = song.lyrics.trim() || (hasChords ? chartToLyrics(song.chords) : '');

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <SongHeader song={song} />
        <SongTabs slug={song.slug} active="letra" hasChords={hasChords} chordKeySlug={keyToSlug(normalizeKey(song.base_key))} />
        {lyrics ? (
          <Reader mode="lyrics" text={lyrics} shareTitle={`${song.title} — ${song.artist}`} />
        ) : (
          <div className="empty">
            <strong>Letra ainda não cadastrada</strong>
            <span className="small">Esta música foi cadastrada sem letra.</span>
          </div>
        )}
      </main>
    </>
  );
}
