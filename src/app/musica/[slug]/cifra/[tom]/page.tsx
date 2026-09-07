import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ChordView from '@/components/ChordView';
import SongCacheFallback from '@/components/SongCacheFallback';
import { availableInstruments, cifraPath, slugToKey } from '@/lib/chords';
import { getSongBySlug } from '@/lib/songs';
import { resolveChordPage } from './resolve';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ slug: string; tom: string }>;
  searchParams: Promise<{ tom?: string }>;
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

async function ChordSongContent({
  slug,
  tom,
  askedTom,
}: {
  slug: string;
  tom: string;
  askedTom?: string;
}) {
  const { song, key, keys, removedKey } = await resolveChordPage(slug, tom, 'teclado', askedTom);

  if (!availableInstruments(song, song.overrides).includes('teclado')) notFound();

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
      notice={notice}
    />
  );
}

export default async function ChordPage({ params, searchParams }: Params) {
  const { slug, tom } = await params;
  const askedTom = (await searchParams).tom;
  const key = slugToKey(tom);

  return (
    <Suspense
      fallback={
        <SongCacheFallback
          slug={slug}
          initialTab="cifra"
          initialKey={key ?? undefined}
          instrumento="teclado"
        />
      }
    >
      <ChordSongContent slug={slug} tom={tom} askedTom={askedTom} />
    </Suspense>
  );
}
