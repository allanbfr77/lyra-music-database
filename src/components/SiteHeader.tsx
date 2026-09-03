import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
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
        <span className="header-spacer" />
        <ThemeToggle />
        {right}
      </div>
    </header>
  );
}
