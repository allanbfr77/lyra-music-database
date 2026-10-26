/**
 * Persistent admin catalog (IndexedDB), same database as the per-song cache.
 * The page paints from this copy and only downloads the library again when the
 * server revision (count + newest updated_at) changes.
 */

import {
  applyServerCatalog,
  CATALOG_REV_COOKIE,
  catalogRevisionToken,
  revisionFromSongs,
  sameCatalogRevision,
  type CatalogOp,
  type CatalogRevision,
  type LibrarySong,
} from '@/lib/catalog';
import { CATALOG_CACHE_STORE, openSongCacheDb } from '@/lib/song-cache';

const SNAPSHOT_KEY = 'library';
const REVALIDATE_GAP_MS = 4000;

export type CatalogSnapshot = {
  key: typeof SNAPSHOT_KEY;
  revision: CatalogRevision;
  songs: LibrarySong[];
  savedAt: string;
};

type Listener = (snapshot: CatalogSnapshot) => void;

let memory: CatalogSnapshot | null = null;
let ops: CatalogOp[] = [];
let generation = 0;
let lastCheck = 0;
let flight: Promise<CatalogSnapshot | null> | null = null;
const listeners = new Set<Listener>();

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Erro no IndexedDB.'));
  });
}

function writeRevisionCookie(revision: CatalogRevision) {
  if (typeof document === 'undefined') return;
  document.cookie = `${CATALOG_REV_COOKIE}=${catalogRevisionToken(revision)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function clearRevisionCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${CATALOG_REV_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function notify(snapshot: CatalogSnapshot) {
  for (const listener of listeners) listener(snapshot);
}

export function getCatalogMemory(): CatalogSnapshot | null {
  return memory;
}

export function subscribeCatalog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Drops the in-memory copy and the revision cookie. IndexedDB is cleared separately. */
export function discardCatalogMemory() {
  generation += 1;
  memory = null;
  ops = [];
  lastCheck = 0;
  clearRevisionCookie();
}

async function readSnapshot(): Promise<CatalogSnapshot | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openSongCacheDb();
    try {
      if (!db.objectStoreNames.contains(CATALOG_CACHE_STORE)) return null;
      const tx = db.transaction(CATALOG_CACHE_STORE, 'readonly');
      const result = await idbRequest(tx.objectStore(CATALOG_CACHE_STORE).get(SNAPSHOT_KEY));
      return (result as CatalogSnapshot | undefined) ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot: CatalogSnapshot, gen: number): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (gen !== generation) return;
  const db = await openSongCacheDb();
  try {
    if (gen !== generation || !db.objectStoreNames.contains(CATALOG_CACHE_STORE)) return;
    const tx = db.transaction(CATALOG_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(CATALOG_CACHE_STORE);
    if (gen !== generation) {
      await idbRequest(store.delete(SNAPSHOT_KEY));
      return;
    }
    await idbRequest(store.put(snapshot));
  } finally {
    db.close();
  }
  if (gen !== generation) {
    memory = null;
    clearRevisionCookie();
  }
}

async function persist(songs: LibrarySong[], revision: CatalogRevision): Promise<CatalogSnapshot> {
  const gen = generation;
  const snapshot: CatalogSnapshot = {
    key: SNAPSHOT_KEY,
    revision,
    songs,
    savedAt: new Date().toISOString(),
  };
  if (
    memory &&
    memory.songs === songs &&
    catalogRevisionToken(memory.revision) === catalogRevisionToken(revision)
  ) {
    lastCheck = Date.now();
    return memory;
  }
  memory = snapshot;
  writeRevisionCookie(revision);
  notify(snapshot);
  await writeSnapshot(snapshot, gen);
  return memory ?? snapshot;
}

export async function revalidateCatalog(force = false): Promise<CatalogSnapshot | null> {
  if (!force && memory && Date.now() - lastCheck < REVALIDATE_GAP_MS) return memory;
  if (flight) return flight;
  flight = runRevalidate().finally(() => {
    flight = null;
  });
  return flight;
}

async function runRevalidate(): Promise<CatalogSnapshot | null> {
  const local = memory ?? (await readSnapshot());
  if (local && !memory) memory = local;
  const token = local ? catalogRevisionToken(local.revision) : '';
  const query = token ? `?rev=${encodeURIComponent(token)}` : '';

  let response: Response;
  try {
    response = await fetch(`/api/admin/catalog${query}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    return local;
  }
  if (!response.ok) return local;

  const body = (await response.json()) as {
    unchanged?: boolean;
    revision: CatalogRevision;
    songs?: LibrarySong[];
  };
  lastCheck = Date.now();

  if (body.unchanged) {
    ops = [];
    if (local && !memory) {
      memory = local;
      notify(local);
    }
    return memory ?? local;
  }

  if (!body.songs || !body.revision) return memory ?? local;

  const applied = applyServerCatalog(memory?.songs ?? local?.songs ?? [], body.songs, ops);
  ops = applied.ops;
  const revision = applied.ops.length ? revisionFromSongs(applied.songs) : body.revision;
  return persist(applied.songs, revision);
}

/**
 * Shows the embedded server list, or the IndexedDB copy when the revision
 * cookie already matched. Downloads the library only when that copy is missing
 * or older than the server.
 */
export async function hydrateAdminCatalog(input: {
  initialSongs: LibrarySong[] | null;
  revision: CatalogRevision | null;
}): Promise<CatalogSnapshot | null> {
  const { initialSongs, revision } = input;

  if (initialSongs && revision) {
    const applied = applyServerCatalog(memory?.songs ?? initialSongs, initialSongs, ops);
    ops = applied.ops;
    const rev = applied.ops.length ? revisionFromSongs(applied.songs) : revision;
    return persist(applied.songs, rev);
  }

  const local = memory ?? (await readSnapshot());
  if (local && revision && sameCatalogRevision(local.revision, revision)) {
    if (!memory) {
      memory = local;
      notify(local);
    }
    lastCheck = Date.now();
    return memory;
  }

  if (local && !memory) {
    memory = local;
    notify(local);
  }
  return revalidateCatalog(true);
}

function replaceSong(songs: LibrarySong[], song: LibrarySong): LibrarySong[] {
  const index = songs.findIndex((item) => item.id === song.id);
  if (index === -1) return [...songs, song];
  const next = songs.slice();
  next[index] = song;
  return next;
}

/** Keeps a saved song in the local library without waiting for another full download. */
export async function rememberCatalogSong(song: LibrarySong): Promise<void> {
  const current = memory ?? (await readSnapshot());
  if (!current) return;
  ops = ops.filter((op) => (op.kind === 'delete' ? op.id !== song.id : op.song.id !== song.id));
  ops.push({ kind: 'upsert', song });
  const songs = replaceSong(current.songs, song);
  await persist(songs, revisionFromSongs(songs));
  void revalidateCatalog(true);
}

/** Drops a deleted song from the local library. */
export async function forgetCatalogSong(id: string): Promise<void> {
  const current = memory ?? (await readSnapshot());
  if (!current) return;
  ops = ops.filter((op) => (op.kind === 'delete' ? op.id !== id : op.song.id !== id));
  ops.push({ kind: 'delete', id });
  const songs = current.songs.filter((song) => song.id !== id);
  await persist(songs, revisionFromSongs(songs));
  void revalidateCatalog(true);
}

if (typeof indexedDB !== 'undefined') {
  void readSnapshot().then((snapshot) => {
    if (!snapshot || memory) return;
    memory = snapshot;
    notify(snapshot);
  });
}
