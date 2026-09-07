import type { Metadata } from 'next';
import { Suspense } from 'react';
import ChordView from '@/components/ChordView';
import SongCacheFallback from '@/components/SongCacheFallback';
import { cifraPath, slugToKey } from '@/lib/chords';
import { getSongBySlug } from '@/lib/songs';
import { resolveChordPage } from '../resolve';

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

  const title = `${song.title} — Cifra de violão em ${key}`;
  const description = `Cifra de violão de ${song.title}${song.artist ? ` (${song.artist})` : ''} no tom de ${key}.`;
  const url = cifraPath(song.slug, key, 'violao');

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  };
}

async function GuitarChordSongContent({
  slug,
  tom,
  askedTom,
}: {
  slug: string;
  tom: string;
  askedTom?: string;
}) {
  const { song, key, keys, removedKey } = await resolveChordPage(slug, tom, 'violao', askedTom);

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
      instrumento="violao"
      notice={notice}
    />
  );
}

export default async function GuitarChordPage({ params, searchParams }: Params) {
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
          instrumento="violao"
        />
      }
    >
      <GuitarChordSongContent slug={slug} tom={tom} askedTom={askedTom} />
    </Suspense>
  );
}
