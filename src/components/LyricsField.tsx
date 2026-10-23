'use client';

import { useLayoutEffect, useRef } from 'react';
import { caretInLyricSpans, splitLyricSpans } from '@/lib/lyric-sections';

/**
 * Campo da letra. Cada intervalo em branco entre trechos vira uma linha fina,
 * sem deixar de ser um único texto editável.
 */
export default function LyricsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const pendingCaret = useRef<{ index: number; pos: number } | null>(null);
  const sections = splitLyricSpans(value).map((part) => part.text);

  useLayoutEffect(() => {
    refs.current.forEach((el) => {
      if (!el) return;
      const active = document.activeElement === el;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
      if (active && start != null && end != null) el.setSelectionRange(start, end);
    });

    const pending = pendingCaret.current;
    if (!pending) return;
    pendingCaret.current = null;
    const el = refs.current[pending.index];
    if (!el) return;
    el.focus();
    const pos = Math.min(pending.pos, el.value.length);
    el.setSelectionRange(pos, pos);
  }, [value]);

  function commit(nextSections: string[], caret?: { index: number; pos: number }) {
    pendingCaret.current = caret ?? null;
    onChange(nextSections.join('\n\n'));
  }

  return (
    <div className="lyrics-field">
      {sections.map((section, index) => (
        <div key={index}>
          {index > 0 ? <hr className="lyrics-field__rule" /> : null}
          <textarea
            ref={(el) => {
              refs.current[index] = el;
            }}
            className="lyrics-field__part"
            value={section}
            rows={1}
            aria-label={index === 0 ? 'Letra' : `Trecho ${index + 1} da letra`}
            onChange={(event) => {
              const next = event.target.value.replace(/\r\n/g, '\n');
              const cursor = event.target.selectionStart ?? next.length;
              if (/\n(?:[ \t]*\n)+/.test(next)) {
                const pieces = splitLyricSpans(next);
                const local = caretInLyricSpans(next, cursor);
                const before = sections.slice(0, index);
                const after = sections.slice(index + 1);
                commit([...before, ...pieces.map((part) => part.text), ...after], {
                  index: before.length + local.index,
                  pos: local.pos,
                });
                return;
              }
              const copy = sections.slice();
              copy[index] = next;
              commit(copy);
            }}
            onKeyDown={(event) => {
              if (
                event.key !== 'Backspace' ||
                index === 0 ||
                event.currentTarget.selectionStart !== 0 ||
                event.currentTarget.selectionEnd !== 0
              ) {
                return;
              }
              event.preventDefault();
              const prev = sections[index - 1];
              const merged = `${prev}\n${sections[index]}`;
              commit([...sections.slice(0, index - 1), merged, ...sections.slice(index + 1)], {
                index: index - 1,
                pos: prev.length + 1,
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}
