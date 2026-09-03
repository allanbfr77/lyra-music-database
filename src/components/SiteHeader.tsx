import Link from 'next/link';

export default function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            ♪
          </span>
          <span>
            Lyra <span className="brand__sub">banco de músicas</span>
          </span>
        </Link>
        <span className="header-spacer" />
        {right}
      </div>
    </header>
  );
}
