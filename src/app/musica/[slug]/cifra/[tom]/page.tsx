import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { keyToSlug, slugToKey } from '@/lib/chords';

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

  return {
    title,
    description,
    alternates: { canonical: `/musica/${song.slug}/cifra/${keyToSlug(key)}` },
    openGraph: { title, description, url: `/musica/${song.slug}/cifra/${keyToSlug(key)}`, type: 'article' },
  };
}

export default async function ChordPage({ params, searchParams }: Params) {
  const { slug, tom } = await params;

  const key = slugToKey(tom);
  if (!key) notFound();

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();
  if (!song.chords.trim()) notFound();

  const keys = publishedKeys(song);

  // Tom despublicado: o favorito de alguém não pode virar beco sem saída,
  // então levamos para o tom original avisando o que aconteceu.
  if (!keys.includes(key)) {
    redirect(`/musica/${song.slug}/cifra/${keyToSlug(keys[0])}?tom=${keyToSlug(key)}`);
  }

  const askedFor = slugToKey((await searchParams).tom ?? '');
  const removedKey = askedFor && askedFor !== key ? askedFor : null;

  if (!removedKey) return null;

  return (
    <div className="notice notice--warn no-print" style={{ marginTop: 14 }}>
      O tom de <b>{removedKey}</b> não está mais disponível nesta música. Esta é a cifra em <b>{key}</b>.
    </div>
  );
}
