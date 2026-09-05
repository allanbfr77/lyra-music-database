import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChordView from '@/components/ChordView';
import { currentUserCanAccessSlides } from '@/lib/auth';
import { availableInstruments, cifraPath, slugToKey } from '@/lib/chords';
import { getSongBySlug } from '@/lib/songs';
import { resolveChordPage } from './resolve';
import { isPlaylistQuery } from '@/lib/playlist';
import { emptySlideCopy, loadUserSongSlides } from '@/lib/user-slides';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ slug: string; tom: string }>;
  searchParams: Promise<{ tom?: string; pl?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, tom } = await params;
  const key = slugToKey(tom);
  if (!key) return { title: 'Tom inválido' };

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) return { title: 'Música não encontrada' };

  const title = `${song.title} — Cifra em ${key}`;
  const description = `Cifra de ${song.title}${song.artist ? ` (${song.artist})` : ''} no tom de ${key}.`;
  const url = cifraPath(song.slug, key, 'teclado');

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  };
}

export default async function ChordPage({ params, searchParams }: Params) {
  const { slug, tom } = await params;
  const query = await searchParams;
  const askedTom = query.tom;
  const inPlaylist = isPlaylistQuery(query.pl);
  const [{ song, key, keys, removedKey }, canAccessSlides] = await Promise.all([
    resolveChordPage(slug, tom, 'teclado', askedTom),
    currentUserCanAccessSlides(),
  ]);

  if (!availableInstruments(song, song.overrides).includes('teclado')) notFound();

  const slideCopy = canAccessSlides ? await loadUserSongSlides(song.id) : emptySlideCopy();
  const { overrides, ...publicSong } = song;
  const notice = removedKey ? (
    <div className="notice notice--warn no-print" style={{ marginTop: 14 }}>
      O tom de <b>{removedKey}</b> não está mais disponível nesta música. Esta é a cifra em <b>{key}</b>.
    </div>
  ) : null;

  return (
    <ChordView
      song={publicSong}
      keys={keys}
      overrides={overrides.map((o) => ({ key: o.key, chords: o.chords, instrumento: o.instrumento }))}
      initialKey={key}
      instrumento="teclado"
      inPlaylist={inPlaylist}
      canAccessSlides={canAccessSlides}
      userSlides={slideCopy.slides}
      slideSourceLyrics={slideCopy.sourceLyrics}
      notice={notice}
    />
  );
}
