import Link from 'next/link';
import type { Song } from '@/lib/types';
import { normalizeKey } from '@/lib/chords';
import { parseYoutubeUrl } from '@/lib/youtube';
import { ExternalLinkIcon, YouTubeIcon } from '@/components/icons';

export default function SongHeader({ song, currentKey }: { song: Song; currentKey?: string }) {
  const youtubeUrl = parseYoutubeUrl(song.youtube_url);

  return (
    <div className="song-head">
      <div className="song-head__row">
        <div className="song-head__text">
          <h1 className="song-head__title">{song.title}</h1>
          <div className="song-head__artist">{song.artist || 'Artista não informado'}</div>
        </div>
        {youtubeUrl ? (
          <a
            className="yt-link no-print"
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir vídeo no YouTube"
            title="Abrir vídeo no YouTube"
          >
            <YouTubeIcon size={32} />
          </a>
        ) : null}
      </div>
      <div className="song-head__meta">
        <span className="chip">Tom original {normalizeKey(song.base_key)}</span>
        {currentKey && normalizeKey(currentKey) !== normalizeKey(song.base_key) ? (
          <span className="chip">Você está em {normalizeKey(currentKey)}</span>
        ) : null}
        {song.capo > 0 ? <span className="chip">Capotraste {song.capo}ª casa</span> : null}
        {song.tempo_bpm ? <span className="chip">{song.tempo_bpm} BPM</span> : null}
        {song.time_signature ? <span className="chip">{song.time_signature}</span> : null}
        {song.source_url ? (
          <Link className="chip chip--link" href={song.source_url} target="_blank" rel="noreferrer noopener">
            Fonte
            <ExternalLinkIcon size={13} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
