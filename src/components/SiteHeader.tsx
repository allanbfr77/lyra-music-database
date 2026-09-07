import Link from 'next/link';
import HeaderTools from '@/components/HeaderTools';
import MobileNav from '@/components/MobileNav';
import { ChevronLeftIcon } from '@/components/icons';
import { accountLabelFromEmail, getAuthSession } from '@/lib/auth';

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
  const { user } = await getAuthSession();
  const signedIn = Boolean(user);
  const isAdmin = homeHref.startsWith('/admin');
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
          <Link href={homeHref} className="brand">
            <span className="brand__mark">
              <img
                className="brand__logo brand__logo--dark"
                src="/icons/lyra-db-favicon-dark.svg"
                alt=""
                width={26}
                height={26}
              />
              <img
                className="brand__logo brand__logo--light"
                src="/icons/lyra-db-favicon-light.svg"
                alt=""
                width={26}
                height={26}
              />
            </span>
            <span className="brand__name">Lyra</span>
            <span className="brand__sub">music.db</span>
          </Link>
        </div>
        <HeaderTools
          signedIn={signedIn}
          accountLabel={accountLabel}
          showOfflineDownload={!isAdmin}
        />
        <MobileNav
          signedIn={signedIn}
          accountLabel={accountLabel}
          showOfflineDownload={!isAdmin}
        />
      </div>
    </header>
  );
}
