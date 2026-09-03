import Link from 'next/link';
import type { Song } from '@/lib/types';
import { normalizeKey } from '@/lib/chords';

export default function SongHeader({ song, currentKey }: { song: Song; currentKey?: string }) {
  return (
    <div className="song-head">
      <h1 className="song-head__title">{song.title}</h1>
      <div className="song-head__artist">{song.artist || 'Artista não informado'}</div>
      <div className="song-head__meta">
        <span className="chip">Tom original {normalizeKey(song.base_key)}</span>
        {currentKey && normalizeKey(currentKey) !== normalizeKey(song.base_key) ? (
          <span className="chip">Você está em {normalizeKey(currentKey)}</span>
        ) : null}
        {song.capo > 0 ? <span className="chip">Capotraste {song.capo}ª casa</span> : null}
        {song.tempo_bpm ? <span className="chip">{song.tempo_bpm} BPM</span> : null}
        {song.time_signature ? <span className="chip">{song.time_signature}</span> : null}
        {song.source_url ? (
          <Link className="chip" href={song.source_url} target="_blank" rel="noreferrer noopener">
            Fonte ↗
          </Link>
        ) : null}
      </div>
    </div>
  );
}
