'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SongList, { type CatalogSong } from '@/components/SongList';
import { ChevronDownIcon, CloseIcon } from '@/components/icons';
import { allKeysFor, normalizeKey } from '@/lib/chords';

type ContentFilter = 'all' | 'chords' | 'lyrics';

function foldText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function keysInResults(songs: CatalogSong[]): string[] {
  const present = new Set(songs.map((song) => normalizeKey(song.base_key)));
  return [...allKeysFor('C'), ...allKeysFor('Am')].filter((key) => present.has(key));
}

function artistsInResults(songs: CatalogSong[]): string[] {
  const names = new Set<string>();
  for (const song of songs) {
    const name = song.artist?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => foldText(a).localeCompare(foldText(b), 'pt-BR'));
}

/** O RPC devolve preview da letra em `snippet`; string vazia ≈ sem letra cadastrada. */
function songHasLyrics(song: CatalogSong) {
  return Boolean(song.snippet?.trim());
}

function recordLabel(total: number, visible: number, query: string, filtered: boolean) {
  const n = filtered ? visible : total;
  if (query) {
    return (
      <>
        <b>{n}</b> {n === 1 ? 'resultado' : 'resultados'}
        {filtered && total !== visible ? ` de ${total}` : ''}
      </>
    );
  }
  return (
    <>
      <b>{n}</b> {n === 1 ? 'registro' : 'registros'}
      {filtered && total !== visible ? ` de ${total}` : ''}
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
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistQuery, setArtistQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterId = useId();
  const artistListId = useId();

  const keys = useMemo(() => keysInResults(songs), [songs]);
  const artists = useMemo(() => artistsInResults(songs), [songs]);

  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : null;
  const activeArtist = selectedArtist && artists.includes(selectedArtist) ? selectedArtist : null;
  const artistNeedle = activeArtist ? '' : foldText(artistQuery);

  const artistOptions = useMemo(() => {
    const q = foldText(artistQuery);
    if (!q) return artists;
    return artists.filter((name) => foldText(name).includes(q));
  }, [artists, artistQuery]);

  const visible = useMemo(() => {
    return songs.filter((song) => {
      if (contentFilter === 'chords' && !song.has_chords) return false;
      if (contentFilter === 'lyrics' && !songHasLyrics(song)) return false;
      if (activeKey && normalizeKey(song.base_key) !== activeKey) return false;
      if (activeArtist && song.artist.trim() !== activeArtist) return false;
      if (artistNeedle && !foldText(song.artist).includes(artistNeedle)) return false;
      return true;
    });
  }, [songs, contentFilter, activeKey, activeArtist, artistNeedle]);

  const hasExtraFilters = Boolean(activeKey || activeArtist || artistQuery.trim());
  const hasAnyFilter = contentFilter !== 'all' || hasExtraFilters;
  const filtered = hasAnyFilter;

  function clearFilters() {
    setContentFilter('all');
    setSelectedKey(null);
    setSelectedArtist(null);
    setArtistQuery('');
  }

  const countNode =
    songs.length > 0 ? (
      <p className="record-count" aria-live="polite">
        {recordLabel(songs.length, visible.length, query, filtered)}
      </p>
    ) : null;

  const showPublicFilters = showKeyFilter && Boolean(search);

  let metaRow: ReactNode = null;
  if (showPublicFilters) {
    metaRow = (
      <div className="catalog-filters">
        <div className="catalog-filters__row">
          <div className="catalog-filters__chips" role="group" aria-label="Filtrar por conteúdo">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'chords', label: 'Com cifra' },
                { id: 'lyrics', label: 'Com letra' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className="catalog-chip"
                data-active={contentFilter === item.id}
                aria-pressed={contentFilter === item.id}
                onClick={() => setContentFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="catalog-filters__actions">
            <button
              type="button"
              className="catalog-filters__toggle"
              data-open={filtersOpen}
              data-active={hasExtraFilters}
              aria-expanded={filtersOpen}
              aria-controls={`${filterId}-extra`}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              Filtros
              {hasExtraFilters ? <span className="catalog-filters__dot" aria-hidden="true" /> : null}
              <ChevronDownIcon size={14} />
            </button>
            {countNode}
          </div>
        </div>

        {filtersOpen ? (
          <div className="catalog-filters__extra" id={`${filterId}-extra`}>
            <label className="catalog-filters__field">
              <span className="catalog-filters__label">Artista</span>
              <input
                type="search"
                className="catalog-filters__input"
                list={artistListId}
                value={artistQuery}
                placeholder="Buscar ou selecionar artista…"
                aria-label="Buscar artista"
                autoComplete="off"
                onChange={(event) => {
                  const next = event.target.value;
                  setArtistQuery(next);
                  const exact = artists.find((name) => name === next);
                  setSelectedArtist(exact ?? null);
                }}
              />
              <datalist id={artistListId}>
                {artistOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>

            <label className="catalog-filters__field">
              <span className="catalog-filters__label">Tom</span>
              <select
                className="select query-meta__select catalog-filters__select"
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
            </label>

            {hasAnyFilter ? (
              <button type="button" className="catalog-filters__clear" onClick={clearFilters}>
                <CloseIcon size={13} />
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : null}

        {!filtersOpen && hasAnyFilter ? (
          <div className="catalog-filters__summary">
            <span className="catalog-filters__summary-text">
              {contentFilter === 'chords' ? 'Com cifra' : null}
              {contentFilter === 'lyrics' ? 'Com letra' : null}
              {activeArtist ? `${contentFilter !== 'all' ? ' · ' : ''}${activeArtist}` : null}
              {!activeArtist && artistQuery.trim()
                ? `${contentFilter !== 'all' ? ' · ' : ''}Artista: ${artistQuery.trim()}`
                : null}
              {activeKey
                ? `${contentFilter !== 'all' || activeArtist || artistQuery.trim() ? ' · ' : ''}Tom ${activeKey}`
                : null}
            </span>
            <button type="button" className="catalog-filters__clear catalog-filters__clear--inline" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        ) : null}
      </div>
    );
  } else if (countNode) {
    metaRow = <div className="query-meta query-meta--solo">{countNode}</div>;
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

  if (visible.length === 0) {
    return (
      <>
        {panel}
        <div className="empty">
          <strong>Nenhuma música com esses filtros</strong>
          <span className="small">
            Ajuste ou{' '}
            <button type="button" className="linkish" onClick={clearFilters}>
              limpe os filtros
            </button>{' '}
            para ver mais resultados.
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
