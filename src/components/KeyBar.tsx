'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { allKeysFor, normalizeKey } from '@/lib/chords';
import type { Instrumento } from '@/lib/types';
import { ChevronDownIcon, UndoIcon } from '@/components/icons';

/** Grafia fixa dos 12 tons maiores (mesmo padrão do motor de cifras). */
const MAJOR_CHROMATIC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
/** Grafia fixa dos 12 tons menores. */
const MINOR_CHROMATIC = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'] as const;

/** Sempre 12 opções; começa no tom original e sobe cromaticamente. */
function chromaticOptions(baseKey: string): string[] {
  const original = normalizeKey(baseKey);
  const table: readonly string[] = original.endsWith('m') ? MINOR_CHROMATIC : MAJOR_CHROMATIC;
  const start = table.indexOf(original);
  if (start < 0) return [...MAJOR_CHROMATIC];
  return [...table.slice(start), ...table.slice(0, start)];
}

function stepKey(current: string, dir: 1 | -1): string {
  const cycle = allKeysFor(current);
  if (dir === 1) return cycle[1] ?? current;
  return cycle[cycle.length - 1] ?? current;
}

/**
 * Seletor de tom ao vivo: sempre os 12 tons cromáticos da modalidade,
 * independente de available_keys / lista publicada. Tom original pré-selecionado.
 */
export default function KeyBar({
  slug,
  activeKey,
  baseKey,
  manualKeys = [],
  instrumento = 'teclado',
  onSelect,
}: {
  slug: string;
  /** @deprecated Ignorado — as opções são sempre os 12 tons cromáticos. */
  keys?: string[];
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
  const ordered = useMemo(() => chromaticOptions(original || activeKey || 'C'), [original, activeKey]);

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
            <button type="button" className="key-picker__step" onClick={() => choose(stepKey(activeKey, -1), true)}>
              −1/2 tom
            </button>
            <button type="button" className="key-picker__step" onClick={() => choose(stepKey(activeKey, 1), true)}>
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
              const active = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  className="key-picker__cell"
                  data-active={active}
                  data-manual={manualKeys.includes(key)}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => choose(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
