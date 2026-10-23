'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { DEFAULT_FIELD_IDS, SEARCH_FIELDS, parseFieldIds } from '@/lib/search-fields';

const PLACEHOLDER_DESKTOP = 'Buscar por título, artista ou trecho…';
const PLACEHOLDER_MOBILE = 'Buscar título, artista ou trecho…';

export default function SearchBox({
  initialQuery = '',
  initialFields = DEFAULT_FIELD_IDS,
  onSearch,
}: {
  initialQuery?: string;
  initialFields?: string;
  /** Runs on every keystroke, before the address bar catches up. */
  onSearch?: (query: string, fields: string) => void;
}) {
  const [value, setValue] = useState(initialQuery);
  const [fields, setFields] = useState(() => parseFieldIds(initialFields));
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_DESKTOP);
  const pathname = usePathname();
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const first = useRef(true);
  // Back/forward is the only URL change that should rewrite the field mid-typing.
  const fromHistory = useRef(false);
  // Last term we sent to the URL — a late response must not rewind the input.
  const lastPushed = useRef(initialQuery);
  const lastFields = useRef(parseFieldIds(initialFields));

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const nextFields = parseFieldIds(initialFields);
    const sameQuery = initialQuery === lastPushed.current;
    const sameFields = nextFields === lastFields.current;
    if (sameQuery && sameFields) {
      fromHistory.current = false;
      return;
    }
    if (!fromHistory.current) return;
    fromHistory.current = false;
    if (!sameQuery) {
      lastPushed.current = initialQuery;
      setValue(initialQuery);
    }
    if (!sameFields) {
      lastFields.current = nextFields;
      setFields(nextFields);
    }
    onSearchRef.current?.(initialQuery, nextFields);
  }, [initialQuery, initialFields]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setPlaceholder(mq.matches ? PLACEHOLDER_MOBILE : PLACEHOLDER_DESKTOP);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const writeUrl = useCallback(
    (q: string, ids: string) => {
      if (q === lastPushed.current && ids === lastFields.current) return;
      lastPushed.current = q;
      lastFields.current = ids;
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (ids !== DEFAULT_FIELD_IDS) params.set('c', ids);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(window.history.state, '', href);
    },
    [pathname]
  );

  // Keep the address bar in sync without asking the server for a new page.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeUrl(value.trim(), fields);
  }, [value, fields, writeUrl]);

  function toggleField(id: string) {
    const set = new Set(fields.split(''));
    if (set.has(id)) {
      // Precisa sobrar pelo menos um campo, senão a busca não teria onde procurar.
      if (set.size === 1) return;
      set.delete(id);
    } else {
      set.add(id);
    }
    const nextFields = SEARCH_FIELDS.filter((f) => set.has(f.id)).map((f) => f.id).join('');
    setFields(nextFields);
    onSearchRef.current?.(value, nextFields);
  }

  return (
    <>
      <form className="query-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <span className="query-search__icon">
          <SearchIcon size={14} />
        </span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-label="Buscar músicas"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            onSearchRef.current?.(next, fields);
          }}
        />
        {value && (
          <button
            type="button"
            className="query-search__clear"
            aria-label="Limpar busca"
            onClick={() => {
              setValue('');
              onSearchRef.current?.('', fields);
            }}
          >
            <CloseIcon size={16} />
          </button>
        )}
      </form>

      <fieldset className="query-fields" aria-label="Campos da busca">
        <span className="query-fields__label">CAMPOS</span>
        {SEARCH_FIELDS.map((field) => {
          const on = fields.includes(field.id);
          return (
            <label key={field.id} className="filter" data-on={on}>
              <input type="checkbox" checked={on} onChange={() => toggleField(field.id)} />
              {field.label}
            </label>
          );
        })}
      </fieldset>
    </>
  );
}
