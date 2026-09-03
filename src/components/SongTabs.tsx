import Link from 'next/link';

export default function SongTabs({
  slug,
  active,
  chordKeySlug,
  hasChords,
}: {
  slug: string;
  active: 'letra' | 'cifra';
  chordKeySlug: string;
  hasChords: boolean;
}) {
  return (
    <nav className="tabs no-print" aria-label="Letra ou cifra">
      <Link href={`/musica/${slug}`} className="tab" data-active={active === 'letra'}>
        Letra
      </Link>
      {hasChords ? (
        <Link href={`/musica/${slug}/cifra/${chordKeySlug}`} className="tab" data-active={active === 'cifra'}>
          Cifra
        </Link>
      ) : (
        <span className="tab" style={{ opacity: 0.45 }}>
          Cifra
        </span>
      )}
    </nav>
  );
}
