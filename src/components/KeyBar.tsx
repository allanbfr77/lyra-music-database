'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { allKeysFor, cifraPath, normalizeKey } from '@/lib/chords';
import type { Instrumento } from '@/lib/types';
import { ChevronDownIcon, UndoIcon } from '@/components/icons';

function stepPublished(current: string, dir: 1 | -1, published: string[]): string {
  const cycle = allKeysFor(current);
  if (dir === 1) {
    for (let i = 1; i < cycle.length; i++) {
      if (published.includes(cycle[i])) return cycle[i];
    }
  } else {
    for (let i = cycle.length - 1; i >= 1; i--) {
      if (published.includes(cycle[i])) return cycle[i];
    }
  }
  return current;
}

/**
 * Mostra o tom atual. O clique abre o painel em grade com os tons cadastrados,
 * meio-tom acima/abaixo e retorno ao tom original.
 */
export default function KeyBar({
  slug,
  keys,
  activeKey,
  baseKey,
  manualKeys = [],
  instrumento = 'teclado',
  onSelect,
}: {
  slug: string;
  keys: string[];
  activeKey: string;
  baseKey: string;
  manualKeys?: string[];
  instrumento?: Instrumento;
  onSelect?: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pickerId = useId();

  const original = normalizeKey(baseKey);
  const published = useMemo(() => keys.map((k) => normalizeKey(k)).filter(Boolean), [keys]);
  const ordered = useMemo(() => {
    const start = published.some((k) => k.endsWith('m')) ? 'Am' : 'A';
    const allowed = new Set(published);
    return allKeysFor(start).filter((k) => allowed.has(k));
  }, [published]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (published.length < 2) return null;

  function choose(next: string, keepOpen = false) {
    onSelect?.(next);
    if (!keepOpen) setOpen(false);
  }

  return (
    <div className="keybar no-print" ref={root}>
      <span className="control-label">TOM</span>
      <button
        type="button"
        className="key-chip key-chip--trigger key-chip--field"
        data-active="true"
        aria-expanded={open}
        aria-controls={pickerId}
        aria-label={`Tom ${activeKey}. Abrir escolha de tom`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="key-chip__label">{activeKey}</span>
        <ChevronDownIcon size={12} />
      </button>

      {open && (
        <div className="key-picker" id={pickerId} role="dialog" aria-label="Escolher tom">
          <div className="key-picker__bar">
            <button
              type="button"
              className="icon-btn"
              aria-label="Voltar ao tom original"
              title="Tom original"
              disabled={activeKey === original}
              onClick={() => choose(original)}
            >
              <UndoIcon size={16} />
            </button>
            <button type="button" className="key-picker__step" onClick={() => choose(stepPublished(activeKey, -1, published), true)}>
              −1/2 tom
            </button>
            <button type="button" className="key-picker__step" onClick={() => choose(stepPublished(activeKey, 1, published), true)}>
              +1/2 tom
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            >
              <ChevronDownIcon size={16} />
            </button>
          </div>

          <div className="key-picker__grid">
            {ordered.map((key) => {
              const href = cifraPath(slug, key, instrumento);
              const active = key === activeKey;
              return (
                <a
                  key={key}
                  href={href}
                  className="key-picker__cell"
                  data-active={active}
                  data-manual={manualKeys.includes(key)}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    choose(key);
                  }}
                >
                  {key}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
