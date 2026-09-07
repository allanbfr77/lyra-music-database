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
      <nav className="song-crumb" aria-label="Navegação">
        <Link href="/">músicas</Link>
        <span className="song-crumb__sep" aria-hidden="true">
          /
        </span>
        <span className="song-crumb__current">{song.slug}</span>
      </nav>

      <div className="song-head__row">
        <div className="song-head__text">
          <h1 className="song-head__title">{song.title}</h1>
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

      <div className="song-meta">
        <div className="song-meta__field">
          <span className="song-meta__k">ARTISTA</span>
          <span className="song-meta__v">{song.artist || 'Artista não informado'}</span>
        </div>
        <div className="song-meta__field">
          <span className="song-meta__k">TOM ORIGINAL</span>
          <span className="song-meta__v song-meta__v--key">{originalKey}</span>
        </div>
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
