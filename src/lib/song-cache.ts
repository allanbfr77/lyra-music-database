/**
 * Cache local (IndexedDB) de letras e cifras para abertura rápida.
 * `updated_at` espelha o valor do servidor e permite detectar conteúdo desatualizado.
 */

import type { Instrumento, Song } from '@/lib/types';

export const SONG_CACHE_DB = 'lyra-song-cache';
export const SONG_CACHE_STORE = 'songs';
export const SONG_CACHE_VERSION = 1;

export type CachedOverride = {
  key: string;
  chords: string;
  instrumento?: Instrumento;
};

export type CachedSongPayload = {
  /** Versão do formato local — facilita migrações futuras. */
  format: 'lyra.cache.song.v1';
  id: string;
  slug: string;
  /** `updated_at` do servidor no momento do download (detecção de stale). */
  updated_at: string;
  /** Quando o navegador gravou esta cópia. */
  cached_at: string;
  song: Song;
  overrides: CachedOverride[];
  keys: string[];
};

type SyncSong = {
  id: string;
  slug: string;
  updated_at: string;
  has_chords: boolean;
};

type ApiKey = {
  key: string;
  source: 'manual' | 'auto';
  chords?: string;
};

type ApiSong = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  language: string | null;
  base_key: string;
  capo: number;
  tempo_bpm: number | null;
  time_signature: string | null;
  source_url: string | null;
  youtube_url: string | null;
  notes: string | null;
  lyrics: string;
  instrumento: Instrumento;
  instrumentos: Instrumento[];
  chords: string | null;
  keys: ApiKey[];
  created_at: string;
  updated_at: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SONG_CACHE_DB, SONG_CACHE_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o cache local.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SONG_CACHE_STORE)) {
        const store = db.createObjectStore(SONG_CACHE_STORE, { keyPath: 'slug' });
        store.createIndex('updated_at', 'updated_at', { unique: false });
        store.createIndex('id', 'id', { unique: true });
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Erro no IndexedDB.'));
  });
}

export async function getCachedSong(slug: string): Promise<CachedSongPayload | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(SONG_CACHE_STORE, 'readonly');
      const result = await idbRequest(tx.objectStore(SONG_CACHE_STORE).get(slug));
      return (result as CachedSongPayload | undefined) ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function putCachedSong(payload: CachedSongPayload): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    const tx = db.transaction(SONG_CACHE_STORE, 'readwrite');
    await idbRequest(tx.objectStore(SONG_CACHE_STORE).put(payload));
  } finally {
    db.close();
  }
}

/** Grava só se ainda não existir ou se o servidor tiver `updated_at` mais novo. */
export async function putCachedSongIfNewer(payload: CachedSongPayload): Promise<boolean> {
  const existing = await getCachedSong(payload.slug);
  if (existing && Date.parse(existing.updated_at) >= Date.parse(payload.updated_at)) {
    return false;
  }
  await putCachedSong(payload);
  return true;
}

export function isCacheStale(cached: CachedSongPayload, serverUpdatedAt: string): boolean {
  return Date.parse(cached.updated_at) < Date.parse(serverUpdatedAt);
}

export function payloadFromServerSong(
  song: Song,
  overrides: CachedOverride[],
  keys: string[]
): CachedSongPayload {
  return {
    format: 'lyra.cache.song.v1',
    id: song.id,
    slug: song.slug,
    updated_at: song.updated_at,
    cached_at: new Date().toISOString(),
    song,
    overrides,
    keys,
  };
}

function songFromApi(teclado: ApiSong, violao: ApiSong | null): Song {
  const keyList = teclado.keys.map((k) => k.key);
  const base = teclado.base_key;
  return {
    id: teclado.id,
    slug: teclado.slug,
    title: teclado.title,
    artist: teclado.artist,
    lyrics: teclado.lyrics ?? '',
    slides: [],
    chords: teclado.chords ?? '',
    chords_guitar: violao?.chords ?? '',
    base_key: base,
    available_keys: keyList.filter((k) => k !== base),
    capo: teclado.capo ?? 0,
    tempo_bpm: teclado.tempo_bpm,
    time_signature: teclado.time_signature,
    language: teclado.language,
    source_url: teclado.source_url,
    youtube_url: teclado.youtube_url,
    notes: teclado.notes,
    published: true,
    created_at: teclado.created_at,
    updated_at: teclado.updated_at,
  };
}

