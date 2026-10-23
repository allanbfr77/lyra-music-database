'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloseIcon, PlusIcon } from '@/components/icons';
import { SECTIONS, foldTitle, titlesMatch, type SectionId } from '@/lib/playlist';
import {
  addPlaylistSong,
  removePlaylistSong,
  searchPlaylistSongs,
  type PlaylistSongHit,
} from '@/app/playlist/actions';

export function PlaylistRemove({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="setlist-remove-wrap">
      <button
        type="button"
        className="setlist-remove"
        aria-label={`Remover ${title}`}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await removePlaylistSong(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <CloseIcon size={14} />
      </button>
      {error ? <span className="setlist-remove-error">{error}</span> : null}
    </span>
  );
}

export function PlaylistAdd({ cultoKey, taken }: { cultoKey: string; taken: string[] }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tom, setTom] = useState('');
  const [section, setSection] = useState<SectionId>('principal');
  const [hits, setHits] = useState<PlaylistSongHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const id = request.current + 1;
    request.current = id;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchPlaylistSongs(q).then((rows) => {
        if (request.current !== id) return;
        setHits(rows);
        setSearching(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function isTaken(title: string) {
    return taken.some((name) => titlesMatch(name, title));
  }

  function add(input: { songId?: string; title?: string }) {
    setError(null);
    startTransition(async () => {
      const result = await addPlaylistSong({
        cultoKey,
        songId: input.songId,
        title: input.title,
        tom,
        section,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuery('');
      setHits([]);
      router.refresh();
    });
  }

  const trimmed = query.trim();
  const showFree =
    trimmed.length >= 2 &&
    !searching &&
    !hits.some((hit) => foldTitle(hit.title) === foldTitle(trimmed)) &&
    !isTaken(trimmed);

  return (
    <div className="setlist-add no-print">
      {open ? (
        <div className="setlist-add__panel">
          <div className="setlist-add__row">
            <label className="visually-hidden" htmlFor={`${listId}-section`}>
              Seção
            </label>
            <select
              id={`${listId}-section`}
              className="select"
              value={section}
              onChange={(event) => setSection(event.target.value as SectionId)}
            >
              {SECTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor={`${listId}-tom`}>
              Tom deste culto
            </label>
            <input
              id={`${listId}-tom`}
              className="input"
              value={tom}
              placeholder="Tom"
              maxLength={12}
              onChange={(event) => setTom(event.target.value)}
            />
          </div>
          <label className="visually-hidden" htmlFor={`${listId}-q`}>
            Buscar música no banco
          </label>
          <input
            ref={inputRef}
            id={`${listId}-q`}
            className="input setlist-add__search"
            value={query}
            placeholder="Buscar música no banco"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const first = hits.find((hit) => !isTaken(hit.title));
              if (first) add({ songId: first.id });
              else if (showFree) add({ title: trimmed });
            }}
          />
          {searching ? <p className="setlist-add__hint">Buscando…</p> : null}
          {hits.length > 0 ? (
            <ul className="setlist-hits" id={listId}>
              {hits.map((hit) => {
                const takenHit = isTaken(hit.title);
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="setlist-hit"
                      disabled={pending || takenHit}
                      onClick={() => add({ songId: hit.id })}
                    >
                      <span className="setlist-hit__title">{hit.title}</span>
                      <span className="setlist-hit__meta">
                        {takenHit
                          ? 'Já está neste culto'
                          : [hit.artist || 'Sem artista', hit.base_key].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {showFree ? (
            <button
              type="button"
              className="btn setlist-add__free"
              disabled={pending}
              onClick={() => add({ title: trimmed })}
            >
              Incluir «{trimmed}» mesmo assim
            </button>
          ) : null}
          {isTaken(trimmed) && trimmed.length >= 2 ? (
            <p className="setlist-add__hint">Essa música já está neste culto.</p>
          ) : null}
          {error ? <p className="setlist-add__error">{error}</p> : null}
        </div>
      ) : null}
      <button type="button" className="btn setlist-add__toggle" onClick={() => setOpen((value) => !value)}>
        {open ? <CloseIcon size={15} /> : <PlusIcon size={15} />}
        {open ? 'Fechar' : 'Adicionar música'}
      </button>
    </div>
  );
}
