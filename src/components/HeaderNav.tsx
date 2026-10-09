'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteNav } from '@/lib/nav';

/**
 * Links do cabeçalho no computador — o mesmo desenho do menu do site da INVB:
 * caixa alta pequena e espaçada, com o fio dourado embaixo da página atual.
 * No celular quem mostra estes links é a gaveta (MobileNav).
 */
export default function HeaderNav({ homeHref = '/' }: { homeHref?: string }) {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="header-nav no-print" aria-label="Páginas">
      <ul className="header-nav__list">
        {siteNav(homeHref).map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="header-nav__link"
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
