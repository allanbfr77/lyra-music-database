'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseChart, type ChartLine } from '@/lib/chords';
import {
  CheckIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  TextLargerIcon,
  TextSmallerIcon,
  WrapTextIcon,
} from '@/components/icons';

const SIZE_KEY = 'lyra:font-size';
const WRAP_KEY = 'lyra:wrap';
const MIN = 12;
const MAX = 30;
const DEFAULT_SIZE = 15;

type Props = {
  mode: 'chords' | 'lyrics';
  text: string;
  shareTitle: string;
};

function readStoredSize(fallback: number) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = Number(localStorage.getItem(SIZE_KEY));
    if (stored >= MIN && stored <= MAX) return stored;
  } catch {
    /* armazenamento indisponível */
  }
  return fallback;
}

function readStoredWrap() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(WRAP_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Reader({ mode, text, shareTitle }: Props) {
  const [size, setSize] = useState(() => readStoredSize(DEFAULT_SIZE));
  const [wrap, setWrap] = useState(readStoredWrap);
  const [speed, setSpeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const raf = useRef<number | null>(null);
  const carry = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    try {
      const s = Number(localStorage.getItem(SIZE_KEY));
      if (s >= MIN && s <= MAX) setSize(s);
      setWrap(localStorage.getItem(WRAP_KEY) === '1');
    } catch {
      /* armazenamento indisponível — segue com o padrão */
    }
  }, []);

  const persist = useCallback((nextSize: number, nextWrap: boolean) => {
    try {
      localStorage.setItem(SIZE_KEY, String(nextSize));
      localStorage.setItem(WRAP_KEY, nextWrap ? '1' : '0');
    } catch {
      /* ignora */
    }
  }, []);

  const changeSize = (delta: number) => {
    setSize((prev) => {
      const next = Math.min(MAX, Math.max(MIN, prev + delta));
      persist(next, wrap);
      return next;
    });
  };

  const toggleWrap = () => {
    setWrap((prev) => {
      persist(size, !prev);
      return !prev;
    });
  };

  // Rolagem automática — pensada para tocar lendo do celular.
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

  const lines = useMemo<ChartLine[]>(() => (mode === 'chords' ? parseChart(text) : []), [mode, text]);
  const sizePercent = Math.round((size / DEFAULT_SIZE) * 100);

  return (
    <>
      <div className="toolbar no-print">
        <div className="toolbar__group">
          <button
            className="icon-btn"
            onClick={() => changeSize(-1)}
            disabled={size <= MIN}
            aria-label={`Diminuir a letra (${sizePercent}%)`}
            title="Diminuir a letra"
          >
            <TextSmallerIcon size={18} />
          </button>
          <span className="toolbar__size" aria-live="polite">
            {sizePercent}%
          </span>
          <button
            className="icon-btn"
            onClick={() => changeSize(1)}
            disabled={size >= MAX}
            aria-label={`Aumentar a letra (${sizePercent}%)`}
            title="Aumentar a letra"
          >
            <TextLargerIcon size={18} />
          </button>
        </div>

        {mode === 'chords' && (
          <button
            className="icon-btn"
            data-active={wrap ? 'true' : 'false'}
            onClick={toggleWrap}
            aria-label="Quebrar linhas longas"
            title="Quebrar linhas longas"
          >
            <WrapTextIcon size={18} />
          </button>
        )}

        <div className="toolbar__spacer" />

        <div className="toolbar__group">
          <button
            className="icon-btn"
            data-active={speed > 0 ? 'true' : 'false'}
            onClick={() => setSpeed((s) => (s > 0 ? 0 : 2))}
            aria-label={speed > 0 ? 'Parar rolagem automática' : 'Rolar automaticamente'}
            title="Rolagem automática"
          >
            {speed > 0 ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
          </button>
          {speed > 0 && (
            <>
              <button
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
            className="icon-btn"
            onClick={share}
            aria-label={copied ? 'Link copiado' : 'Compartilhar link'}
            title={copied ? 'Link copiado' : 'Compartilhar link'}
          >
            {copied ? <CheckIcon size={17} /> : <ShareIcon size={17} />}
          </button>
        </div>
      </div>

      {mode === 'chords' ? (
        <div className={`sheet${wrap ? ' sheet--wrap' : ''}`} style={{ ['--sheet-size' as string]: `${size}px` }}>
          {lines.map((line, i) => (
            <SheetLine key={i} line={line} />
          ))}
        </div>
      ) : (
        <div className="lyrics" style={{ ['--sheet-size' as string]: `${size}px` }}>
          {text}
        </div>
      )}
    </>
  );
}

function SheetLine({ line }: { line: ChartLine }) {
  if (line.type === 'blank') return <div className="sheet__line">{' '}</div>;
  if (line.type === 'section') return <div className="sheet__line sheet__section">{line.text}</div>;
  if (line.type === 'lyric') return <div className="sheet__line">{line.text}</div>;

  const parts: React.ReactNode[] = [];
  let col = 0;
  line.tokens.forEach((token, i) => {
    if (token.col > col) parts.push(line.text.slice(col, token.col));
    parts.push(
      token.isChord ? (
        <span key={i} className="sheet__chord">
          {token.text}
        </span>
      ) : (
        token.text
      )
    );
    col = token.col + token.text.length;
  });
  parts.push(line.text.slice(col));

  return <div className="sheet__line">{parts}</div>;
}
