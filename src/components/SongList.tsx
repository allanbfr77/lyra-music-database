'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SearchHit } from '@/lib/types';
import { CHORDS_ENABLED, normalizeKey } from '@/lib/chords';
import { EyeIcon, PencilIcon } from '@/components/icons';

export type CatalogSong = SearchHit & {
  href?: string;
  draft?: boolean;
  /** false/ausente = Revisar; true = Revisada. */
  chords_reviewed?: boolean;
  /** false/ausente = Revisar; true = Revisada. Independente de chords_reviewed. */
  lyrics_reviewed?: boolean;
};

export type SongSort = 'title' | 'artist';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** O Postgres marca os trechos com [[ ]]; escapamos tudo e só então viram <mark>. */
function highlight(snippet: string): string {
  return snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[\[/g, '<mark>')
    .replace(/\]\]/g, '</mark>');
}

function foldTitle(title: string) {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Primeira letra do rótulo ordenado, sem acento. */
function groupLetter(label: string) {
  const folded = foldTitle(label);
  const letter = folded.charAt(0).toUpperCase();
  return letter >= 'A' && letter <= 'Z' ? letter : '#';
}

function sortLabel(song: CatalogSong, sortBy: SongSort) {
  if (sortBy === 'artist') return song.artist.trim() || 'Sem artista';
  return song.title;
}

function groupSongs(songs: CatalogSong[], sortBy: SongSort) {
  const sorted = [...songs].sort((a, b) => {
    const primary = foldTitle(sortLabel(a, sortBy)).localeCompare(foldTitle(sortLabel(b, sortBy)), 'pt-BR');
    if (primary !== 0) return primary;
    const title = foldTitle(a.title).localeCompare(foldTitle(b.title), 'pt-BR');
    if (title !== 0) return title;
    return foldTitle(a.artist).localeCompare(foldTitle(b.artist), 'pt-BR');
  });
  const groups: { letter: string; songs: CatalogSong[] }[] = [];
  for (const song of sorted) {
    const letter = groupLetter(sortLabel(song, sortBy));
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.songs.push(song);
    else groups.push({ letter, songs: [song] });
  }
  groups.sort((a, b) => {
    if (a.letter === '#') return 1;
    if (b.letter === '#') return -1;
    return a.letter.localeCompare(b.letter, 'pt-BR');
  });
  return groups;
}

function songHref(song: CatalogSong) {
  if (song.href) return song.href;
  return `/musica/${song.slug}`;
}

function SongRow({
  song,
  showSnippet,
  admin,
}: {
  song: CatalogSong;
  showSnippet: boolean;
  admin: boolean;
}) {
  const key = normalizeKey(song.base_key);
  const artist = song.artist || 'Sem artista';
  // A cor verde de "letra revisada" é exclusiva da Biblioteca de Admin — a página
  // pública sempre mostra o título na cor padrão, revisado ou não.
  const lyricsReviewed = admin && Boolean(song.lyrics_reviewed);
  return (
    <li className="song-item">
      <div className="song-item__row">
        <div className="song-item__title-wrap">
          <div className={lyricsReviewed ? 'song-item__title song-item__title--reviewed' : 'song-item__title'}>
            {song.title}
            {song.draft ? <span className="chip song-item__draft">rascunho</span> : null}
          </div>
          <div className="song-item__artist song-item__artist--nested">{artist}</div>
          {showSnippet && song.snippet ? (
            <div className="song-item__snippet" dangerouslySetInnerHTML={{ __html: highlight(song.snippet) }} />
          ) : null}
        </div>
        <div className="song-item__artist song-item__artist--col">{artist}</div>
        {CHORDS_ENABLED && song.has_chords ? (
          <span className="song-item__key">{key}</span>
        ) : CHORDS_ENABLED ? (
          <span className="song-item__key song-item__key--empty" aria-hidden="true">
            —
          </span>
        ) : null}
        <div className="song-item__actions">
          <Link
            href={songHref(song)}
            className="song-item__action"
            aria-label={`Visualizar ${song.title}`}
            title="Visualizar"
          >
            <EyeIcon size={15} />
          </Link>
          <Link
            href={`/admin/musica/${song.id}`}
            className="song-item__action"
            aria-label={`Editar ${song.title}`}
            title="Editar"
          >
            <PencilIcon size={15} />
          </Link>
        </div>
      </div>
    </li>
  );
}

export default function SongList({
  songs,
  showSnippet = false,
  admin = false,
  sortBy,
  onSort,
}: {
  songs: CatalogSong[];
  showSnippet?: boolean;
  /** Biblioteca de Admin: habilita a cor verde de "letra revisada" no título. Nunca na página pública. */
  admin?: boolean;
  sortBy: SongSort;
  onSort: (next: SongSort) => void;
}) {
  const groups = groupSongs(songs, sortBy);
  const present = new Set(groups.map((group) => group.letter));
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const groupsRef = useRef(groups);
  const jumpLock = useRef<string | null>(null);
  groupsRef.current = groups;
  const [activeLetter, setActiveLetter] = useState<string | null>(groups[0]?.letter ?? null);
  const groupKey = groups.map((group) => `${group.letter}:${group.songs.length}`).join('|');

  useEffect(() => {
    let frame = 0;
    let endTimer = 0;
    jumpLock.current = null;

    function letterInView() {
      const nodes = groupsRef.current
        .map((group) => {
          const el = sectionRefs.current.get(group.letter);
          return el ? { letter: group.letter, el } : null;
        })
        .filter((item): item is { letter: string; el: HTMLElement } => item !== null);
      if (!nodes.length) return null;

      const header = document.querySelector('.site-header');
      const marker = (header?.getBoundingClientRect().bottom ?? 0) + 8;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        const visible = [...nodes]
          .reverse()
          .find((item) => item.el.getBoundingClientRect().top < window.innerHeight - 8);
        if (visible) return visible.letter;
      }

      let current = nodes[0].letter;
      for (const item of nodes) {
        if (item.el.getBoundingClientRect().top <= marker) current = item.letter;
      }
      return current;
    }

    function sync() {
      const locked = jumpLock.current;
      if (locked) {
        setActiveLetter((prev) => (prev === locked ? prev : locked));
        return;
      }
      const next = letterInView();
      setActiveLetter((prev) => (prev === next ? prev : next));
    }

    function releaseLock() {
      if (!jumpLock.current) return;
      jumpLock.current = null;
      sync();
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
        if (!jumpLock.current) return;
        window.clearTimeout(endTimer);
        endTimer = window.setTimeout(releaseLock, 140);
      });
    }

    sync();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.clearTimeout(endTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [groupKey]);

  function jumpTo(letter: string) {
    const el = sectionRefs.current.get(letter);
    if (!el) return;
    jumpLock.current = letter;
    setActiveLetter(letter);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => {
      if (jumpLock.current !== letter) return;
      const marker = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + 8;
      if (Math.abs(el.getBoundingClientRect().top - marker) <= 16) jumpLock.current = null;
    }, 80);
  }

  return (
    <div className="song-browser">
      <div className={CHORDS_ENABLED ? 'song-groups' : 'song-groups song-groups--lyrics'}>
        <div className="song-table-head">
          <div>
            <button
              type="button"
              className="song-table-head__sort"
              data-active={sortBy === 'title'}
              aria-pressed={sortBy === 'title'}
              onClick={() => onSort('title')}
            >
              Título
            </button>
          </div>
          <div className="song-table-head__artist">
            <button
              type="button"
              className="song-table-head__sort"
              data-active={sortBy === 'artist'}
              aria-pressed={sortBy === 'artist'}
              onClick={() => onSort('artist')}
            >
              Artista
            </button>
          </div>
          {CHORDS_ENABLED ? <div className="song-table-head__key">Tom</div> : null}
          <div className="song-table-head__end" aria-hidden="true" />
        </div>
        {groups.map((group) => (
          <section
            key={group.letter}
            data-letter={group.letter}
            aria-label={
              sortBy === 'artist'
                ? `Artistas com a letra ${group.letter}`
                : `Músicas com a letra ${group.letter}`
            }
            ref={(node) => {
              if (node) sectionRefs.current.set(group.letter, node);
              else sectionRefs.current.delete(group.letter);
            }}
          >
            <div className="letter-head">
              <span className="letter-head__label">{group.letter}</span>
            </div>
            <ul className="song-list song-list--grouped">
              {group.songs.map((song) => (
                <SongRow key={song.id} song={song} showSnippet={showSnippet} admin={admin} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <nav className="alpha-index" aria-label="Índice alfabético">
        {ALPHABET.map((letter) => {
          const enabled = present.has(letter);
          const selected = enabled && activeLetter === letter;
          return (
            <button
              key={letter}
              type="button"
              className="alpha-index__letter"
              disabled={!enabled}
              data-active={selected}
              aria-current={selected ? 'true' : undefined}
              aria-label={enabled ? `Ir para a letra ${letter}` : `Letra ${letter} sem resultados`}
              onClick={() => jumpTo(letter)}
            >
              {letter}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
