'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SongList from '@/components/SongList';
import { allKeysFor, normalizeKey } from '@/lib/chords';
import type { SearchHit } from '@/lib/types';

function keysInResults(songs: SearchHit[]): string[] {
  const present = new Set(songs.map((song) => normalizeKey(song.base_key)));
  return [...allKeysFor('C'), ...allKeysFor('Am')].filter((key) => present.has(key));
}

function contextLine(total: number, visible: number, query: string, key: string | null): string {
  const n = key ? visible : total;
  const plural = n !== 1;
  if (key) {
    return query
      ? `${n} resultado${plural ? 's' : ''} em ${key}`
      : `${n} música${plural ? 's' : ''} em ${key}`;
  }
  if (query) return `${n} resultado${plural ? 's' : ''}`;
  return `${n} música${plural ? 's' : ''} no banco`;
}

export default function HomeCatalog({
  songs,
  query,
  fieldLabels,
  showSnippet = false,
}: {
  songs: SearchHit[];
  query: string;
  fieldLabels: string;
  showSnippet?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const keys = useMemo(() => keysInResults(songs), [songs]);
  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : null;
  const visible = activeKey
    ? songs.filter((song) => normalizeKey(song.base_key) === activeKey)
    : songs;

  function toggleKey(key: string) {
    setSelectedKey((current) => (current === key ? null : key));
  }

  if (songs.length === 0) {
    if (!query) {
      return (
        <div className="empty">
          <strong>Nenhuma música cadastrada</strong>
          <span className="small">
            Cadastre a primeira música em <Link href="/admin">/admin</Link>.
          </span>
        </div>
      );
    }
    return (
      <div className="empty">
        <strong>Nada encontrado</strong>
        <span className="small">
          A busca procurou em {fieldLabels}. Tente outra palavra ou marque mais campos acima.
        </span>
      </div>
    );
  }

  return (
    <>
      {keys.length > 0 && (
        <div className="key-chips" role="group" aria-label="Filtrar por tom">
          {keys.map((key) => {
            const on = activeKey === key;
            return (
              <button
                key={key}
                type="button"
                className="chip"
                data-active={on}
                aria-pressed={on}
                onClick={() => toggleKey(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      )}
      <div className="section-title">{contextLine(songs.length, visible.length, query, activeKey)}</div>
      <SongList songs={visible} showSnippet={showSnippet} />
    </>
  );
}
