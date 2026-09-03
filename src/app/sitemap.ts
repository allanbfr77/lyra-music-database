import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { listRecentSongs, publishedKeys } from '@/lib/songs';
import { keyToSlug, normalizeKey } from '@/lib/chords';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/** Cada música e cada tom entram no sitemap — links permanentes e indexáveis. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [{ url: base, changeFrequency: 'daily', priority: 1 }];

  try {
    const songs = await listRecentSongs(1000);
    for (const song of songs) {
      const lastModified = new Date(song.updated_at);
      entries.push({ url: `${base}/musica/${song.slug}`, lastModified, priority: 0.8 });
      if (!song.has_chords) continue;
      for (const key of publishedKeys({ base_key: normalizeKey(song.base_key), available_keys: song.available_keys ?? [] })) {
        entries.push({
          url: `${base}/musica/${song.slug}/cifra/${keyToSlug(key)}`,
          lastModified,
          priority: 0.7,
        });
      }
    }
  } catch {
    // Banco indisponível: devolve ao menos a home.
  }

  return entries;
}
