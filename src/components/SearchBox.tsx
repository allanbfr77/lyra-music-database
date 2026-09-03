'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { DEFAULT_FIELD_IDS, SEARCH_FIELDS, parseFieldIds } from '@/lib/search-fields';

export default function SearchBox({
  initialQuery = '',
  initialFields = DEFAULT_FIELD_IDS,
}: {
  initialQuery?: string;
  initialFields?: string;
}) {
  const [value, setValue] = useState(initialQuery);
  const [fields, setFields] = useState(() => parseFieldIds(initialFields));
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const first = useRef(true);

  const push = useCallback(
    (q: string, ids: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (ids !== DEFAULT_FIELD_IDS) params.set('c', ids);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router]
  );

  // Digitação: espera o usuário parar antes de consultar.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => push(value.trim(), fields), 250);
    return () => clearTimeout(id);
  }, [value, fields, push]);

  function toggleField(id: string) {
    const set = new Set(fields.split(''));
    if (set.has(id)) {
      // Precisa sobrar pelo menos um campo, senão a busca não teria onde procurar.
      if (set.size === 1) return;
      set.delete(id);
    } else {
      set.add(id);
    }
    setFields(SEARCH_FIELDS.filter((f) => set.has(f.id)).map((f) => f.id).join(''));
  }

  return (
    <div>
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <span className="search__icon">
          <SearchIcon size={17} />
        </span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Buscar no banco de músicas"
          aria-label="Buscar músicas"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <button type="button" className="search__clear" aria-label="Limpar busca" onClick={() => setValue('')}>
            <CloseIcon size={16} />
          </button>
        )}
      </form>

      <fieldset className="filters">
        <legend className="filters__legend">Buscar em</legend>
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
    </div>
  );
}
