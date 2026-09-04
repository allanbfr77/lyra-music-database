'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, ChevronDownIcon, CloseIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { normalizeKey } from '@/lib/chords';
import { publishedKeys } from '@/lib/songs';
import {
  itemFromHit,
  itemPlaylistKey,
  playlistSongHref,
  readPlaylist,
  writePlaylist,
  type PlaylistItem,
} from '@/lib/playlist';
import type { SearchHit } from '@/lib/types';

function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export default function PlaylistBuilder({ songs }: { songs: SearchHit[] }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    setItems(readPlaylist());
  }, []);

  function persist(next: PlaylistItem[]) {
    setItems(next);
    writePlaylist(next);
  }

  function add(song: SearchHit) {
    setItems((current) => {
      if (current.some((item) => item.slug === song.slug)) return current;
      const next = [...current, itemFromHit(song)];
      writePlaylist(next);
      return next;
    });
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function remove(slug: string) {
    setItems((current) => {
      const next = current.filter((item) => item.slug !== slug);
      writePlaylist(next);
      return next;
    });
  }

  function clear() {
    persist([]);
  }

  function setKey(slug: string, key: string) {
    setItems((current) => {
      const next = current.map((item) => (item.slug === slug ? { ...item, playlist_key: key } : item));
      writePlaylist(next);
      return next;
    });
  }

  const addedSlugs = useMemo(() => new Set(items.map((item) => item.slug)), [items]);
  const catalog = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return songs;
    return songs.filter((song) => fold(song.title).includes(q) || fold(song.artist).includes(q));
  }, [songs, query]);

  return (
    <div className="playlist-page">
      <h1 className="playlist-page__title">Playlist</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Monte a ordem e, se quiser, toque no tom de cada música para mudar só nesta playlist.
      </p>

      <div className="playlist-page__head">
        <div className="section-title" style={{ margin: 0 }}>
          {items.length === 0 ? 'Nenhuma música na playlist' : `${items.length} na playlist`}
        </div>
        {items.length > 0 ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
            Limpar
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 8 }}>
          <strong>Playlist vazia</strong>
          <span className="small">Toque no + ao lado da música para incluir.</span>
        </div>
      ) : (
        <ol className="playlist-list" ref={listRef}>
          {items.map((item, index) => (
            <li key={item.slug} className="playlist-item">
              <Link href={playlistSongHref(item)} className="playlist-item__link">
                <span className="playlist-badge">{index + 1}</span>
                <span className="playlist-item__body">
                  <span className="song-item__title">{item.title}</span>
                  <span className="song-item__artist">{item.artist || 'Sem artista'}</span>
                </span>
              </Link>
              <PlaylistKeyChip
                item={item}
                fallbackKeys={songs.find((song) => song.slug === item.slug)?.available_keys}
                onChange={(key) => setKey(item.slug, key)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remover ${item.title}`}
                onClick={() => remove(item.slug)}
              >
                <CloseIcon size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="section-title">Adicionar músicas</div>
      <div className="search">
        <span className="search__icon">
          <SearchIcon size={17} />
        </span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Buscar título ou artista"
          aria-label="Buscar músicas para a playlist"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button type="button" className="search__clear" aria-label="Limpar busca" onClick={() => setQuery('')}>
            <CloseIcon size={16} />
          </button>
        ) : null}
      </div>

      {catalog.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <strong>Nada encontrado</strong>
          <span className="small">Tente outra busca.</span>
        </div>
      ) : (
        <ul className="playlist-catalog">
          {catalog.map((song) => {
            const added = addedSlugs.has(song.slug);
            return (
              <li key={song.slug} className="playlist-catalog__row">
                <button
                  type="button"
                  className="playlist-catalog__add"
                  data-added={added}
                  disabled={added}
                  aria-label={added ? `${song.title} já está na playlist` : `Adicionar ${song.title}`}
                  onClick={() => add(song)}
                >
                  <span className="playlist-item__body">
                    <span className="song-item__title">{song.title}</span>
                    <span className="song-item__artist">{song.artist || 'Sem artista'}</span>
                  </span>
                  <span className={`icon-btn playlist-add${added ? ' playlist-add--on' : ''}`} aria-hidden="true">
                    {added ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PlaylistKeyChip({
  item,
  fallbackKeys,
  onChange,
}: {
  item: PlaylistItem;
  fallbackKeys?: string[];
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pickerId = useId();
  const active = itemPlaylistKey(item);
  const keys = publishedKeys({
    base_key: item.base_key,
    available_keys: item.available_keys?.length ? item.available_keys : fallbackKeys ?? [],
  });
  const canChange = item.has_chords && keys.length > 1;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!canChange) {
    return (
      <span className="key-chip" title="Tom original">
        {active}
      </span>
    );
  }

  return (
    <div className="playlist-key" ref={root}>
      <button
        type="button"
        className="key-chip key-chip--trigger"
        data-active="true"
        aria-expanded={open}
        aria-controls={pickerId}
        aria-label={`Tom ${active}. Toque para alterar nesta playlist`}
        title="Toque para alterar o tom nesta playlist"
        onClick={() => setOpen((v) => !v)}
      >
        {active}
        <ChevronDownIcon size={14} />
      </button>
      {open ? (
        <div className="key-picker" id={pickerId} role="dialog" aria-label="Escolher tom da playlist">
          <div className="key-picker__grid">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                className="key-picker__cell"
                data-active={key === active}
                aria-current={key === active ? 'true' : undefined}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
