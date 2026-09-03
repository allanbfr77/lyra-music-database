'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@/components/icons';
import { DEFAULT_THEME, THEME_COLOR, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * Botão sol/lua do cabeçalho.
 * O tema vive no atributo data-theme do <html> (definido antes da pintura pelo
 * script em layout.tsx), então os dois ícones são renderizados e o CSS mostra
 * apenas o correspondente — sem divergência de hidratação nem piscada.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* sem persistência: o tema vale só para esta sessão */
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle no-print"
      onClick={toggle}
      title="Alternar tema claro/escuro"
      aria-label="Alternar tema claro/escuro"
      aria-pressed={theme === 'light'}
    >
      <SunIcon size={17} className="tt-sun" />
      <MoonIcon size={17} className="tt-moon" />
    </button>
  );
}
