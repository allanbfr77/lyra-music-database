import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import SignOutButton from '@/components/SignOutButton';
import OfflineSongsDownload from '@/components/OfflineSongsDownload';
import TomLouvoresLink from '@/components/TomLouvoresLink';

/**
 * Controles do cabeçalho no computador. A ordem segue o site da INVB: o botão
 * de destaque dourado fica por último, na ponta direita — aqui, "Baixar
 * letras", o que mais serve a quem usa o banco no culto.
 * Texto anterior do botão: "Baixar cifras".
 */
export default function HeaderTools({
  isAdmin = false,
  signedIn,
  showOfflineDownload = true,
}: {
  isAdmin?: boolean;
  signedIn: boolean;
  showOfflineDownload?: boolean;
}) {
  return (
    <div
      className="header-tools"
      data-signed={signedIn ? 'true' : 'false'}
      data-admin={isAdmin ? 'true' : 'false'}
      role="group"
      aria-label="Controles do site"
    >
      <div className="header-slot header-slot--tom-louvores">
        <TomLouvoresLink />
      </div>

      {isAdmin ? (
        <div className="header-slot header-slot--status">
          <Link href="/admin" className="header-status" data-on="true" title="Abrir o painel admin">
            <span className="header-status__dot" aria-hidden="true" />
            <span className="header-status__text">Modo admin</span>
          </Link>
        </div>
      ) : null}

      <div className="header-slot header-slot--theme">
        <ThemeToggle />
      </div>

      {signedIn ? (
        <div className="header-slot header-slot--leave">
          <SignOutButton className="header-ctrl header-ctrl--leave" />
        </div>
      ) : null}

      {showOfflineDownload ? (
        <div className="header-slot header-slot--download">
          <OfflineSongsDownload />
        </div>
      ) : null}
    </div>
  );
}
