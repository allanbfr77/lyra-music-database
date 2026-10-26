'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import SongList, { type CatalogSong, type SongSort } from '@/components/SongList';
import { ChevronDownIcon, CloseIcon } from '@/components/icons';
import { CHORDS_ENABLED, allKeysFor, normalizeKey } from '@/lib/chords';

/** Filtro tri-estado independente (cifra ou letra). */
type TriFilter = 'all' | 'yes' | 'no';
type ReviewFilter = 'all' | 'pending' | 'done';

const TRI_OPTIONS: { id: TriFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'yes', label: 'Com' },
  { id: 'no', label: 'Sem' },
];

const REVIEW_OPTIONS: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'A revisar' },
  { id: 'done', label: 'Revisadas' },
];

/** Um <select> de status de revisão (letra ou cifra) — mesmo padrão, campo independente. */
function ReviewSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReviewFilter;
  onChange: (next: ReviewFilter) => void;
}) {
  return (
    <div className="catalog-filters__group" role="group" aria-label={label}>
      <span className="catalog-filters__group-label">{label}</span>
      <div className="catalog-filters__control">
        <select
          className="catalog-filters__review"
          value={value}
          aria-label={`Filtrar por ${label.toLowerCase()}`}
          onChange={(event) => onChange(event.target.value as ReviewFilter)}
        >
          {REVIEW_OPTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

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

// Filtro "Letra: Todos / Com / Sem" desativado: o catálogo é só música.
// /** O RPC devolve preview da letra em `snippet`; string vazia ≈ sem letra cadastrada. */
// function songHasLyrics(song: CatalogSong) {
//   return Boolean(song.snippet?.trim());
// }

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

function TriGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriFilter;
  onChange: (next: TriFilter) => void;
}) {
  return (
    <div className="catalog-filters__group" role="group" aria-label={label}>
      <span className="catalog-filters__group-label">{label}</span>
      <div className="catalog-filters__control">
        <div className="catalog-filters__chips">
          {TRI_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="catalog-chip"
              data-active={value === item.id}
              aria-pressed={value === item.id}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistField({
  artists,
  query,
  selected,
  onChange,
}: {
  artists: string[];
  query: string;
  selected: string | null;
  onChange: (value: string, exact: string | null) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const options = useMemo(() => {
    const q = foldText(query);
    if (!q) return artists;
    return artists.filter((name) => foldText(name).includes(q));
  }, [artists, query]);

  const activeIndex = options.length ? Math.min(highlight, options.length - 1) : -1;

  function commit(value: string) {
    const exact = artists.find((name) => name === value) ?? null;
    onChange(value, exact);
  }

  function choose(name: string) {
    onChange(name, name);
    setOpen(false);
  }

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 6;
      const below = window.innerHeight - rect.bottom - gap - 8;
      const above = rect.top - gap - 8;
      const openUp = below < 160 && above > below;
      const maxHeight = Math.max(120, Math.min(280, openUp ? above : below));
      const top = openUp ? Math.max(8, rect.top - gap - maxHeight) : rect.bottom + gap;
      const width = rect.width;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setBox((prev) => {
        if (prev && prev.top === top && prev.left === left && prev.width === width && prev.maxHeight === maxHeight) {
          return prev;
        }
        return { top, left, width, maxHeight };
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current?.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, options]);

  const menu =
    open && box
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            className="catalog-filters__menu"
            role="listbox"
            aria-label="Artistas"
            style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
          >
            {options.length === 0 ? (
              <li className="catalog-filters__option catalog-filters__option--empty">Nenhum artista</li>
            ) : (
              options.map((name, index) => (
                <li key={name}>
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${index}`}
                    className="catalog-filters__option"
                    data-highlight={index === activeIndex}
                    aria-selected={name === selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(name)}
                  >
                    {name}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="catalog-filters__combo" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        className="catalog-filters__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 && open ? `${listId}-${activeIndex}` : undefined}
        value={query}
        placeholder="Buscar ou selecionar artista…"
        aria-label="Buscar artista"
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          commit(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              setHighlight(0);
              return;
            }
            setHighlight((index) => Math.min(Math.max(options.length - 1, 0), index + 1));
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              setHighlight(0);
              return;
            }
            setHighlight((index) => Math.max(0, index - 1));
            return;
          }
          if (event.key === 'Enter' && open && options[activeIndex]) {
            event.preventDefault();
            choose(options[activeIndex]);
          }
        }}
      />
      {menu}
    </div>
  );
}

export default function HomeCatalog({
  songs,
  query,
  fieldLabels,
  showSnippet = false,
  showKeyFilter = true,
  showReviewFilter = false,
  admin = false,
  pending = false,
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
  /** Selects de status de revisão da letra/cifra (painel admin). */
  showReviewFilter?: boolean;
  /** Biblioteca de Admin: habilita a cor verde de "letra revisada". Nunca na página pública. */
  admin?: boolean;
  /** Catálogo ainda não chegou (nem do servidor, nem do cache local). */
  pending?: boolean;
  /** Slot do painel de busca (SearchBox). Quando presente, monta o query builder. */
  search?: ReactNode;
  emptyNoQuery?: { title: string; hint: string };
  emptyNoResults?: { title: string; hint: string };
}) {
  const [chordsFilter, setChordsFilter] = useState<TriFilter>('all');
  // const [lyricsFilter, setLyricsFilter] = useState<TriFilter>('all');
  // Revisão da letra e da cifra são independentes: cada filtro considera só o seu campo.
  const [lyricsReviewFilter, setLyricsReviewFilter] = useState<ReviewFilter>('all');
  const [chordsReviewFilter, setChordsReviewFilter] = useState<ReviewFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistQuery, setArtistQuery] = useState('');
  const [sortBy, setSortBy] = useState<SongSort>('title');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterId = useId();

  const keys = useMemo(() => keysInResults(songs), [songs]);
  const artists = useMemo(() => artistsInResults(songs), [songs]);

  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : null;
  const activeArtist = selectedArtist && artists.includes(selectedArtist) ? selectedArtist : null;
  const artistNeedle = activeArtist ? '' : foldText(artistQuery);

  const visible = useMemo(() => {
    return songs.filter((song) => {
      if (CHORDS_ENABLED && chordsFilter === 'yes' && !song.has_chords) return false;
      if (CHORDS_ENABLED && chordsFilter === 'no' && song.has_chords) return false;
      // if (lyricsFilter === 'yes' && !songHasLyrics(song)) return false;
      // if (lyricsFilter === 'no' && songHasLyrics(song)) return false;
      if (lyricsReviewFilter === 'pending' && song.lyrics_reviewed) return false;
      if (lyricsReviewFilter === 'done' && !song.lyrics_reviewed) return false;
      if (CHORDS_ENABLED && chordsReviewFilter === 'pending' && song.chords_reviewed) return false;
      if (CHORDS_ENABLED && chordsReviewFilter === 'done' && !song.chords_reviewed) return false;
      if (CHORDS_ENABLED && activeKey && normalizeKey(song.base_key) !== activeKey) return false;
      if (activeArtist && song.artist.trim() !== activeArtist) return false;
      if (artistNeedle && !foldText(song.artist).includes(artistNeedle)) return false;
      return true;
    });
  }, [
    songs,
    chordsFilter,
    // lyricsFilter,
    lyricsReviewFilter,
    chordsReviewFilter,
    activeKey,
    activeArtist,
    artistNeedle,
  ]);

  const hasExtraFilters = Boolean(activeKey || activeArtist || artistQuery.trim());
  const hasTriFilters =
    chordsFilter !== 'all' ||
    // lyricsFilter !== 'all' ||
    lyricsReviewFilter !== 'all' ||
    chordsReviewFilter !== 'all';
  const hasAnyFilter = hasTriFilters || hasExtraFilters;
  const filtered = hasAnyFilter;

  function clearFilters() {
    setChordsFilter('all');
    // setLyricsFilter('all');
    setLyricsReviewFilter('all');
    setChordsReviewFilter('all');
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
  const showFilterBar = showPublicFilters || showReviewFilter;

  const matrix = (
    <div className="catalog-filters__matrix">
      {CHORDS_ENABLED ? <TriGroup label="Cifra" value={chordsFilter} onChange={setChordsFilter} /> : null}
      {/* <TriGroup label="Letra" value={lyricsFilter} onChange={setLyricsFilter} /> */}
      {showReviewFilter ? (
        <>
          <ReviewSelect label="Revisor de letra" value={lyricsReviewFilter} onChange={setLyricsReviewFilter} />
          {CHORDS_ENABLED ? (
            <ReviewSelect label="Revisor de cifra" value={chordsReviewFilter} onChange={setChordsReviewFilter} />
          ) : null}
        </>
      ) : null}
    </div>
  );

  const actions = (
    <div className="catalog-filters__actions">
      {showPublicFilters ? (
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
      ) : null}
      <button
        type="button"
        className="catalog-filters__clear"
        onClick={clearFilters}
        disabled={!hasAnyFilter}
      >
        <CloseIcon size={13} />
        Limpar filtros
      </button>
    </div>
  );

  let metaRow: ReactNode = null;
  if (showFilterBar) {
    metaRow = (
      <div className="catalog-filters">
        <div className="catalog-filters__toolbar">
          {matrix}
          {actions}
        </div>

        {countNode ? <div className="catalog-filters__footer">{countNode}</div> : null}

        {showPublicFilters && filtersOpen ? (
          <div className="catalog-filters__extra" id={`${filterId}-extra`}>
            <label className="catalog-filters__field">
              <span className="catalog-filters__label">Artista</span>
              <ArtistField
                artists={artists}
                query={artistQuery}
                selected={activeArtist}
                onChange={(next, exact) => {
                  setArtistQuery(next);
                  setSelectedArtist(exact);
                }}
              />
            </label>

            {CHORDS_ENABLED ? (
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
            ) : null}
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

  if (pending && songs.length === 0) {
    return (
      <>
        {panel}
        <div className="empty song-cache-loading" aria-busy="true">
          <strong>Carregando…</strong>
          <span className="small">Abrindo a biblioteca</span>
        </div>
      </>
    );
  }

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
      <SongList
        songs={visible}
        showSnippet={showSnippet}
        admin={admin}
        sortBy={sortBy}
        onSort={setSortBy}
      />
      <footer className="db-foot">
        <span>lyra.music.db — v1</span>
        <span>{sortBy === 'artist' ? 'ordenado por artista' : 'ordenado por título'}</span>
      </footer>
    </>
  );
}
