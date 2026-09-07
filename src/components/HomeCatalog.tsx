'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SongList, { type CatalogSong } from '@/components/SongList';
import { allKeysFor, normalizeKey } from '@/lib/chords';

function keysInResults(songs: CatalogSong[]): string[] {
  const present = new Set(songs.map((song) => normalizeKey(song.base_key)));
  return [...allKeysFor('C'), ...allKeysFor('Am')].filter((key) => present.has(key));
}

function recordLabel(total: number, visible: number, query: string, key: string | null) {
  const n = key ? visible : total;
  if (key) {
    return (
      <>
        <b>{n}</b> {query ? 'resultados' : 'registros'} em {key}
      </>
    );
  }
  if (query) {
    return (
      <>
        <b>{n}</b> resultados
      </>
    );
  }
  return (
    <>
      <b>{n}</b> registros
    </>
  );
}

export default function HomeCatalog({
  songs,
  query,
  fieldLabels,
  showSnippet = false,
  showKeyFilter = true,
  search,
  emptyNoQuery = {
    title: 'Nenhuma música cadastrada',
    hint: 'Cadastre a primeira música em /admin.',
  },
  emptyNoResults = {
    title: 'Nada encontrado',
    hint: '',
  },
}: {
  songs: CatalogSong[];
  query: string;
  fieldLabels: string;
  showSnippet?: boolean;
  showKeyFilter?: boolean;
  /** Slot do painel de busca (SearchBox). Quando presente, monta o query builder. */
  search?: ReactNode;
  emptyNoQuery?: { title: string; hint: string };
  emptyNoResults?: { title: string; hint: string };
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const filterId = useId();
  const keys = useMemo(() => keysInResults(songs), [songs]);
  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : null;
  const visible = activeKey
    ? songs.filter((song) => normalizeKey(song.base_key) === activeKey)
    : songs;

  const showMeta = showKeyFilter && keys.length > 0;
  const countNode =
    songs.length > 0 ? (
      <p className="record-count" aria-live="polite">
        {recordLabel(songs.length, visible.length, query, activeKey)}
      </p>
    ) : null;

  let metaRow: ReactNode = null;
  if (showMeta || countNode) {
    if (search || showMeta) {
      metaRow = (
        <div className="query-meta">
          {showMeta ? (
            <select
              id={filterId}
              className="select query-meta__select"
              value={activeKey ?? ''}
              aria-label="Filtrar por tom"
              onChange={(event) => setSelectedKey(event.target.value || null)}
            >
              <option value="">Todos os tons</option>
              {keys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          {countNode}
        </div>
      );
    } else {
      metaRow = <div className="query-meta query-meta--solo">{countNode}</div>;
    }
  }

  const panel = search ? (
    <div className="query-panel">
      {search}
      {metaRow}
    </div>
  ) : (
    metaRow
  );

  if (songs.length === 0) {
    if (!query) {
      return (
        <>
          {panel}
          <div className="empty">
            <strong>{emptyNoQuery.title}</strong>
            <span className="small">
              {emptyNoQuery.hint.includes('/admin') ? (
                <>
                  Cadastre a primeira música em <Link href="/admin">/admin</Link>.
                </>
              ) : (
                emptyNoQuery.hint
              )}
            </span>
          </div>
        </>
      );
    }
    return (
      <>
        {panel}
        <div className="empty">
          <strong>{emptyNoResults.title}</strong>
          <span className="small">
            {emptyNoResults.hint ||
              `A busca procurou em ${fieldLabels}. Tente outra palavra ou marque mais campos acima.`}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {panel}
      <SongList songs={visible} showSnippet={showSnippet} />
      <footer className="db-foot">
        <span>lyra.music.db — v1</span>
        <span>ordenado por título</span>
      </footer>
    </>
  );
}
