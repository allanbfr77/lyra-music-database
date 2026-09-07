'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, DownloadIcon } from '@/components/icons';
import {
  downloadAllSongsToCache,
  isSongCacheDownloadRunning,
  type DownloadProgress,
} from '@/lib/song-cache';

type Phase = 'idle' | 'running' | 'done' | 'error';

type StartHandler = () => void;

let startHandler: StartHandler | null = null;

/** Dispara o mesmo download do botão do header (ex.: item do menu mobile). */
export function requestOfflineSongsDownload() {
  if (isSongCacheDownloadRunning()) return false;
  if (!startHandler) return false;
  startHandler();
  return true;
}

export default function OfflineSongsDownload() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({
    done: 0,
    total: 0,
    percent: 0,
    currentSlug: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, []);

  const startDownload = useCallback(async () => {
    if (phase === 'running' || isSongCacheDownloadRunning()) return;

    setPhase('running');
    setErrorMessage(null);
    setProgress({ done: 0, total: 0, percent: 0, currentSlug: null });

    try {
      await downloadAllSongsToCache((next) => setProgress(next));
      setPhase('done');
      if (doneTimer.current) clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => setPhase('idle'), 4000);
    } catch (error) {
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível baixar as músicas.');
    }
  }, [phase]);

  useEffect(() => {
    startHandler = () => {
      void startDownload();
    };
    return () => {
      startHandler = null;
    };
  }, [startDownload]);

  const busy = phase === 'running';
  const label =
    phase === 'running'
      ? 'Baixando…'
      : phase === 'done'
        ? 'Concluído'
        : phase === 'error'
          ? 'Erro'
          : 'Baixar';

  const title =
    phase === 'running'
      ? `Baixando músicas… ${progress.done} de ${progress.total}`
      : phase === 'done'
        ? 'Download concluído — letras e cifras disponíveis localmente'
        : 'Baixar músicas para acesso rápido';

  const progressBar =
    mounted && (phase === 'running' || phase === 'done' || phase === 'error')
      ? createPortal(
          <div
            className="offline-download-bar no-print"
            role="status"
            aria-live="polite"
            data-phase={phase}
          >
            <div className="offline-download-bar__inner">
              {phase === 'running' ? (
                <>
                  <div className="offline-download-bar__label">
                    Baixando dados: {progress.done} de {progress.total} músicas — {progress.percent}%
                  </div>
                  <div
                    className="offline-download-bar__track"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.percent}
                    role="progressbar"
                  >
                    <div
                      className="offline-download-bar__fill"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </>
              ) : phase === 'done' ? (
                <div className="offline-download-bar__label offline-download-bar__label--ok">
                  Download concluído — letras e cifras prontas para abertura rápida
                </div>
              ) : (
                <div className="offline-download-bar__label offline-download-bar__label--err">
                  {errorMessage ?? 'Falha no download.'}
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="header-ctrl header-ctrl--download"
        onClick={() => void startDownload()}
        disabled={busy}
        title={title}
        aria-label={title}
        aria-busy={busy}
        data-phase={phase}
      >
        {phase === 'done' ? <CheckIcon size={14} /> : <DownloadIcon size={14} />}
        <span className="header-ctrl__text">{label}</span>
      </button>
      {progressBar}
    </>
  );
}
