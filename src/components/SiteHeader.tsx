import Link from 'next/link';
import HeaderTools from '@/components/HeaderTools';
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
                src="/icons/icon-64.png"
                alt=""
                width={26}
                height={26}
              />
              <img
                className="brand__logo brand__logo--light"
                src="/icons/icon-192-light.png"
                alt=""
                width={26}
                height={26}
              />
            </span>
            <span className="brand__name">Lyra</span>
          </Link>
        </div>
        <HeaderTools signedIn={signedIn} accountLabel={accountLabelFromEmail(user?.email)} />
      </div>
    </header>
  );
}
