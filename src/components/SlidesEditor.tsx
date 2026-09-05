'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  importSlideLyrics,
  publishCustomSlidesToLyra,
  publishSongSlidesToLyra,
  restoreOriginalSlideLyrics,
  saveSongSlides,
} from '@/app/slides/actions';
import { AlertTriangleIcon, CheckIcon } from '@/components/icons';
import { hasAlternateSlideSource, lyricsToSlides, resolveSlideBlocks } from '@/lib/slides';

function sameSlides(left: string[] | null | undefined, right: string[]) {
  return Boolean(left) && JSON.stringify(left) === JSON.stringify(right);
}

export default function SlidesEditor({
  songId,
  savedSlides,
  lyricsSeed,
  sourceLyrics = null,
  showSourceControls = true,
  onPersist,
  emptyHint,
  publishKind = 'song',
  editionTitle = '',
  publishedSlides = null,
  publishedAt = null,
}: {
  songId: string;
  savedSlides: string[] | null;
  lyricsSeed: string;
  sourceLyrics?: string | null;
  showSourceControls?: boolean;
  onPersist?: (slides: string[]) => void | Promise<void>;
  emptyHint?: string;
  publishKind?: 'song' | 'custom';
  editionTitle?: string;
  publishedSlides?: string[] | null;
  publishedAt?: string | null;
}) {
  const [slides, setSlides] = useState(() => resolveSlideBlocks(savedSlides, lyricsSeed));
  const [alternateSource, setAlternateSource] = useState(sourceLyrics);
  const [sentSlides, setSentSlides] = useState(publishedSlides);
  const [sentAt, setSentAt] = useState(publishedAt);
  const [publishState, setPublishState] = useState<'idle' | 'sending'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPersist = useRef(false);
  const justRestored = useRef(false);
  const usingAlternate = hasAlternateSlideSource(alternateSource);

  useEffect(() => {
    justRestored.current = false;
  }, [songId]);

  useEffect(() => {
    if (justRestored.current) {
      if (hasAlternateSlideSource(sourceLyrics)) return;
      justRestored.current = false;
    }
    setSlides(resolveSlideBlocks(savedSlides, lyricsSeed));
    setAlternateSource(sourceLyrics);
    setSentSlides(publishedSlides);
    setSentAt(publishedAt);
  }, [songId, savedSlides, lyricsSeed, sourceLyrics, publishedSlides, publishedAt]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  function persist(next: string[]) {
    if (!songId || skipPersist.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      if (onPersist) {
        onPersist(next);
        return;
      }
      void saveSongSlides(songId, next);
    }, 700);
  }

  function updateSlide(index: number, value: string) {
    setSlides((prev) => {
      const next = prev.map((slide, i) => (i === index ? value : slide));
      persist(next);
      return next;
    });
  }

  async function flushPersist(next: string[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    if (onPersist) {
      await onPersist(next);
      return;
    }
    await saveSongSlides(songId, next);
  }

  async function sendToLyra() {
    if (publishState === 'sending') return;
    setPublishError(null);
    setPublishState('sending');
    await flushPersist(slides);

    const result =
      publishKind === 'custom'
        ? await publishCustomSlidesToLyra({
            id: songId,
            title: editionTitle,
            sourceLyrics: alternateSource ?? lyricsSeed,
            slides,
          })
        : await publishSongSlidesToLyra(songId, slides);

    setPublishState('idle');
    if (!result.ok) {
      setPublishError(result.error);
      return;
    }
    setSentSlides(result.publishedSlides ?? slides);
    setSentAt(result.publishedAt ?? new Date().toISOString());
  }

  function applyImported(next: string[], source: string) {
    setRestoreError(null);
    setSlides(next);
    setAlternateSource(source);
    setImporterOpen(false);
  }

  async function restoreOriginal() {
    if (
      !window.confirm(
        'Restaurar a letra original nos slides? A versão alternativa desta conta será removida. A letra cadastrada da música não muda.'
      )
    ) {
      return;
    }

    if (persistTimer.current) clearTimeout(persistTimer.current);
    skipPersist.current = true;
    setRestoreError(null);

    const result = await restoreOriginalSlideLyrics(songId);
    if (!result.ok) {
      skipPersist.current = false;
      setRestoreError(result.error);
      return;
    }

    justRestored.current = true;
    setAlternateSource(null);
    setSlides(result.slides ?? lyricsToSlides(lyricsSeed));
    skipPersist.current = false;
  }

  return (
    <div className="slides-workspace">
      {showSourceControls ? (
      <div className={`slides-source no-print${usingAlternate ? ' slides-source--alt' : ''}`}>
        {usingAlternate ? (
          <>
            <div className="slides-source__main">
              <AlertTriangleIcon size={18} className="slides-source__icon" />
              <div className="slides-source__copy">
                <p className="slides-source__context">
                  Estes slides usam uma <strong>versão alternativa</strong> da letra. A letra original da música
                  não muda.
                </p>
                <p className="slides-source__prompt">
                  <button type="button" className="slides-source__link" onClick={() => setImporterOpen(true)}>
                    Clique aqui
                  </button>{' '}
                  para colar outra versão.
                </p>
              </div>
            </div>
            <div className="slides-source__actions">
              <button type="button" className="slides-source__restore" onClick={() => void restoreOriginal()}>
                Restaurar versão original
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Esta letra foi importada da versão original.</p>
            <p>
              <button type="button" className="slides-source__link" onClick={() => setImporterOpen(true)}>
                Clique aqui
              </button>{' '}
              para adicionar uma versão diferente.
            </p>
          </>
        )}
        {restoreError ? <p className="slides-source__error">{restoreError}</p> : null}
      </div>
      ) : null}

      <div className="slides-publish no-print">
        <button
          type="button"
          className={`slides-publish__btn${sameSlides(sentSlides, slides) ? ' slides-publish__btn--sent' : ''}`}
          disabled={publishState === 'sending' || slides.every((slide) => !slide.trim())}
          title={sentAt && sameSlides(sentSlides, slides) ? `Enviado em ${sentAt}` : undefined}
          onClick={() => void sendToLyra()}
        >
          {publishState === 'sending' ? (
            'Enviando...'
          ) : sameSlides(sentSlides, slides) ? (
            <>
              <CheckIcon size={16} /> Enviado para o programa
            </>
          ) : (
            'Enviar para o programa'
          )}
        </button>
        <span className="slides-publish__hint">
          {sameSlides(sentSlides, slides)
            ? 'O Lyra já pode importar esta versão. Continuar editando não atualiza o programa até enviar de novo.'
            : 'Salvo automaticamente nesta conta. Só vai para o Lyra quando você enviar.'}
        </span>
        {publishError ? <p className="slides-source__error">{publishError}</p> : null}
      </div>

      {slides.length === 0 ? (
        <div className="empty slides-empty">
          <strong>Nenhum slide para exibir</strong>
          <span className="small">
            {emptyHint ??
              'Cadastre a letra desta música. Cada estrofe separada por uma linha em branco vira um slide.'}
          </span>
        </div>
      ) : (
        <div className="slides-board">
          {slides.map((text, index) => (
            <SlideCard key={index} index={index} text={text} onChange={(value) => updateSlide(index, value)} />
          ))}
        </div>
      )}

      {showSourceControls && importerOpen ? (
        <SlideLyricsImporter
          songId={songId}
          initial={alternateSource ?? ''}
          onClose={() => setImporterOpen(false)}
          onImported={applyImported}
        />
      ) : null}
    </div>
  );
}

function SlideLyricsImporter({
  songId,
  initial,
  onClose,
  onImported,
}: {
  songId: string;
  initial: string;
  onClose: () => void;
  onImported: (slides: string[], source: string) => void;
}) {
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await importSlideLyrics(songId, draft);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onImported(result.slides ?? [], draft.replace(/\r\n/g, '\n').trim());
  }

  return (
    <div className="dialog-backdrop" onClick={() => (busy ? undefined : onClose())}>
      <div
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <strong id={titleId}>Versão para os slides</strong>
        <p id={descId}>Cole a letra alternativa. A letra original da música não será alterada.</p>
        {error ? <div className="alert alert--error">{error}</div> : null}
        <label className="field">
          <span className="field__label">Letra alternativa</span>
          <textarea
            ref={inputRef}
            className="textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={12}
            placeholder="Cole aqui a letra que deve aparecer só nos slides"
            disabled={busy}
          />
          <span className="field__hint">Separe as estrofes com uma linha em branco para virar slides.</span>
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Gerando…' : 'Usar nos slides'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlideCard({
  index,
  text,
  onChange,
}: {
  index: number;
  text: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLLabelElement>(null);
  const indexRef = useRef<HTMLSpanElement>(null);

  const fitText = useCallback(() => {
    const el = inputRef.current;
    const box = bodyRef.current;
    const num = indexRef.current;
    if (!el || !box) return;

    const maxW = box.clientWidth;
    const maxH = box.clientHeight;
    if (maxW < 8 || maxH < 8) return;

    el.style.width = `${maxW}px`;

    const applySize = (lyricPx: number) => {
      const numberPx = lyricPx * 1.28;
      el.style.fontSize = `${lyricPx}px`;
      if (num) num.style.fontSize = `${numberPx}px`;
      el.style.height = '0px';
      const lyricsH = el.scrollHeight;
      const numberH = num?.offsetHeight ?? 0;
      const gap = num ? 6 : 0;
      return { w: el.scrollWidth, h: numberH + gap + lyricsH, lyricsH };
    };

    const min = 7;
    const max = Math.min(42, Math.max(min, maxH / 4.2));
    let lo = min;
    let hi = max;
    let best = min;

    for (let step = 0; step < 18; step++) {
      const mid = (lo + hi) / 2;
      const { w, h } = applySize(mid);
      if (w <= maxW + 1 && h <= maxH + 1) {
        best = mid;
        lo = mid + 0.12;
      } else {
        hi = mid - 0.12;
      }
    }

    const { lyricsH } = applySize(best);
    el.style.height = `${Math.min(lyricsH, maxH)}px`;
  }, []);

  useLayoutEffect(() => {
    fitText();
    const fonts = document.fonts;
    if (!fonts?.ready) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) fitText();
    });
    return () => {
      cancelled = true;
    };
  }, [text, fitText]);

  useEffect(() => {
    const box = bodyRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => fitText());
    ro.observe(box);
    return () => ro.disconnect();
  }, [fitText]);

  return (
    <article className="slides-card">
      <label ref={bodyRef} className="slides-card__body">
        <span className="visually-hidden">Texto do slide {index + 1}</span>
        <span ref={indexRef} className="slides-card__index" aria-hidden="true">
          {index + 1}
        </span>
        <textarea
          ref={inputRef}
          className="slides-card__input"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          spellCheck
          wrap="off"
          rows={1}
        />
      </label>
    </article>
  );
}
