'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DownloadIcon } from '@/components/icons';
import {
  downloadAllSongsToCache,
  isSongCacheDownloadRunning,
  type DownloadProgress,
} from '@/lib/song-cache';

type Phase = 'idle' | 'running' | 'done' | 'error';

type StartHandler = () => void;

let startHandler: StartHandler | null = null;

const PROGRESS_SLOT_ID = 'lyra-header-progress';

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
  const [progressSlot, setProgressSlot] = useState<HTMLElement | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setProgressSlot(document.getElementById(PROGRESS_SLOT_ID));
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
  const label = busy ? 'Baixando…' : 'Baixar';

  const title =
    phase === 'running'
      ? `Baixando músicas… ${progress.done} de ${progress.total}`
      : phase === 'done'
        ? 'Download concluído — letras e cifras disponíveis localmente'
        : phase === 'error'
          ? errorMessage ?? 'Falha no download.'
          : 'Baixar músicas para acesso rápido';

  const showProgress = phase === 'running' || phase === 'done' || phase === 'error';

  const progressBar =
    progressSlot && showProgress
      ? createPortal(
          <div
            className="offline-download-bar no-print"
            role="status"
            aria-live="polite"
            data-phase={phase}
          >
            {phase === 'running' ? (
              <>
                <div
                  className="offline-download-bar__track"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  role="progressbar"
                  aria-label={`Download ${progress.percent}%`}
                >
                  <div
                    className="offline-download-bar__fill"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="offline-download-bar__meta">
                  <span className="offline-download-bar__full">
                    Baixando {progress.done}/{progress.total}
                    <span className="offline-download-bar__sep"> — </span>
                    {progress.percent}%
                  </span>
                  <span className="offline-download-bar__compact">
                    {progress.done}/{progress.total} · {progress.percent}%
                  </span>
                  <span className="offline-download-bar__minimal">{progress.percent}%</span>
                </div>
              </>
            ) : phase === 'done' ? (
              <div className="offline-download-bar__meta offline-download-bar__meta--ok">
                <span className="offline-download-bar__full">Download concluído</span>
                <span className="offline-download-bar__compact">Concluído</span>
                <span className="offline-download-bar__minimal">OK</span>
              </div>
            ) : (
              <div className="offline-download-bar__meta offline-download-bar__meta--err">
                <span className="offline-download-bar__full">
                  {errorMessage ?? 'Falha no download.'}
                </span>
                <span className="offline-download-bar__compact">Erro</span>
                <span className="offline-download-bar__minimal">Erro</span>
              </div>
            )}
          </div>,
          progressSlot
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
        <DownloadIcon size={14} />
        <span className="header-ctrl__text">{label}</span>
      </button>
      {progressBar}
    </>
  );
}
