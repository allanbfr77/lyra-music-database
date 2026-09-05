import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import SignOutButton from '@/components/SignOutButton';
import { LockIcon } from '@/components/icons';

export default function HeaderTools({
  accountLabel,
  signedIn,
}: {
  accountLabel: string;
  signedIn: boolean;
}) {
  return (
    <div
      className="header-tools"
      data-signed={signedIn ? 'true' : 'false'}
      role="group"
      aria-label="Controles do site"
    >
      <div className="header-slot header-slot--status">
        <span
          className="header-status"
          data-on={signedIn ? 'true' : 'false'}
          title={signedIn ? 'Online' : 'Visitante'}
          aria-label={signedIn ? 'Online' : 'Visitante'}
        >
          <span className="header-status__dot" aria-hidden="true" />
          <span className="header-status__text">{signedIn ? 'Online' : 'Visitante'}</span>
        </span>
      </div>

      <div className="header-slot header-slot--account">
        {signedIn ? (
          <span className="header-ctrl header-ctrl--static" title={accountLabel}>
            <span className="header-ctrl__text">{accountLabel || 'Conta'}</span>
          </span>
        ) : (
          <Link href="/login" className="header-ctrl" title="Entrar">
            <LockIcon size={14} />
            <span className="header-ctrl__text">Login</span>
          </Link>
        )}
      </div>

      <div className="header-slot header-slot--leave">
        {signedIn ? (
          <SignOutButton className="header-ctrl" />
        ) : (
          <span className="header-ctrl header-ctrl--ghost" aria-hidden="true">
            Sair
          </span>
        )}
      </div>

      <div className="header-slot header-slot--theme">
        <ThemeToggle />
      </div>
    </div>
  );
}
