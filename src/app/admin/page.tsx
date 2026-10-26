import Link from 'next/link';
import { cookies } from 'next/headers';
import AdminCatalog from '@/components/AdminCatalog';
import { PlusIcon } from '@/components/icons';
import { getAdminCatalogRevision, listAdminCatalog } from '@/lib/admin-catalog';
import {
  CATALOG_REV_COOKIE,
  catalogRevisionToken,
  revisionFromSongs,
  type CatalogRevision,
  type LibrarySong,
} from '@/lib/catalog';
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

  let songs: LibrarySong[] | null = null;
  let revision: CatalogRevision | null = null;
  let failure: string | null = null;

  try {
    const known = (await cookies()).get(CATALOG_REV_COOKIE)?.value;
    if (!known) {
      // First visit has nothing to compare. One query, then the browser keeps it.
      songs = await listAdminCatalog();
      revision = revisionFromSongs(songs);
    } else {
      // Later visits: a count + newest timestamp. Lyrics stay in IndexedDB when it matches.
      revision = await getAdminCatalogRevision();
      if (known !== catalogRevisionToken(revision)) {
        songs = await listAdminCatalog();
        revision = revisionFromSongs(songs);
      }
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
  }

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
        <AdminCatalog
          initialSongs={songs}
          revision={revision}
          loadError={failure}
          initialQuery={query}
          initialFields={fieldIds}
        />
      </div>
    </main>
  );
}
