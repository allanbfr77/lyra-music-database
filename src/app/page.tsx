import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SearchBox from '@/components/SearchBox';
import SongList from '@/components/SongList';
import { searchSongs } from '@/lib/songs';
import type { SearchHit } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim();

  let songs: SearchHit[] = [];
  let failure: string | null = null;

  try {
    songs = await searchSongs(query, 50, 0);
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
  }

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
          <SearchBox initialQuery={query} />
        </div>

        {failure ? (
          <div className="empty" style={{ marginTop: 22 }}>
            <strong>Banco não configurado</strong>
            <span className="small">{failure}</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="empty">
            <strong>{query ? 'Nada encontrado' : 'Nenhuma música ainda'}</strong>
            <span className="small">
              {query
                ? 'Tente outro trecho da letra, o nome do artista ou parte do título.'
                : 'Entre na área administrativa para cadastrar a primeira música.'}
            </span>
          </div>
        ) : (
          <>
            <div className="section-title">
              {query ? `${songs.length} resultado${songs.length > 1 ? 's' : ''}` : `${songs.length} músicas`}
            </div>
            <SongList songs={songs} showSnippet={Boolean(query)} />
          </>
        )}
      </main>
    </>
  );
}
