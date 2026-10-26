import { createClient } from '@/lib/supabase/server';
import { CHORDS_ENABLED } from '@/lib/chords';
import { lyricSnippet, type CatalogRevision, type LibrarySong } from '@/lib/catalog';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  available_keys: string[] | null;
  published: boolean;
  chords_reviewed?: boolean;
  lyrics_reviewed?: boolean;
  lyrics: string | null;
  updated_at: string;
  chords?: string | null;
};

function toLibrarySong(row: CatalogRow): LibrarySong {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    base_key: row.base_key,
    available_keys: row.available_keys ?? [],
    has_chords: Boolean(String(row.chords ?? '').trim()),
    snippet: lyricSnippet(row.lyrics),
    updated_at: row.updated_at,
    rank: 0,
    draft: !row.published,
    chords_reviewed: Boolean(row.chords_reviewed),
    lyrics_reviewed: Boolean(row.lyrics_reviewed),
    lyrics: row.lyrics ?? '',
  };
}

function dropMissingColumn(columns: string, message: string): string | null {
  if (message.includes('chords_reviewed') && columns.includes('chords_reviewed')) {
    return columns.replace(', chords_reviewed', '');
  }
  if (message.includes('lyrics_reviewed') && columns.includes('lyrics_reviewed')) {
    return columns.replace(', lyrics_reviewed', '');
  }
  if (message.includes('chords') && columns.includes(', chords')) {
    return columns.replace(', chords', '');
  }
  return null;
}

/**
 * Cheap freshness check: row count plus the newest `updated_at`.
 * Every write bumps `updated_at`, so this misses neither edits nor deletes.
 */
export async function getAdminCatalogRevision(): Promise<CatalogRevision> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('songs')
    .select('updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = (data?.[0] ?? null) as { updated_at?: string } | null;
  return {
    count: count ?? 0,
    maxUpdatedAt: row?.updated_at ?? null,
  };
}

/**
 * Full admin library for the browser cache.
 * Chord charts stay on the server — the list only needs a boolean, and only
 * when cifras are enabled. Lyrics stay, because search runs on the client.
 */
export async function listAdminCatalog(): Promise<LibrarySong[]> {
  const supabase = await createClient();
  let columns =
    'id, slug, title, artist, base_key, available_keys, published, chords_reviewed, lyrics_reviewed, lyrics, updated_at';
  if (CHORDS_ENABLED) columns += ', chords';

  const rows: CatalogRow[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    let batch: CatalogRow[] | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await supabase
        .from('songs')
        .select(columns)
        .order('id', { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) {
        const next = dropMissingColumn(columns, error.message);
        if (!next) throw new Error(error.message);
        columns = next;
        continue;
      }

      batch = (data ?? []) as unknown as CatalogRow[];
      break;
    }

    if (!batch) break;

    let added = 0;
    for (const row of batch) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
      added += 1;
    }

    if (batch.length < PAGE_SIZE || added === 0) break;
  }

  return rows.map(toLibrarySong);
}
