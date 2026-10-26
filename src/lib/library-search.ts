import { foldAccents } from '@/lib/text-fold';
import { parseFieldIds } from '@/lib/search-fields';

export type LibraryFields = {
  title: string;
  artist: string;
  lyrics?: string | null;
};

export type PreparedSong<T> = {
  song: T;
  title: string;
  artist: string;
  lyrics: string;
};

function normalize(value: string) {
  return foldAccents(value).toLocaleLowerCase('pt-BR');
}

const foldedCache = new WeakMap<object, { title: string; artist: string; lyrics: string }>();

/** Folds title, artist and lyrics once, so each keystroke is only a substring check. */
export function prepareLibrary<T extends LibraryFields>(songs: T[]): PreparedSong<T>[] {
  return songs.map((song) => {
    let folded = foldedCache.get(song);
    if (!folded) {
      folded = {
        title: normalize(song.title),
        artist: normalize(song.artist),
        lyrics: normalize(song.lyrics ?? ''),
      };
      foldedCache.set(song, folded);
    }
    return { song, title: folded.title, artist: folded.artist, lyrics: folded.lyrics };
  });
}

/** Accent-insensitive substring match on the selected catalog fields. */
export function filterLibrary<T>(rows: PreparedSong<T>[], query: string, fieldIds: string): T[] {
  const needle = normalize(query.trim());
  if (!needle) return rows.map((row) => row.song);
  const ids = parseFieldIds(fieldIds);
  const title = ids.includes('m');
  const artist = ids.includes('a');
  const lyrics = ids.includes('l');
  const matches: T[] = [];
  for (const row of rows) {
    if (title && row.title.includes(needle)) matches.push(row.song);
    else if (artist && row.artist.includes(needle)) matches.push(row.song);
    else if (lyrics && row.lyrics.includes(needle)) matches.push(row.song);
  }
  return matches;
}
