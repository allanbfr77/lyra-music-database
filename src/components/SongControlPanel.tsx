'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CheckIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  WrapTextIcon,
} from '@/components/icons';

const SIZE_KEY = 'lyra:font-size';
const SIZE_PERCENT_KEY = 'lyra:font-size-percent';
const WRAP_KEY = 'lyra:wrap';

const BASE_PX = 15;
const MIN_PERCENT = 70;
const MAX_PERCENT = 150;
const STEP = 10;
const DEFAULT_PERCENT = 100;

type ReaderSettings = {
  sizePx: number;
  wrap: boolean;
};

const ReaderSettingsContext = createContext<ReaderSettings>({
  sizePx: BASE_PX,
  wrap: false,
});

export function useReaderSettings() {
  return useContext(ReaderSettingsContext);
}

function snapPercent(value: number) {
  const snapped = Math.round(value / STEP) * STEP;
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, snapped));
}

function readStoredPercent() {
  if (typeof window === 'undefined') return DEFAULT_PERCENT;
  try {
    const storedPercent = Number(localStorage.getItem(SIZE_PERCENT_KEY));
    if (storedPercent >= MIN_PERCENT && storedPercent <= MAX_PERCENT) {
      return snapPercent(storedPercent);
    }
    const storedPx = Number(localStorage.getItem(SIZE_KEY));
    if (storedPx >= 12 && storedPx <= 30) {
      return snapPercent((storedPx / BASE_PX) * 100);
    }
  } catch {
    /* armazenamento indisponível */
  }
  return DEFAULT_PERCENT;
}

function readStoredWrap() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(WRAP_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SongControlPanel({
  tabs,
  keyControl,
  shareTitle,
  showWrap = false,
  children,
}: {
  tabs: ReactNode;
  keyControl?: ReactNode;
  shareTitle: string;
  showWrap?: boolean;
  children: ReactNode;
}) {
  const [percent, setPercent] = useState(DEFAULT_PERCENT);
  const [wrap, setWrap] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const raf = useRef<number | null>(null);
  const carry = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    setPercent(readStoredPercent());
    setWrap(readStoredWrap());
  }, []);

  const persist = useCallback((nextPercent: number, nextWrap: boolean) => {
    try {
      localStorage.setItem(SIZE_PERCENT_KEY, String(nextPercent));
      localStorage.setItem(WRAP_KEY, nextWrap ? '1' : '0');
    } catch {
      /* ignora */
    }
  }, []);

  const changeSize = (delta: number) => {
    setPercent((prev) => {
      const next = snapPercent(prev + delta);
      persist(next, wrap);
      return next;
    });
  };

  const toggleWrap = () => {
    setWrap((prev) => {
      persist(percent, !prev);
      return !prev;
    });
  };

  useEffect(() => {
    if (speed === 0) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
      return;
    }

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<never> } };
    nav.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLock.current = lock as unknown as { release: () => Promise<void> };
      })
      .catch(() => {});

    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      carry.current += (speed * 14 * dt) / 1000;
      const px = Math.floor(carry.current);
      if (px > 0) {
        carry.current -= px;
        window.scrollBy(0, px);
        const atEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
        if (atEnd) {
          setSpeed(0);
          return;
        }
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [speed]);

  const share = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: shareTitle, url });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignora */
    }
  };

  const sizePx = (BASE_PX * percent) / 100;
  const playing = speed > 0;

  return (
    <ReaderSettingsContext.Provider value={{ sizePx, wrap }}>
      <div className="control-panel no-print">
        <div className="control-panel__row control-panel__row--a">
          {tabs}
          <div className="control-panel__actions">
            <button
              type="button"
              className="play-btn"
              onClick={() => setSpeed((s) => (s > 0 ? 0 : 2))}
              aria-label={playing ? 'Parar rolagem automática' : 'Rolar automaticamente'}
              aria-pressed={playing}
              title="Rolagem automática"
            >
              {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
            {playing && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSpeed((s) => Math.max(1, s - 1))}
                  aria-label="Rolar mais devagar"
                  title="Mais devagar"
                >
                  <MinusIcon size={16} />
                </button>
                <span className="small muted" style={{ minWidth: 18, textAlign: 'center' }}>
                  {speed}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSpeed((s) => Math.min(6, s + 1))}
                  aria-label="Rolar mais rápido"
                  title="Mais rápido"
                >
                  <PlusIcon size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={share}
              aria-label={copied ? 'Link copiado' : 'Compartilhar link'}
              title={copied ? 'Link copiado' : 'Compartilhar link'}
            >
              {copied ? <CheckIcon size={17} /> : <ShareIcon size={17} />}
            </button>
          </div>
        </div>

        <div className="control-panel__row control-panel__row--b">
          {keyControl}
          <div className="control-block control-block--size">
            {showWrap ? (
              <button
                type="button"
                className="icon-btn"
                data-active={wrap ? 'true' : 'false'}
                onClick={toggleWrap}
                aria-label="Quebrar linhas longas"
                aria-pressed={wrap}
                title="Quebrar linhas longas"
              >
                <WrapTextIcon size={18} />
              </button>
            ) : null}
            <span className="control-label">Tamanho</span>
            <div className="size-control">
              <button
                type="button"
                className="size-btn"
                onClick={() => changeSize(-STEP)}
                disabled={percent <= MIN_PERCENT}
                aria-label={`Diminuir a letra (${percent}%)`}
                title="Diminuir a letra"
              >
                A−
              </button>
              <span className="toolbar__size" aria-live="polite">
                {percent}%
              </span>
              <button
                type="button"
                className="size-btn"
                onClick={() => changeSize(STEP)}
                disabled={percent >= MAX_PERCENT}
                aria-label={`Aumentar a letra (${percent}%)`}
                title="Aumentar a letra"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </ReaderSettingsContext.Provider>
  );
}
