'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import SongList, { type CatalogSong } from '@/components/SongList';
import { allKeysFor, normalizeKey } from '@/lib/chords';

function keysInResults(songs: CatalogSong[]): string[] {
  const present = new Set(songs.map((song) => normalizeKey(song.base_key)));
  return [...allKeysFor('C'), ...allKeysFor('Am')].filter((key) => present.has(key));
}

function contextParts(total: number, visible: number, query: string, key: string | null) {
  const n = key ? visible : total;
  const plural = n !== 1;
  if (key) {
    return {
      count: n,
      rest: query ? `resultado${plural ? 's' : ''} em ${key}` : `música${plural ? 's' : ''} em ${key}`,
    };
  }
  if (query) return { count: n, rest: `resultado${plural ? 's' : ''}` };
  return { count: n, rest: `música${plural ? 's' : ''} no banco` };
}

export default function HomeCatalog({
  songs,
  query,
  fieldLabels,
  showSnippet = false,
  showKeyFilter = true,
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

  const rule = <div className="search-rule" role="separator" aria-hidden="true" />;
  const summary = contextParts(songs.length, visible.length, query, activeKey);

  if (songs.length === 0) {
    if (!query) {
      return (
        <>
          {rule}
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
        {rule}
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
      {showKeyFilter && keys.length > 0 && (
        <div className="key-filter">
          <select
            id={filterId}
            className="select key-filter__select"
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
        </div>
      )}
      {rule}
      <p className="catalog-count">
        <span className="catalog-count__n">{summary.count}</span>
        <span className="catalog-count__label">{summary.rest}</span>
      </p>
      <SongList songs={visible} showSnippet={showSnippet} />
    </>
  );
}
