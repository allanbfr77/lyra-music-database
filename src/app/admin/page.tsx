import Link from 'next/link';
import HomeCatalog from '@/components/HomeCatalog';
import SearchBox from '@/components/SearchBox';
import { PlusIcon } from '@/components/icons';
import { searchAdminSongs } from '@/lib/songs';
import { SEARCH_FIELDS, fieldIdsToWeights, parseFieldIds } from '@/lib/search-fields';
import type { CatalogSong } from '@/components/SongList';

export const dynamic = 'force-dynamic';

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const { q = '', c } = await searchParams;
  const query = q.trim();
  const fieldIds = parseFieldIds(c);

  let songs: CatalogSong[] = [];
  let failure: string | null = null;

  try {
    const hits = await searchAdminSongs(query, query ? 50 : 200, 0, fieldIdsToWeights(fieldIds));
    songs = hits.map((song) => ({
      id: song.id,
      slug: song.slug,
      title: song.title,
      artist: song.artist,
      base_key: song.base_key,
      available_keys: song.available_keys ?? [],
      has_chords: song.has_chords,
      snippet: song.snippet,
      updated_at: song.updated_at,
      rank: song.rank,
      href: `/admin/musica/${song.id}`,
      draft: !song.published,
      chords_reviewed: song.chords_reviewed,
    }));
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
  }

  const activeLabels = SEARCH_FIELDS.filter((f) => fieldIds.includes(f.id))
    .map((f) => f.label.toLowerCase())
    .join(', ');

  const search = <SearchBox initialQuery={query} initialFields={fieldIds} />;

  return (
    <main className="shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 0 6px' }}>
        <h1 style={{ fontSize: 22 }}>Músicas</h1>
        <span className="header-spacer" />
        <Link href="/admin/nova" className="btn btn--tint btn--sm">
          <PlusIcon size={13} />
          Nova música
        </Link>
      </div>

      <div className="db-browse" style={{ paddingTop: 12, minHeight: 0 }}>
        {failure ? (
          <>
            <div className="query-panel">{search}</div>
            <div className="alert alert--error" style={{ marginTop: 18 }}>
              {failure}
            </div>
          </>
        ) : (
          <HomeCatalog
            search={search}
            songs={songs}
            query={query}
            fieldLabels={activeLabels}
            showSnippet={Boolean(query) && fieldIds.includes('l')}
            showReviewFilter
            emptyNoQuery={{
              title: 'Nenhuma música cadastrada',
              hint: 'Comece cadastrando a primeira.',
            }}
            emptyNoResults={{
              title: 'Nada encontrado',
              hint: '',
            }}
          />
        )}
      </div>
    </main>
  );
}
