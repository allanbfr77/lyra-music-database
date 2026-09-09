'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { DEFAULT_FIELD_IDS, SEARCH_FIELDS, parseFieldIds } from '@/lib/search-fields';

const PLACEHOLDER_DESKTOP = 'Buscar por título, artista ou trecho…';
const PLACEHOLDER_MOBILE = 'Buscar título, artista ou trecho…';

export default function SearchBox({
  initialQuery = '',
  initialFields = DEFAULT_FIELD_IDS,
}: {
  initialQuery?: string;
  initialFields?: string;
}) {
  const [value, setValue] = useState(initialQuery);
  const [fields, setFields] = useState(() => parseFieldIds(initialFields));
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_DESKTOP);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const first = useRef(true);
  // Último termo que nós mesmos mandamos para a URL — evita eco atrasado apagar a digitação.
  const lastPushed = useRef(initialQuery);

  useEffect(() => {
    // Navegação externa (voltar/avançar): alinha o campo.
    // Eco da nossa própria busca: ignora — o input já está no texto atual (ou à frente).
    if (initialQuery === lastPushed.current) return;
    lastPushed.current = initialQuery;
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setFields(parseFieldIds(initialFields));
  }, [initialFields]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setPlaceholder(mq.matches ? PLACEHOLDER_MOBILE : PLACEHOLDER_DESKTOP);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const push = useCallback(
    (q: string, ids: string) => {
      lastPushed.current = q;
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
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <button type="button" className="query-search__clear" aria-label="Limpar busca" onClick={() => setValue('')}>
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
