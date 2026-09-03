import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SearchBox from '@/components/SearchBox';
import SongList from '@/components/SongList';
import { searchSongs } from '@/lib/songs';
import { SEARCH_FIELDS, fieldIdsToWeights, parseFieldIds } from '@/lib/search-fields';
import type { SearchHit } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { q = '', c } = await searchParams;
  const query = q.trim();
  const fieldIds = parseFieldIds(c);

  let songs: SearchHit[] = [];
  let failure: string | null = null;

  if (query) {
    try {
      songs = await searchSongs(query, 50, 0, fieldIdsToWeights(fieldIds));
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
    }
  }

  const activeLabels = SEARCH_FIELDS.filter((f) => fieldIds.includes(f.id))
    .map((f) => f.label.toLowerCase())
    .join(', ');

  return (
    <>
      <SiteHeader
        right={
          <Link href="/admin" className="btn btn--ghost btn--sm muted">
            Admin
          </Link>
        }
      />

      <main className="shell">
        <div style={{ paddingTop: 18 }}>
          <SearchBox initialQuery={query} initialFields={fieldIds} />
        </div>

        {failure ? (
          <div className="empty" style={{ marginTop: 22 }}>
            <strong>Banco não configurado</strong>
            <span className="small">{failure}</span>
          </div>
        ) : !query ? (
          <div className="empty">
            <strong>Busque uma música</strong>
            <span className="small">Digite o nome, o artista ou um trecho da letra para ver os resultados.</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="empty">
            <strong>Nada encontrado</strong>
            <span className="small">
              A busca procurou em {activeLabels}. Tente outra palavra ou marque mais campos acima.
            </span>
          </div>
        ) : (
          <>
            <div className="section-title">
              {songs.length} resultado{songs.length > 1 ? 's' : ''}
            </div>
            <SongList songs={songs} showSnippet={fieldIds.includes('l')} />
          </>
        )}
      </main>
    </>
  );
}
