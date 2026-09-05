import { cifraPath, normalizeKey } from '@/lib/chords';
import { slidesPath } from '@/lib/slides';
import type { SearchHit } from '@/lib/types';

export const PLAYLIST_QUERY = 'pl';
export const PLAYLIST_STORAGE_KEY = 'lyra:playlist';

export type PlaylistItem = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  /** Tom escolhido só nesta playlist. Sem valor = tom original. */
  playlist_key?: string;
  available_keys?: string[];
  has_chords: boolean;
};

export function itemPlaylistKey(item: PlaylistItem) {
  return normalizeKey(item.playlist_key || item.base_key);
}

export function isPlaylistQuery(value: string | null | undefined) {
  return value === '1';
}

export function playlistQuery(inPlaylist: boolean) {
  return inPlaylist ? `?${PLAYLIST_QUERY}=1` : '';
}

export function itemFromHit(song: SearchHit): PlaylistItem {
  const base = normalizeKey(song.base_key);
  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    base_key: base,
    playlist_key: base,
    available_keys: song.available_keys ?? [],
    has_chords: song.has_chords,
  };
}

export function playlistSongHref(item: PlaylistItem) {
  const suffix = playlistQuery(true);
  if (!item.has_chords) return `/musica/${item.slug}${suffix}`;
  return `${cifraPath(item.slug, itemPlaylistKey(item))}${suffix}`;
}

/** No culto, a música abre direto nos slides e volta com ?pl=1. */
export function playlistSlidesHref(item: PlaylistItem) {
  return `${slidesPath(item.slug)}${playlistQuery(true)}`;
}

export function playlistItemHref(item: PlaylistItem, mode: 'slides' | 'cifra' = 'cifra') {
  return mode === 'slides' ? playlistSlidesHref(item) : playlistSongHref(item);
}

export function readPlaylist(): PlaylistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaylistItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.slug === 'string' && typeof item.title === 'string')
      .map((item) => ({
        ...item,
        base_key: normalizeKey(item.base_key),
        playlist_key: itemPlaylistKey(item),
        available_keys: item.available_keys ?? [],
      }));
  } catch {
    return [];
  }
}

export function writePlaylist(items: PlaylistItem[]) {
  try {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* armazenamento indisponível */
  }
}

export function neighborsInPlaylist(slug: string, items: PlaylistItem[]) {
  const index = items.findIndex((item) => item.slug === slug);
  if (index < 0) return { index: -1, prev: null, next: null };
  return {
    index,
    prev: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
  };
}
