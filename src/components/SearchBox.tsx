'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const q = value.trim();
      startTransition(() => {
        router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(id);
  }, [value, pathname, router]);

  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <span className="search__icon" aria-hidden="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      </span>
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Música, artista ou trecho da letra"
        aria-label="Buscar músicas"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button type="button" className="search__clear" aria-label="Limpar busca" onClick={() => setValue('')}>
          ×
        </button>
      )}
    </form>
  );
}
