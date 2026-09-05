import Link from 'next/link';
import HeaderTools from '@/components/HeaderTools';
import { ChevronLeftIcon } from '@/components/icons';
import { getAuthUser } from '@/lib/auth';

export default async function SiteHeader({
  left,
  backHref,
}: {
  left?: React.ReactNode;
  backHref?: string;
  /** @deprecated O bloco da direita é fixo (status, conta, sair, tema). */
  right?: React.ReactNode;
}) {
  const user = await getAuthUser();
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
          <Link href="/" className="brand">
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
            <span>
              Lyra <span className="brand__sub">banco de músicas</span>
            </span>
          </Link>
        </div>
        <HeaderTools signedIn={signedIn} email={user?.email ?? ''} />
      </div>
    </header>
  );
}
