import Link from 'next/link';
import Brand from '@/components/Brand';
import HeaderNav from '@/components/HeaderNav';
import HeaderTools from '@/components/HeaderTools';
import MobileNav from '@/components/MobileNav';
import ScrollProgress from '@/components/ScrollProgress';
import { ChevronLeftIcon } from '@/components/icons';
import { accountLabelFromEmail, getAuthSession } from '@/lib/auth';

/**
 * Cabeçalho no padrão do site da INVB: barra escura com fio dourado, a marca à
 * esquerda, os links em caixa alta e os controles à direita. Abaixo de 1024px
 * os links e os controles vão para a gaveta (MobileNav).
 */
export default async function SiteHeader({
  left,
  backHref,
  homeHref = '/',
}: {
  left?: React.ReactNode;
  backHref?: string;
  /** Destino da marca. No painel admin aponta para /admin. */
  homeHref?: string;
  /** @deprecated O bloco da direita é fixo (status, conta, sair, tema). */
  right?: React.ReactNode;
}) {
  const { user, isAdmin } = await getAuthSession();
  const signedIn = Boolean(user);
  const onAdminArea = homeHref.startsWith('/admin');
  const accountLabel = accountLabelFromEmail(user?.email);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__lead">
          {backHref ? (
            <Link href={backHref} className="back-btn" aria-label="Voltar">
              <ChevronLeftIcon size={18} />
            </Link>
          ) : (
            left ?? null
          )}
          <Brand href={homeHref} />
        </div>
        <div className="site-header__progress" id="lyra-header-progress" />
        <HeaderNav homeHref={homeHref} />
        <HeaderTools
          signedIn={signedIn}
          isAdmin={isAdmin}
          showOfflineDownload={!onAdminArea}
        />
        <MobileNav
          signedIn={signedIn}
          isAdmin={isAdmin}
          accountLabel={accountLabel}
          showOfflineDownload={!onAdminArea}
          homeHref={homeHref}
        />
      </div>
      <ScrollProgress />
    </header>
  );
}
