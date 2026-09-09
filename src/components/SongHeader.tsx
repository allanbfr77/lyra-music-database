'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/lib/types';
import { normalizeKey } from '@/lib/chords';
import { parseYoutubeUrl, youtubeEmbedUrl } from '@/lib/youtube';
import { CloseIcon, ExternalLinkIcon, YouTubeIcon } from '@/components/icons';

export default function SongHeader({ song }: { song: Song; currentKey?: string }) {
  const youtubeUrl = parseYoutubeUrl(song.youtube_url);
  const embedUrl = youtubeEmbedUrl(song.youtube_url);
  const originalKey = normalizeKey(song.base_key);
  const extraChips = Boolean(song.capo > 0 || song.tempo_bpm || song.time_signature || song.source_url);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    setShowPlayer(false);
  }, [song.id]);

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
        {youtubeUrl && embedUrl ? (
          <button
            type="button"
            className="icon-btn no-print"
            data-active={showPlayer ? 'true' : undefined}
            aria-pressed={showPlayer}
            aria-label={showPlayer ? 'Fechar vídeo do YouTube' : 'Reproduzir vídeo do YouTube'}
            title={showPlayer ? 'Fechar vídeo do YouTube' : 'Reproduzir vídeo do YouTube'}
            onClick={() => setShowPlayer((open) => !open)}
          >
            <YouTubeIcon size={18} />
          </button>
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

      {showPlayer && embedUrl ? (
        <div className="song-youtube no-print">
          <div className="song-youtube__toolbar">
            <button
              type="button"
              className="icon-btn"
              aria-label="Fechar vídeo do YouTube"
              title="Fechar vídeo"
              onClick={() => setShowPlayer(false)}
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="song-youtube__frame">
            <iframe
              src={embedUrl}
              title={`YouTube — ${song.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