function overridesFromApi(teclado: ApiSong, violao: ApiSong | null): CachedOverride[] {
  const from = (api: ApiSong, instrumento: Instrumento): CachedOverride[] =>
    api.keys
      .filter((k) => k.source === 'manual' && (k.chords ?? '').trim())
      .map((k) => ({ key: k.key, chords: k.chords as string, instrumento }));

  return [...from(teclado, 'teclado'), ...(violao ? from(violao, 'violao') : [])];
}

export function payloadFromApiSongs(teclado: ApiSong, violao: ApiSong | null): CachedSongPayload {
  return {
    format: 'lyra.cache.song.v1',
    id: teclado.id,
    slug: teclado.slug,
    updated_at: teclado.updated_at,
    cached_at: new Date().toISOString(),
    song: songFromApi(teclado, violao),
    overrides: overridesFromApi(teclado, violao),
    keys: teclado.keys.map((k) => k.key),
  };
}

async function fetchApiSong(slug: string, instrumento: Instrumento): Promise<ApiSong> {
  const params = new URLSearchParams({ include: 'all_keys' });
  if (instrumento === 'violao') params.set('instrumento', 'violao');
  const res = await fetch(`/api/v1/songs/${encodeURIComponent(slug)}?${params}`);
  if (!res.ok) throw new Error(`Falha ao baixar ${slug} (${res.status})`);
  return (await res.json()) as ApiSong;
}

async function listAllSyncSongs(): Promise<SyncSong[]> {
  const songs: SyncSong[] = [];
  let since: string | null = null;
  let guard = 0;

  while (guard < 100) {
    guard += 1;
    const params = new URLSearchParams({ limit: '500' });
    if (since) params.set('since', since);
    const res = await fetch(`/api/v1/sync?${params}`);
    if (!res.ok) throw new Error('Falha ao listar músicas para download.');
    const data = (await res.json()) as {
      songs: SyncSong[];
      has_more: boolean;
      next_since: string | null;
    };
    songs.push(...data.songs);
    if (!data.has_more || !data.songs.length) break;
    since = data.next_since;
  }

  return songs;
}

export type DownloadProgress = {
  done: number;
  total: number;
  percent: number;
  currentSlug: string | null;
};

export type DownloadResult = {
  downloaded: number;
  skipped: number;
  failed: number;
};

let downloadLock = false;

export function isSongCacheDownloadRunning() {
  return downloadLock;
}

/**
 * Baixa letras/cifras progressivamente e grava no IndexedDB.
 * Pula músicas cujo `updated_at` local já coincide com o do servidor.
 */
export async function downloadAllSongsToCache(
  onProgress: (progress: DownloadProgress) => void
): Promise<DownloadResult> {
  if (downloadLock) throw new Error('Download já em andamento.');
  downloadLock = true;

  const result: DownloadResult = { downloaded: 0, skipped: 0, failed: 0 };

  try {
    const list = await listAllSyncSongs();
    const total = list.length;
    let done = 0;

    onProgress({ done: 0, total, percent: total ? 0 : 100, currentSlug: null });

    for (const item of list) {
      try {
        const existing = await getCachedSong(item.slug);
        if (existing && existing.updated_at === item.updated_at) {
          result.skipped += 1;
        } else {
          const teclado = await fetchApiSong(item.slug, 'teclado');
          const needsGuitar = teclado.instrumentos?.includes('violao');
          const violao = needsGuitar ? await fetchApiSong(item.slug, 'violao') : null;
          await putCachedSong(payloadFromApiSongs(teclado, violao));
          result.downloaded += 1;
        }
      } catch {
        result.failed += 1;
      }

      done += 1;
      onProgress({
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 100,
        currentSlug: item.slug,
      });
    }

    return result;
  } finally {
    downloadLock = false;
  }
}
