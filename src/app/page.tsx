import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SearchBox from '@/components/SearchBox';
import HomeCatalog from '@/components/HomeCatalog';
import PlaylistFab from '@/components/PlaylistFab';
import { ADMIN_HOME, getAuthSession } from '@/lib/auth';
import { searchSongs } from '@/lib/songs';
import { SEARCH_FIELDS, fieldIdsToWeights, parseFieldIds } from '@/lib/search-fields';
import type { SearchHit } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { isAdmin } = await getAuthSession();
  if (isAdmin) redirect(ADMIN_HOME);

  const { q = '', c } = await searchParams;
  const query = q.trim();
  const fieldIds = parseFieldIds(c);

  let songs: SearchHit[] = [];
  let failure: string | null = null;

  try {
    // Sem busca: catálogo completo. Com busca: os 50 melhores resultados.
    songs = await searchSongs(query, query ? 50 : 200, 0, fieldIdsToWeights(fieldIds));
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
  }

  const activeLabels = SEARCH_FIELDS.filter((f) => fieldIds.includes(f.id))
    .map((f) => f.label.toLowerCase())
    .join(', ');

  return (
    <>
      <SiteHeader />

      <main className="shell shell--fab">
        <div style={{ paddingTop: 18 }}>
          <SearchBox initialQuery={query} initialFields={fieldIds} />
        </div>

        {failure ? (
          <div className="empty" style={{ marginTop: 22 }}>
            <strong>Banco não configurado</strong>
            <span className="small">{failure}</span>
          </div>
        ) : (
          <HomeCatalog
            songs={songs}
            query={query}
            fieldLabels={activeLabels}
            showSnippet={Boolean(query) && fieldIds.includes('l')}
          />
        )}
      </main>
      <PlaylistFab />
    </>
  );
}
