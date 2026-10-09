/**
 * Páginas do menu — uma lista só para o cabeçalho (computador), a gaveta
 * (celular) e o rodapé, como no site da INVB. Mudou aqui, muda nos três.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Linha de apoio, usada só na gaveta do celular. */
  sub?: string;
  /** A página atual pertence a este item? */
  match: (pathname: string) => boolean;
};

export function siteNav(homeHref = '/'): NavItem[] {
  const inAdmin = homeHref.startsWith('/admin');

  return [
    {
      href: homeHref,
      label: 'Músicas',
      // A letra e as cifras de uma música (ou o editor, no admin) contam como "Músicas".
      match: (pathname) =>
        pathname === homeHref ||
        (inAdmin ? pathname.startsWith(`${homeHref}/`) : pathname.startsWith('/musica/')),
    },
    {
      href: '/integracao',
      label: 'Sobre o Lyra',
      sub: 'Versão e informações',
      match: (pathname) => pathname === '/integracao',
    },
  ];
}
