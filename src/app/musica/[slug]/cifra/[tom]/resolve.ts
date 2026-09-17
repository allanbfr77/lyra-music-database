import { notFound, redirect } from 'next/navigation';
import { allKeysFor, cifraPath, keyToSlug, normalizeKey, slugToKey } from '@/lib/chords';
import { getSongBySlug, type SongWithOverrides } from '@/lib/songs';
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

  // Sempre os 12 tons cromáticos da modalidade — não usa available_keys.
  const keys = allKeysFor(normalizeKey(song.base_key));
  if (!keys.includes(key)) {
    redirect(`${cifraPath(song.slug, keys[0], instrumento)}?tom=${keyToSlug(key)}`);
  }

  const askedFor = slugToKey(askedTom ?? '');
  const removedKey = askedFor && askedFor !== key ? askedFor : null;
  return { song, key, keys, removedKey };
}
