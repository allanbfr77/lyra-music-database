'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { caretInLyricSpans, lyricsAsCopyText, splitLyricSpans } from '@/lib/lyric-sections';

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
  const [allSelected, setAllSelected] = useState(false);
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

  useLayoutEffect(() => {
    if (!allSelected) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLTextAreaElement) || !refs.current.includes(active)) return;
    active.setSelectionRange(0, active.value.length);
  }, [allSelected]);

  function commit(nextSections: string[], caret?: { index: number; pos: number }) {
    pendingCaret.current = caret ?? null;
    onChange(nextSections.join('\n\n'));
  }

  function replaceAll(next: string, caret: { index: number; pos: number }) {
    setAllSelected(false);
    const pieces = splitLyricSpans(next).map((part) => part.text);
    commit(pieces.length ? pieces : [''], caret);
  }

  return (
    <div
      className={`lyrics-field${allSelected ? ' lyrics-field--all' : ''}`}
      onMouseDown={() => {
        if (allSelected) setAllSelected(false);
      }}
      onCopy={(event) => {
        if (!allSelected) return;
        event.preventDefault();
        event.clipboardData.setData('text/plain', lyricsAsCopyText(value));
      }}
      onCut={(event) => {
        if (!allSelected) return;
        event.preventDefault();
        event.clipboardData.setData('text/plain', lyricsAsCopyText(value));
        setAllSelected(false);
        commit([''], { index: 0, pos: 0 });
      }}
      onPaste={(event) => {
        if (!allSelected) return;
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
        if (!text) {
          setAllSelected(false);
          commit([''], { index: 0, pos: 0 });
          return;
        }
        const pieces = splitLyricSpans(text).map((part) => part.text);
        replaceAll(text, { index: pieces.length - 1, pos: pieces[pieces.length - 1].length });
      }}
    >
      {sections.map((section, index) => (
        <div key={index} className="lyrics-field__block">
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
              if (allSelected) {
                const pieces = splitLyricSpans(next);
                const local = caretInLyricSpans(next, cursor);
                setAllSelected(false);
                commit(
                  pieces.map((part) => part.text),
                  { index: local.index, pos: local.pos }
                );
                return;
              }
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
              const shortcut = event.ctrlKey || event.metaKey;
              if (shortcut && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                setAllSelected(true);
                event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
                return;
              }
              if (allSelected && (event.key === 'Backspace' || event.key === 'Delete') && !shortcut && !event.altKey) {
                event.preventDefault();
                setAllSelected(false);
                commit([''], { index: 0, pos: 0 });
                return;
              }
              if (
                allSelected &&
                (event.key === 'ArrowLeft' ||
                  event.key === 'ArrowRight' ||
                  event.key === 'ArrowUp' ||
                  event.key === 'ArrowDown' ||
                  event.key === 'Home' ||
                  event.key === 'End' ||
                  event.key === 'Escape')
              ) {
                setAllSelected(false);
              }
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
