'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/lib/types';
import { normalizeKey } from '@/lib/chords';
import { parseYoutubeUrl, youtubeEmbedUrl, youtubeVideoId } from '@/lib/youtube';
import { CloseIcon, ExternalLinkIcon, YouTubeIcon } from '@/components/icons';
import { useVoiceSync } from '@/components/VoiceSyncProvider';

type YtPlayer = {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type YtNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      events?: {
        onReady?: (event: { target: YtPlayer }) => void;
        onStateChange?: (event: { data: number; target: YtPlayer }) => void;
      };
    }
  ) => YtPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YtNamespace> | null = null;

function loadYoutubeIframeApi(): Promise<YtNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[data-lyra-youtube-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.lyraYoutubeApi = '1';
      document.head.appendChild(script);
    }
    if (window.YT?.Player) resolve(window.YT);
  });

  return ytApiPromise;
}

export default function SongHeader({ song }: { song: Song; currentKey?: string }) {
  const youtubeUrl = parseYoutubeUrl(song.youtube_url);
  const videoId = youtubeVideoId(song.youtube_url);
  const [origin, setOrigin] = useState('');
  const embedUrl = youtubeEmbedUrl(song.youtube_url, origin || undefined);
  const originalKey = normalizeKey(song.base_key);
  const extraChips = Boolean(song.capo > 0 || song.tempo_bpm || song.time_signature || song.source_url);
  const [showPlayer, setShowPlayer] = useState(false);
  const iframeId = useId().replace(/:/g, '');
  const playerRef = useRef<YtPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const {
    enabled: voiceSyncEnabled,
    onYoutubePlayerOpen,
    onYoutubePlayerClose,
    onYoutubePlaying,
    onYoutubeTime,
  } = useVoiceSync();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setShowPlayer(false);
    onYoutubePlayerClose();
  }, [song.id, onYoutubePlayerClose]);

  useEffect(() => {
    if (!showPlayer || !videoId || !embedUrl) return;

    let cancelled = false;

    const stopPoll = () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPoll = (player: YtPlayer) => {
      stopPoll();
      pollRef.current = window.setInterval(() => {
        try {
          if (player.getPlayerState() !== 1) return;
          onYoutubeTime(player.getCurrentTime());
        } catch {
          /* player destruído */
        }
      }, 250);
    };

    (async () => {
      try {
        const YT = await loadYoutubeIframeApi();
        if (cancelled) return;

        playerRef.current?.destroy();
        playerRef.current = new YT.Player(`lyra-yt-${iframeId}`, {
          events: {
            onReady: (event) => {
              if (cancelled) return;
              try {
                if (event.target.getPlayerState() === YT.PlayerState.PLAYING) {
                  onYoutubePlaying();
                  startPoll(event.target);
                }
              } catch {
                /* ignora */
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === YT.PlayerState.PLAYING) {
                onYoutubePlaying();
                startPoll(event.target);
                return;
              }
              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.ENDED ||
                event.data === YT.PlayerState.CUED
              ) {
                stopPoll();
              }
            },
          },
        });
      } catch {
        /* API indisponível */
      }
    })();

    return () => {
      cancelled = true;
      stopPoll();
      try {
        playerRef.current?.destroy();
      } catch {
        /* já destruído */
      }
      playerRef.current = null;
    };
  }, [showPlayer, videoId, embedUrl, iframeId, onYoutubePlaying, onYoutubeTime]);

  // Se o VOZ for ligado com o vídeo já tocando, retoma o acompanhamento.
  useEffect(() => {
    if (!voiceSyncEnabled || !showPlayer) return;
    const player = playerRef.current;
    if (!player) return;
    try {
      if (player.getPlayerState() === 1) {
        onYoutubePlaying();
        onYoutubeTime(player.getCurrentTime());
      }
    } catch {
      /* ignora */
    }
  }, [voiceSyncEnabled, showPlayer, onYoutubePlaying, onYoutubeTime]);

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
        {youtubeUrl && embedUrl && videoId ? (
          <button
            type="button"
            className="icon-btn no-print"
            data-active={showPlayer ? 'true' : undefined}
            aria-pressed={showPlayer}
            aria-label={showPlayer ? 'Fechar vídeo do YouTube' : 'Reproduzir vídeo do YouTube'}
            title={showPlayer ? 'Fechar vídeo do YouTube' : 'Reproduzir vídeo do YouTube'}
            onClick={() => {
              if (showPlayer) {
                setShowPlayer(false);
                onYoutubePlayerClose();
              } else {
                setShowPlayer(true);
                onYoutubePlayerOpen(videoId);
              }
            }}
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
              onClick={() => {
                setShowPlayer(false);
                onYoutubePlayerClose();
              }}
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="song-youtube__frame">
            <iframe
              id={`lyra-yt-${iframeId}`}
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
