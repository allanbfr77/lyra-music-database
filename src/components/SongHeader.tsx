import Link from 'next/link';
import type { Song } from '@/lib/types';
import { normalizeKey } from '@/lib/chords';
import { parseYoutubeUrl } from '@/lib/youtube';
import { ExternalLinkIcon, YouTubeIcon } from '@/components/icons';

export default function SongHeader({ song }: { song: Song; currentKey?: string }) {
  const youtubeUrl = parseYoutubeUrl(song.youtube_url);
  const originalKey = normalizeKey(song.base_key);
  const extraChips = Boolean(song.capo > 0 || song.tempo_bpm || song.time_signature || song.source_url);

  return (
    <div className="song-head">
      <div className="song-head__row">
        <div className="song-head__text">
          <h1 className="song-head__title">{song.title}</h1>
          <p className="song-head__byline">
            <span>{song.artist || 'Artista não informado'}</span>
            <span className="song-head__dot" aria-hidden="true">
              •
            </span>
            <span>
              Tom original{' '}
              <strong className="song-head__key">{originalKey}</strong>
            </span>
          </p>
        </div>
        {youtubeUrl ? (
          <a
            className="icon-btn no-print"
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir vídeo no YouTube"
            title="Abrir vídeo no YouTube"
          >
            <YouTubeIcon size={18} />
          </a>
        ) : null}
      </div>
      {extraChips ? (
        <div className="song-head__meta">
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
      ) : null}
    </div>
  );
}
