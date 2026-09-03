import Link from 'next/link';
import { MusicNoteIcon } from '@/components/icons';
import ThemeToggle from '@/components/ThemeToggle';

export default function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__mark">
            <MusicNoteIcon size={15} />
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
