'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { saveCustomSlides } from '@/app/slides/actions';
import { lyricsToSlides } from '@/lib/slides';
import { publishedKeys } from '@/lib/songs';
import {
  createBlankPlaylistItem,
  isCustomPlaylistItem,
  itemFromHit,
  itemPlaylistKey,
  playlistItemHref,
  readPlaylist,
  writePlaylist,
  type PlaylistItem,
} from '@/lib/playlist';
import type { SearchHit } from '@/lib/types';

const MOVE_MS = 220;

function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function playlistRows(list: HTMLOListElement | null) {
  if (!list) return [] as HTMLLIElement[];
  return Array.from(list.querySelectorAll<HTMLLIElement>(':scope > [data-slug]'));
}

function readRowTops(list: HTMLOListElement | null) {
  const tops = new Map<string, number>();
  for (const el of playlistRows(list)) {
    const slug = el.dataset.slug;
    if (slug) tops.set(slug, el.getBoundingClientRect().top);
  }
  return tops;
}

function clearRowMotion(list: HTMLOListElement | null) {
  for (const el of playlistRows(list)) {
    el.style.transition = 'none';
    el.style.transform = '';
    el.classList.remove('playlist-item--moving', 'playlist-item--settling');
  }
}

export default function PlaylistBuilder({
  songs,
  cultoMode = false,
  isAdmin = false,
  loggedIn = false,
}: {
  songs: SearchHit[];
  cultoMode?: boolean;
  isAdmin?: boolean;
  loggedIn?: boolean;
}) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const pendingFlip = useRef<{ prev: Map<string, number>; slug: string } | null>(null);
  const hrefMode = cultoMode ? 'slides' : 'cifra';

  useEffect(() => {
    setItems(readPlaylist());
  }, []);

  useLayoutEffect(() => {
    const pending = pendingFlip.current;
    if (!pending) return;
    pendingFlip.current = null;

    const list = listRef.current;
    if (!list) return;

    const rows = playlistRows(list);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (const el of rows) {
      const slug = el.dataset.slug;
      if (!slug) continue;
      const first = pending.prev.get(slug);
      if (first == null) continue;
      const dy = first - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
      if (slug === pending.slug) el.classList.add('playlist-item--moving');
    }

    void list.offsetHeight;

    if (reduce) {
      clearRowMotion(list);
      return;
    }

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        for (const el of rows) {
          el.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          el.style.transform = 'translate3d(0, 0, 0)';
        }
      });
    });

    let settleTimer = 0;
    const doneTimer = window.setTimeout(() => {
      for (const el of rows) {
        const moved = el.dataset.slug === pending.slug;
        el.style.transition = '';
        el.style.transform = '';
        el.classList.remove('playlist-item--moving');
        if (moved) el.classList.add('playlist-item--settling');
      }
      settleTimer = window.setTimeout(() => {
        for (const el of rows) el.classList.remove('playlist-item--settling');
      }, 380);
    }, MOVE_MS + 24);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(doneTimer);
      window.clearTimeout(settleTimer);
      if (!pendingFlip.current) clearRowMotion(list);
    };
  }, [items]);

  function persist(next: PlaylistItem[]) {
    setItems(next);
    writePlaylist(next);
  }

  function addBlank() {
    const item = createBlankPlaylistItem();
    persist([...items, item]);
    setEditingId(item.id);
    void saveCustomSlides({
      id: item.id,
      title: item.title,
      sourceLyrics: '',
      slides: [],
    });
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const title = listRef.current?.querySelector<HTMLInputElement>(`[data-slug="${item.slug}"] .playlist-item__title-input`);
      title?.focus();
      title?.select();
    });
  }

  function patchItem(slug: string, patch: Partial<PlaylistItem>) {
    setItems((current) => {
      const next = current.map((item) => (item.slug === slug ? { ...item, ...patch } : item));
      writePlaylist(next);
      const updated = next.find((item) => item.slug === slug);
      if (updated && isCustomPlaylistItem(updated)) {
        void saveCustomSlides({
          id: updated.id,
          title: updated.title,
          sourceLyrics: updated.customLyrics ?? '',
          slides: updated.customSlides ?? lyricsToSlides(updated.customLyrics ?? ''),
        });
      }
      return next;
    });
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
    if (items.length > 0 && !window.confirm('Começar uma playlist nova? As músicas atuais saem da lista.')) {
      return;
    }
    persist([]);
  }

  function move(slug: string, delta: -1 | 1) {
    const index = items.findIndex((item) => item.slug === slug);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= items.length) return;

    clearRowMotion(listRef.current);
    pendingFlip.current = { prev: readRowTops(listRef.current), slug };

    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persist(next);
  }

  function focusAdd() {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchRef.current?.focus();
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
      <h1 className="playlist-page__title">{cultoMode ? 'Playlist do Culto' : 'Playlist'}</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        {cultoMode
          ? 'Adicione as músicas, organize a ordem e toque em uma para abrir os slides.'
          : 'Monte a ordem e, se quiser, toque no tom de cada música para mudar só nesta playlist.'}
      </p>

      <div className="playlist-page__actions">
        <button type="button" className="btn btn--primary" onClick={focusAdd}>
          Adicionar música
        </button>
        {loggedIn ? (
          <button type="button" className="btn btn--ghost" onClick={addBlank}>
            + Música em branco
          </button>
        ) : null}
        {items.length > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={clear}>
            {cultoMode ? 'Nova playlist' : 'Limpar'}
          </button>
        ) : null}
        {isAdmin ? (
          <Link href="/admin" className="btn btn--ghost">
            Administração
          </Link>
        ) : null}
      </div>

      <div className="playlist-page__head">
        <div className="section-title" style={{ margin: 0 }}>
          {items.length === 0
            ? 'Nenhuma música na playlist'
            : `${items.length} ${items.length === 1 ? 'música' : 'músicas'}`}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 8 }}>
          <strong>Playlist vazia</strong>
          <span className="small">
            {cultoMode
              ? 'Toque em Adicionar música ou crie uma música em branco para medley.'
              : 'Toque no + ao lado da música para incluir.'}
          </span>
        </div>
      ) : (
        <ol className="playlist-list" ref={listRef}>
          {items.map((item, index) => {
            const custom = isCustomPlaylistItem(item);
            const editing = custom && editingId === item.id;
            return (
              <li
                key={item.slug}
                data-slug={item.slug}
                className={`playlist-item${custom ? ' playlist-item--custom' : ''}`}
              >
                <div className="playlist-item__row">
                  <div className="playlist-move">
                    <button
                      type="button"
                      className="playlist-move__btn"
                      aria-label={`Subir ${item.title}`}
                      disabled={index === 0}
                      onClick={() => move(item.slug, -1)}
                    >
                      <ChevronUpIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="playlist-move__btn"
                      aria-label={`Descer ${item.title}`}
                      disabled={index === items.length - 1}
                      onClick={() => move(item.slug, 1)}
                    >
                      <ChevronDownIcon size={16} />
                    </button>
                  </div>
                  {custom ? (
                    <div className="playlist-item__link">
                      <span className="playlist-badge">{index + 1}</span>
                      <span className="playlist-item__body">
                        <input
                          className="playlist-item__title-input"
                          value={item.title}
                          aria-label="Nome da música personalizada"
                          onChange={(event) => patchItem(item.slug, { title: event.target.value })}
                          onBlur={(event) => {
                            if (!event.target.value.trim()) {
                              patchItem(item.slug, { title: 'Música em branco' });
                            }
                          }}
                        />
                        <span className="song-item__artist">Só nesta playlist</span>
                      </span>
                    </div>
                  ) : (
                    <Link href={playlistItemHref(item, hrefMode)} className="playlist-item__link">
                      <span className="playlist-badge">{index + 1}</span>
                      <span className="playlist-item__body">
                        <span className="song-item__title">{item.title}</span>
                        <span className="song-item__artist">{item.artist || 'Sem artista'}</span>
                      </span>
                    </Link>
                  )}
                  {custom ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditingId(editing ? null : item.id)}
                      >
                        {editing ? 'Fechar letra' : 'Editar letra'}
                      </button>
                      <Link href={playlistItemHref(item, 'slides')} className="btn btn--primary btn--sm">
                        Slides
                      </Link>
                    </>
                  ) : null}
                  {!custom && !cultoMode ? (
                    <PlaylistKeyChip
                      item={item}
                      fallbackKeys={songs.find((song) => song.slug === item.slug)?.available_keys}
                      onChange={(key) => setKey(item.slug, key)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remover ${item.title}`}
                    onClick={() => remove(item.slug)}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
                {editing ? (
                  <label className="playlist-item__editor">
                    <span className="field__label">Letra personalizada (só os slides desta faixa)</span>
                    <textarea
                      className="textarea"
                      rows={7}
                      value={item.customLyrics ?? ''}
                      placeholder="Cole o medley ou a sequência. Separe as estrofes com uma linha em branco."
                      onChange={(event) =>
                        patchItem(item.slug, { customLyrics: event.target.value, customSlides: null })
                      }
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="section-title" ref={catalogRef} id="adicionar-musica">
        Adicionar músicas
      </div>
      <div className="search">
        <span className="search__icon">
          <SearchIcon size={17} />
        </span>
        <input
          ref={searchRef}
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
