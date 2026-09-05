import Link from 'next/link';
import type { SearchHit } from '@/lib/types';
import { keyToSlug, normalizeKey } from '@/lib/chords';
import { ChevronRightIcon } from '@/components/icons';

export type CatalogSong = SearchHit & {
  href?: string;
  draft?: boolean;
};

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

/** Primeira letra do título, sem acento, só para o grupo. */
function groupLetter(title: string) {
  const folded = foldTitle(title);
  const letter = folded.charAt(0).toUpperCase();
  return letter >= 'A' && letter <= 'Z' ? letter : '#';
}

function groupSongs(songs: CatalogSong[]) {
  const sorted = [...songs].sort((a, b) =>
    foldTitle(a.title).localeCompare(foldTitle(b.title), 'pt-BR')
  );
  const groups: { letter: string; songs: SearchHit[] }[] = [];
  for (const song of sorted) {
    const letter = groupLetter(song.title);
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
  const key = normalizeKey(song.base_key);
  return song.has_chords ? `/musica/${song.slug}/cifra/${keyToSlug(key)}` : `/musica/${song.slug}`;
}

function SongRow({ song, showSnippet }: { song: CatalogSong; showSnippet: boolean }) {
  const key = normalizeKey(song.base_key);
  return (
    <li className="song-item">
      <Link href={songHref(song)} className="song-item__link">
        <div className="song-item__body">
          <div className="song-item__title">
            {song.title}
            {song.draft ? <span className="chip song-item__draft">rascunho</span> : null}
          </div>
          <div className="song-item__artist">{song.artist || 'Sem artista'}</div>
          {showSnippet && song.snippet ? (
            <div className="song-item__snippet" dangerouslySetInnerHTML={{ __html: highlight(song.snippet) }} />
          ) : null}
        </div>
        {song.has_chords ? <span className="song-item__key">{key}</span> : null}
        <span className="song-item__chevron">
          <ChevronRightIcon size={16} />
        </span>
      </Link>
    </li>
  );
}

export default function SongList({ songs, showSnippet = false }: { songs: CatalogSong[]; showSnippet?: boolean }) {
  const groups = groupSongs(songs);

  return (
    <div className="song-groups">
      {groups.map((group) => (
        <section key={group.letter} aria-label={`Músicas com a letra ${group.letter}`}>
          <div className="letter-head">
            <span className="letter-head__label">{group.letter}</span>
          </div>
          <ul className="song-list song-list--grouped">
            {group.songs.map((song) => (
              <SongRow key={song.id} song={song} showSnippet={showSnippet} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
