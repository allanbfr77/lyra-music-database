/**
 * Pure catalog helpers shared by the server query and the browser cache.
 * No I/O here — safe to import from both sides.
 */

export const CATALOG_REV_COOKIE = 'lyra_catalog_rev';

export type CatalogRevision = {
  count: number;
  /** Exact `updated_at` of the newest song, as returned by Postgres. */
  maxUpdatedAt: string | null;
};

export type LibrarySong = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  available_keys: string[];
  has_chords: boolean;
  snippet: string | null;
  updated_at: string;
  rank: number;
  draft?: boolean;
  chords_reviewed?: boolean;
  lyrics_reviewed?: boolean;
  lyrics: string;
};

export type CatalogOp =
  | { kind: 'upsert'; song: LibrarySong }
  | { kind: 'delete'; id: string };

/** Same preview the admin list used when the catalog came straight from the query. */
export function lyricSnippet(lyrics: string | null | undefined): string | null {
  if (!lyrics) return null;
  return String(lyrics).replace(/\s+/g, ' ').slice(0, 160);
}

function fnv1a(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Cookie-safe fingerprint. Includes a hash of the raw timestamp so two writes
 * in the same millisecond still invalidate the cache.
 */
export function catalogRevisionToken(revision: CatalogRevision): string {
  const stamp = revision.maxUpdatedAt ?? '';
  const ms = stamp ? Date.parse(stamp) : 0;
  return `${revision.count}.${Number.isFinite(ms) ? ms : 0}.${fnv1a(stamp)}`;
}

export function sameCatalogRevision(a: CatalogRevision, b: CatalogRevision): boolean {
  return catalogRevisionToken(a) === catalogRevisionToken(b);
}

export function revisionFromSongs(songs: LibrarySong[]): CatalogRevision {
  let bestMs = Number.NEGATIVE_INFINITY;
  let best: string | null = null;
  for (const song of songs) {
    const ms = Date.parse(song.updated_at);
    if (Number.isFinite(ms) && ms >= bestMs) {
      bestMs = ms;
      best = song.updated_at;
    }
  }
  return { count: songs.length, maxUpdatedAt: songs.length ? best : null };
}

function songTime(song: LibrarySong): number {
  const ms = Date.parse(song.updated_at);
  return Number.isFinite(ms) ? ms : 0;
}

function opConfirmed(op: CatalogOp, serverSongs: LibrarySong[]): boolean {
  if (op.kind === 'delete') return !serverSongs.some((song) => song.id === op.id);
  const server = serverSongs.find((song) => song.id === op.song.id);
  return Boolean(server && songTime(server) >= songTime(op.song));
}

/**
 * Applies a server snapshot on top of what the browser already shows.
 * Local saves/deletes that the response does not reflect yet are kept.
 * A newer server row wins over an older local copy.
 * Unchanged songs keep their object identity so the list does not renormalize.
 */
export function applyServerCatalog(
  previous: LibrarySong[],
  serverSongs: LibrarySong[],
  ops: CatalogOp[]
): { songs: LibrarySong[]; ops: CatalogOp[] } {
  const pending = ops.filter((op) => !opConfirmed(op, serverSongs));
  const removed = new Set<string>();
  const upserts = new Map<string, LibrarySong>();
  for (const op of pending) {
    if (op.kind === 'delete') {
      removed.add(op.id);
      upserts.delete(op.id);
    } else {
      removed.delete(op.song.id);
      upserts.set(op.song.id, op.song);
    }
  }

  const prevById = new Map(previous.map((song) => [song.id, song]));
  const byId = new Map<string, LibrarySong>();
  for (const song of serverSongs) {
    if (removed.has(song.id)) continue;
    const local = upserts.get(song.id);
    if (local && songTime(local) > songTime(song)) {
      byId.set(song.id, local);
    } else {
      const prev = prevById.get(song.id);
      byId.set(song.id, prev && prev.updated_at === song.updated_at ? prev : song);
    }
    upserts.delete(song.id);
  }
  for (const [id, song] of upserts) {
    if (!removed.has(id)) byId.set(id, song);
  }

  const songs = [...byId.values()];
  const unchanged =
    songs.length === previous.length && songs.every((song, index) => song === previous[index]);
  return { songs: unchanged ? previous : songs, ops: pending };
}
