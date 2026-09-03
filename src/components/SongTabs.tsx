import Link from 'next/link';
import { cifraPath, slugToKey } from '@/lib/chords';
import type { Instrumento } from '@/lib/types';

export default function SongTabs({
  slug,
  active,
  chordKeySlug,
  hasChords,
  instrumento = 'teclado',
}: {
  slug: string;
  active: 'letra' | 'cifra';
  chordKeySlug: string;
  hasChords: boolean;
  instrumento?: Instrumento;
  hasGuitar?: boolean;
}) {
  const key = slugToKey(chordKeySlug) ?? chordKeySlug;
  const cifraHref = hasChords ? cifraPath(slug, key, instrumento) : null;

  return (
    <nav className="seg no-print" aria-label="Letra ou cifra">
      <Link href={`/musica/${slug}`} className="seg__item" data-active={active === 'letra'}>
        Letra
      </Link>
      {cifraHref ? (
        <Link href={cifraHref} className="seg__item" data-active={active === 'cifra'}>
          Cifra
        </Link>
      ) : (
        <span className="seg__item" style={{ opacity: 0.45 }}>
          Cifra
        </span>
      )}
    </nav>
  );
}

export function InstrumentTabs({
  slug,
  chordKeySlug,
  instrumento = 'teclado',
  hasGuitar = false,
}: {
  slug: string;
  chordKeySlug: string;
  instrumento?: Instrumento;
  hasGuitar?: boolean;
}) {
  if (!hasGuitar) return null;
  const key = slugToKey(chordKeySlug) ?? chordKeySlug;

  return (
    <nav className="instrument-tabs no-print" aria-label="Instrumento">
      <Link href={cifraPath(slug, key, 'teclado')} className="tab" data-active={instrumento === 'teclado'}>
        Teclado
      </Link>
      <Link href={cifraPath(slug, key, 'violao')} className="tab" data-active={instrumento === 'violao'}>
        Violão
      </Link>
    </nav>
  );
}
