import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SearchBox from '@/components/SearchBox';
import HomeCatalog from '@/components/HomeCatalog';
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

  const search = <SearchBox initialQuery={query} initialFields={fieldIds} />;

  return (
    <>
      <SiteHeader />

      <main className="shell shell--browse">
        <div className="db-browse">
          {failure ? (
            <>
              <div className="query-panel">{search}</div>
              <div className="empty">
                <strong>Banco não configurado</strong>
                <span className="small">{failure}</span>
              </div>
            </>
          ) : (
            <HomeCatalog
              search={search}
              songs={songs}
              query={query}
              fieldLabels={activeLabels}
              showSnippet={Boolean(query) && fieldIds.includes('l')}
            />
          )}
        </div>
      </main>
    </>
  );
}
