import Link from 'next/link';
import AdminCatalog, { type LibrarySong } from '@/components/AdminCatalog';
import SearchBox from '@/components/SearchBox';
import { PlusIcon } from '@/components/icons';
import { searchAdminSongs } from '@/lib/songs';
import { parseFieldIds } from '@/lib/search-fields';

export const dynamic = 'force-dynamic';

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const { q = '', c } = await searchParams;
  const query = q.trim();
  const fieldIds = parseFieldIds(c);

  let songs: LibrarySong[] = [];
  let failure: string | null = null;

  try {
    const hits = await searchAdminSongs('', 1000);
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
      draft: !song.published,
      chords_reviewed: song.chords_reviewed,
      lyrics_reviewed: song.lyrics_reviewed,
      lyrics: song.lyrics,
    }));
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
  }

  const search = <SearchBox initialQuery={query} initialFields={fieldIds} />;

  return (
    <main className="shell">
      <header className="page-intro page-intro--action">
        <div className="page-intro__head">
          <p className="page-kicker">Biblioteca</p>
          <h1 className="page-title">Músicas</h1>
        </div>
        <Link href="/admin/nova" className="btn btn--primary">
          <PlusIcon size={15} />
          Nova música
        </Link>
      </header>

      <div className="db-browse">
        {failure ? (
          <>
            <div className="query-panel">{search}</div>
            <div className="alert alert--error" style={{ marginTop: 18 }}>
              {failure}
            </div>
          </>
        ) : (
          <AdminCatalog songs={songs} initialQuery={query} initialFields={fieldIds} />
        )}
      </div>
    </main>
  );
}
