import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PlaylistBoard from '@/components/PlaylistBoard';
import { deleteManualItems, loadManualItems, loadSongRefs } from '@/lib/playlist-db';
import {
  PLAYLIST_MIGRATION_HINT,
  buildPlaylistColumns,
  buildSongIndex,
  defaultServiceDate,
  formatPlaylistDate,
  redundantManualIds,
  shiftIsoDate,
} from '@/lib/playlist';
import { TOM_LOUVORES_URL, isIsoDate, loadRemoteCultos } from '@/lib/tom-louvores';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Playlist',
  description: 'Louvores dos cultos, replicados do Tom Louvores.',
};

export default async function PlaylistPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  const requested = typeof data === 'string' ? data : '';
  const date = isIsoDate(requested) ? requested : defaultServiceDate();
  const now = Date.now();

  const [remote, manual, songs] = await Promise.all([
    loadRemoteCultos(),
    loadManualItems(date),
    loadSongRefs().catch(() => []),
  ]);

  const songIndex = buildSongIndex(songs);
  let manualItems = manual.ok ? manual.items : [];
  if (remote.ok && manual.ok && manualItems.length > 0) {
    const redundant = redundantManualIds(manualItems, remote.cultos, songIndex);
    if (redundant.length > 0) {
      await deleteManualItems(redundant);
      const drop = new Set(redundant);
      manualItems = manualItems.filter((item) => !drop.has(item.id));
    }
  }

  const columns = buildPlaylistColumns(
    date,
    remote.ok ? remote.cultos : [],
    manualItems,
    songIndex,
    now
  );

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <header className="page-intro">
          <div className="page-intro__head">
            <p className="page-kicker">Cultos</p>
            <h1 className="page-title">Playlist</h1>
          </div>
          <p className="page-lead">
            Listas dos cultos, iguais às do{' '}
            <a href={TOM_LOUVORES_URL} target="_blank" rel="noopener noreferrer">
              Tom Louvores
            </a>
            . As músicas que você incluir ficam só neste banco.
          </p>
        </header>

        <form className="setlist-date" action="/playlist">
          <p className="setlist-date__when">{formatPlaylistDate(date)}</p>
          <Link className="btn" href={`/playlist?data=${shiftIsoDate(date, -1)}`}>
            Anterior
          </Link>
          <label className="visually-hidden" htmlFor="playlist-data">
            Data do culto
          </label>
          <input
            key={date}
            id="playlist-data"
            className="input setlist-date__input"
            type="date"
            name="data"
            defaultValue={date}
          />
          <button className="btn btn--primary" type="submit">
            Ir
          </button>
          <Link className="btn" href={`/playlist?data=${shiftIsoDate(date, 1)}`}>
            Próximo
          </Link>
        </form>

        {!remote.ok ? (
          <div className="alert alert--error" role="alert">
            {remote.error} A playlist deste dia não foi replicada.
          </div>
        ) : null}
        {!manual.ok ? (
          <p className={manual.missingTable ? 'setlist-note' : 'alert alert--error'} role="status">
            {manual.missingTable
              ? PLAYLIST_MIGRATION_HINT
              : 'Não foi possível carregar as músicas adicionadas à mão.'}
          </p>
        ) : null}

        {remote.ok ? <PlaylistBoard columns={columns} canAdd={manual.ok} /> : null}
      </main>
    </>
  );
}
