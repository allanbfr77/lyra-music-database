import { notFound, redirect } from 'next/navigation';
import { cifraPath, keyToSlug, slugToKey } from '@/lib/chords';
import { getSongBySlug, publishedKeys, type SongWithOverrides } from '@/lib/songs';
import type { Instrumento } from '@/lib/types';

export type ResolvedChord = {
  song: SongWithOverrides;
  key: string;
  keys: string[];
  removedKey: string | null;
};

/** Carrega a música e o tom da URL. 404/redirect iguais para teclado e violão. */
export async function resolveChordPage(
  slug: string,
  tom: string,
  instrumento: Instrumento,
  askedTom?: string
): Promise<ResolvedChord> {
  const key = slugToKey(tom);
  if (!key) notFound();

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  const keys = publishedKeys(song);
  if (!keys.includes(key)) {
    redirect(`${cifraPath(song.slug, keys[0], instrumento)}?tom=${keyToSlug(key)}`);
  }

  const askedFor = slugToKey(askedTom ?? '');
  const removedKey = askedFor && askedFor !== key ? askedFor : null;
  return { song, key, keys, removedKey };
}
