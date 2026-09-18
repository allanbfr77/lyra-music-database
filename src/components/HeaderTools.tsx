import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import SignOutButton from '@/components/SignOutButton';
import OfflineSongsDownload from '@/components/OfflineSongsDownload';
import TomLouvoresLink from '@/components/TomLouvoresLink';
import { LockIcon } from '@/components/icons';

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
      {isAdmin ? (
        <div className="header-slot header-slot--status">
          <span className="header-status" data-on="true" title="Modo admin" aria-label="Modo admin">
            <span className="header-status__dot" aria-hidden="true" />
            <span className="header-status__text">Modo admin</span>
          </span>
        </div>
      ) : null}

      <div className="header-slot header-slot--tom-louvores">
        <TomLouvoresLink />
      </div>

      {!signedIn ? (
        <div className="header-slot header-slot--account">
          <Link href="/login" className="header-ctrl" title="Entrar">
            <LockIcon size={14} />
            <span className="header-ctrl__text">Login</span>
          </Link>
        </div>
      ) : null}

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

      <div className="header-slot header-slot--theme">
        <ThemeToggle />
      </div>
    </div>
  );
}
