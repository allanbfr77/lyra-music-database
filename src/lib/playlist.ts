import { cifraPath, normalizeKey } from '@/lib/chords';
import type { SearchHit } from '@/lib/types';

export const PLAYLIST_QUERY = 'pl';
export const PLAYLIST_STORAGE_KEY = 'lyra:playlist';

export type PlaylistItem = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  has_chords: boolean;
};

export function isPlaylistQuery(value: string | null | undefined) {
  return value === '1';
}

export function playlistQuery(inPlaylist: boolean) {
  return inPlaylist ? `?${PLAYLIST_QUERY}=1` : '';
}

export function itemFromHit(song: SearchHit): PlaylistItem {
  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    base_key: song.base_key,
    has_chords: song.has_chords,
  };
}

export function playlistSongHref(item: PlaylistItem) {
  const suffix = playlistQuery(true);
  if (!item.has_chords) return `/musica/${item.slug}${suffix}`;
  return `${cifraPath(item.slug, normalizeKey(item.base_key))}${suffix}`;
}

export function readPlaylist(): PlaylistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaylistItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.slug === 'string' && typeof item.title === 'string');
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
