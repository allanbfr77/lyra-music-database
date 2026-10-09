import Link from 'next/link';
import Brand from '@/components/Brand';
import BackToTopButton from '@/components/BackToTopButton';
import { siteNav } from '@/lib/nav';

const IGREJA = [
  { href: 'https://invbotafogo.com.br/', label: 'Site da igreja' },
  { href: 'https://louvores.invbotafogo.com.br/', label: 'Tom Louvores' },
];

/**
 * Rodapé no padrão do site da INVB: fundo preto, fio dourado em cima, títulos
 * das colunas em dourado e, embaixo, o copyright com o "Voltar ao topo".
 * Três colunas no computador, duas no tablet e uma, centralizada, no celular.
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer no-print">
      <div className="site-footer__wrap">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Brand className="brand brand--footer" />
            <p className="site-footer__lema">Letras e cifras em todos os tons, com link direto para cada tom.</p>
          </div>

          <nav className="site-footer__col" aria-labelledby="rodape-banco">
            <h2 id="rodape-banco">Banco de músicas</h2>
            <ul className="site-footer__list">
              {siteNav().map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/admin">Administração</Link>
              </li>
            </ul>
          </nav>

          <nav className="site-footer__col" aria-labelledby="rodape-igreja">
            <h2 id="rodape-igreja">Nova Vida Botafogo</h2>
            <ul className="site-footer__list">
              {IGREJA.map((item) => (
                <li key={item.href}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="site-footer__base">
          <p>© {year} Banco de Músicas do Lyra · lyra.music.db v1</p>
          <BackToTopButton />
        </div>
      </div>
    </footer>
  );
}
