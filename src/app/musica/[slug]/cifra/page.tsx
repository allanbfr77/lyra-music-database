import { notFound, redirect } from 'next/navigation';
import { getSongBySlug } from '@/lib/songs';
import { CHORDS_ENABLED, keyToSlug, normalizeKey } from '@/lib/chords';

export const dynamic = 'force-dynamic';

/** /musica/<slug>/cifra manda para o tom original, que tem URL própria. */
export default async function ChordIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();
  if (!CHORDS_ENABLED) redirect(`/musica/${song.slug}`);
  redirect(`/musica/${song.slug}/cifra/${keyToSlug(normalizeKey(song.base_key))}`);
}
