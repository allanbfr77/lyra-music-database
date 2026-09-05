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
  /** Música só desta playlist — não existe no catálogo. */
  custom?: boolean;
  /** Letra personalizada usada só para gerar os slides desta faixa. */
  customLyrics?: string;
  /** Slides já editados desta faixa personalizada. */
  customSlides?: string[] | null;
};

export function isCustomPlaylistItem(item: PlaylistItem | null | undefined): boolean {
  return Boolean(item?.custom || item?.slug?.startsWith('custom-'));
}

export function customPlaylistPath(id: string) {
  return `/playlist/custom/${encodeURIComponent(id)}`;
}

export function createBlankPlaylistItem(): PlaylistItem {
  const id = crypto.randomUUID();
  return {
    id,
    slug: `custom-${id}`,
    title: 'Música em branco',
    artist: 'Só nesta playlist',
    base_key: 'C',
    playlist_key: 'C',
    available_keys: [],
    has_chords: false,
    custom: true,
    customLyrics: '',
    customSlides: null,
  };
}

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
  if (isCustomPlaylistItem(item)) return playlistSlidesHref(item);
  const suffix = playlistQuery(true);
  if (!item.has_chords) return `/musica/${item.slug}${suffix}`;
  return `${cifraPath(item.slug, itemPlaylistKey(item))}${suffix}`;
}

/** No culto, a música abre direto nos slides e volta com ?pl=1. */
export function playlistSlidesHref(item: PlaylistItem) {
  if (isCustomPlaylistItem(item)) return `${customPlaylistPath(item.id)}${playlistQuery(true)}`;
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
      .map((item) => {
        const custom = Boolean(item.custom) || String(item.slug).startsWith('custom-');
        return {
          ...item,
          base_key: normalizeKey(item.base_key),
          playlist_key: itemPlaylistKey(item),
          available_keys: item.available_keys ?? [],
          custom,
          customLyrics: custom && typeof item.customLyrics === 'string' ? item.customLyrics : custom ? '' : item.customLyrics,
          customSlides: custom ? (Array.isArray(item.customSlides) ? item.customSlides : null) : item.customSlides,
        };
      });
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
