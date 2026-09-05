'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { saveSongSlides } from '@/app/slides/actions';
import { resolveSlideBlocks } from '@/lib/slides';

export default function SlidesEditor({
  songId,
  savedSlides,
  lyricsSeed,
}: {
  songId: string;
  savedSlides: string[] | null;
  lyricsSeed: string;
}) {
  const [slides, setSlides] = useState(() => resolveSlideBlocks(savedSlides, lyricsSeed));
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSlides(resolveSlideBlocks(savedSlides, lyricsSeed));
  }, [songId, savedSlides, lyricsSeed]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  function persist(next: string[]) {
    if (!songId) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
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

  if (slides.length === 0) {
    return (
      <div className="slides-workspace">
        <div className="empty slides-empty">
          <strong>Nenhum slide para exibir</strong>
          <span className="small">Cadastre a letra desta música. Cada estrofe separada por uma linha em branco vira um slide.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="slides-workspace">
      <div className="slides-board">
        {slides.map((text, index) => (
          <SlideCard key={index} index={index} text={text} onChange={(value) => updateSlide(index, value)} />
        ))}
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
