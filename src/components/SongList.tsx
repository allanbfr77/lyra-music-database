import Link from 'next/link';
import type { SearchHit } from '@/lib/types';
import { keyToSlug, normalizeKey } from '@/lib/chords';

/** O Postgres marca os trechos com [[ ]]; escapamos tudo e só então viram <mark>. */
function highlight(snippet: string): string {
  return snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[\[/g, '<mark>')
    .replace(/\]\]/g, '</mark>');
}

export default function SongList({ songs, showSnippet = false }: { songs: SearchHit[]; showSnippet?: boolean }) {
  return (
    <ul className="song-list">
      {songs.map((song) => {
        const key = normalizeKey(song.base_key);
        const href = song.has_chords ? `/musica/${song.slug}/cifra/${keyToSlug(key)}` : `/musica/${song.slug}`;
        return (
          <li key={song.id} className="song-item">
            <Link href={href} className="song-item__link">
              <div className="song-item__body">
                <div className="song-item__title">{song.title}</div>
                <div className="song-item__artist">{song.artist || 'Sem artista'}</div>
                {showSnippet && song.snippet ? (
                  <div className="song-item__snippet" dangerouslySetInnerHTML={{ __html: highlight(song.snippet) }} />
                ) : null}
              </div>
              {song.has_chords ? <span className="song-item__key">{key}</span> : null}
              <span className="song-item__chevron" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
